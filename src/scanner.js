import { handleTrending, hideNonVideoElements } from "./ads.js";
import { getVideoCards, readCardInfo, shouldSkipVideoBlocking } from "./dom.js";
import { applyBlockedState, removeBlockedState, syncAllOverlays } from "./overlay.js";
import { evaluateVideo, requiredDataGroups } from "./rules.js";

export class Scanner {
  constructor({ api, getSettings, logger = console }) {
    this.api = api;
    this.getSettings = getSettings;
    this.logger = logger;
    this.videoStore = new Map();
    this.scanTimer = null;
  }

  log(...args) {
    if (this.getSettings().consoleOutputLog_Switch) {
      this.logger.log("[BilibiliBlocker]", ...args);
    }
  }

  schedule(delay = 250) {
    clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(() => {
      this.scan();
    }, delay);
  }

  scan(root = document) {
    const settings = this.getSettings();
    hideNonVideoElements(settings, root);
    handleTrending(settings, root);
    syncAllOverlays(root);

    if (shouldSkipVideoBlocking(location.href)) return;

    for (const card of getVideoCards(root)) {
      this.processCard(card).catch((error) => {
        this.log("process card failed", error);
      });
    }
  }

  getVideo(bv) {
    if (!this.videoStore.has(bv)) this.videoStore.set(bv, { bv });
    return this.videoStore.get(bv);
  }

  mergeVideo(bv, patch) {
    const current = this.getVideo(bv);
    Object.assign(current, Object.fromEntries(Object.entries(patch || {}).filter(([, value]) => value !== "" && value !== undefined && value !== null)));
    return current;
  }

  async ensureDetails(bv, groups = { video: true, tags: true, up: true }) {
    const video = this.getVideo(bv);
    if (groups.video) {
      try {
        const info = await this.api.getVideoInfo(bv);
        if (info) this.mergeVideo(bv, info);
      } catch (error) {
        this.log("video info failed", bv, error);
      }
    }

    if (groups.tags) {
      try {
        const tags = await this.api.getTags(bv);
        if (tags?.length) this.mergeVideo(bv, { tags });
      } catch (error) {
        this.log("tag info failed", bv, error);
      }
    }

    if (groups.up) {
      const upUid = this.getVideo(bv).upUid;
      if (upUid) {
        try {
          const upInfo = await this.api.getUpInfo(upUid);
          if (upInfo) {
            this.mergeVideo(bv, {
              upName: upInfo.name,
              upLevel: upInfo.level,
              upFans: upInfo.fans,
              upAttention: upInfo.attention,
              upSign: upInfo.sign,
            });
          }
        } catch (error) {
          this.log("up info failed", bv, error);
        }
      }
    }

    return this.getVideo(bv);
  }

  async processCard(card) {
    const baseInfo = readCardInfo(card);
    if (!baseInfo) return;

    const settings = this.getSettings();
    const video = this.mergeVideo(baseInfo.bv, baseInfo);

    let result = evaluateVideo(video, settings);
    if (result.whitelisted) {
      removeBlockedState(card);
      return;
    }
    if (result.blocked) {
      applyBlockedState(card, result, settings);
      return;
    }

    const needs = requiredDataGroups(settings);
    await this.ensureDataForRules(baseInfo.bv, needs);

    result = evaluateVideo(this.getVideo(baseInfo.bv), settings);
    if (result.whitelisted) {
      removeBlockedState(card);
    } else if (result.blocked) {
      applyBlockedState(card, result, settings);
    } else if (card.dataset.bbtBlocked === "1") {
      removeBlockedState(card);
    }
  }

  async ensureDataForRules(bv, needs) {
    let video = this.getVideo(bv);
    const needVideo =
      needs.video ||
      (needs.up && !video.upUid) ||
      (needs.comments && !video.aid);

    if (needVideo) {
      await this.ensureDetails(bv, { video: true, tags: false, up: false });
      video = this.getVideo(bv);
    }

    const requests = [];
    if (needs.tags && !video.tags) {
      requests.push(
        this.api
          .getTags(bv)
          .then((tags) => {
            if (tags?.length) this.mergeVideo(bv, { tags });
          })
          .catch((error) => this.log("tags failed", bv, error)),
      );
    }

    if (needs.up && video.upUid && video.upLevel === undefined) {
      requests.push(
        this.api
          .getUpInfo(video.upUid)
          .then((upInfo) => {
            if (!upInfo) return;
            this.mergeVideo(bv, {
              upName: upInfo.name,
              upLevel: upInfo.level,
              upFans: upInfo.fans,
              upAttention: upInfo.attention,
              upSign: upInfo.sign,
            });
          })
          .catch((error) => this.log("up failed", bv, error)),
      );
    }

    if (needs.comments && video.aid && video.filteredComments === undefined) {
      requests.push(
        this.api
          .getComments(video.aid)
          .then((comments) => {
            if (comments) this.mergeVideo(bv, comments);
          })
          .catch((error) => this.log("comments failed", bv, error)),
      );
    }

    await Promise.all(requests);
  }
}
