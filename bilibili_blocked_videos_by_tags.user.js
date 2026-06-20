// ==UserScript==
// @name            Bilibili 屏蔽视频脚本-改
// @version         1.5.0
// @description     对 Bilibili.com 的视频卡片元素，以标题、UP 主、标签、双重标签、充电专属、收藏投币比、竖屏、时长、播放量、点赞率、视频分区、UP 主等级、UP 主粉丝数、UP 主简介、精选评论、置顶评论来判断匹配，添加覆盖叠加层或隐藏视频，隐藏或屏蔽热搜、附带去除广告等非视频元素的功能。
// @author          tjxwork
// @license        MIT
// @icon            https://www.bilibili.com/favicon.ico
// @match           https://www.bilibili.com/
// @match           https://live.bilibili.com/*
// @match           https://search.bilibili.com/*
// @match           https://space.bilibili.com/*
// @match           https://account.bilibili.com/*
// @match           https://message.bilibili.com/*
// @match           https://t.bilibili.com/*
// @match           https://link.bilibili.com/*
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/video/*/*
// @match           https://www.bilibili.com/video/BV*
// @grant           GM_registerMenuCommand
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// ==/UserScript==
"use strict";
(() => {
  // src/api.js
  function getCsrfToken(cookieText = globalThis.document?.cookie || "") {
    const match = String(cookieText).match(/(?:^|;\s*)bili_jct=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
  var ApiClient = class {
    constructor({
      fetchImpl = globalThis.fetch?.bind(globalThis),
      csrfProvider = () => getCsrfToken(),
      now = () => Date.now(),
      timeoutMs = 1e4
    } = {}) {
      this.fetchImpl = fetchImpl;
      this.csrfProvider = csrfProvider;
      this.now = now;
      this.timeoutMs = timeoutMs;
      this.inFlight = /* @__PURE__ */ new Map();
      this.lastRequestAt = /* @__PURE__ */ new Map();
      this.cache = /* @__PURE__ */ new Map();
    }
    async fetchJson(key, url, options = {}) {
      if (!this.fetchImpl) throw new Error("fetch is not available");
      if (this.inFlight.has(key)) return this.inFlight.get(key);
      const controller = typeof AbortController !== "undefined" && !options.signal ? new AbortController() : null;
      const requestOptions = controller ? { ...options, signal: controller.signal } : options;
      let timeoutId = 0;
      const request = this.fetchImpl(url, requestOptions).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText || ""}`.trim());
        }
        return response.json();
      });
      request.catch(() => {
      });
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          if (controller) controller.abort();
          reject(new Error("\u8BF7\u6C42\u8D85\u65F6"));
        }, this.timeoutMs);
      });
      const promise = Promise.race([request, timeout]).finally(() => {
        clearTimeout(timeoutId);
        this.inFlight.delete(key);
      });
      this.inFlight.set(key, promise);
      return promise;
    }
    canRequest(key, minIntervalMs = 3e3) {
      const last = this.lastRequestAt.get(key) || 0;
      const current = this.now();
      if (current - last < minIntervalMs) return false;
      this.lastRequestAt.set(key, current);
      return true;
    }
    async getVideoInfo(bv) {
      if (!bv) return null;
      const cacheKey = `video:${bv}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
      if (!this.canRequest(cacheKey)) return null;
      const json = await this.fetchJson(
        cacheKey,
        `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bv)}`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json, text/plain, */*"
          }
        }
      );
      if (json.code !== 0 || !json.data) throw new Error(json.message || "Video API failed");
      const data = json.data;
      const info = {
        bv,
        aid: data.aid,
        title: data.title || "",
        upName: data.owner?.name || "",
        upUid: data.owner?.mid ? String(data.owner.mid) : "",
        favorite: Number(data.stat?.favorite || 0),
        pubdate: Number(data.pubdate || 0),
        duration: Number(data.duration || 0),
        partition: data.tname || "",
        view: Number(data.stat?.view || 0),
        like: Number(data.stat?.like || 0),
        coin: Number(data.stat?.coin || 0),
        chargingExclusive: Boolean(data.is_upower_exclusive),
        width: Number(data.dimension?.width || 0),
        height: Number(data.dimension?.height || 0)
      };
      info.likesRate = info.view ? Number((info.like / info.view * 100).toFixed(2)) : 0;
      info.coinRate = info.view ? Number((info.coin / info.view * 100).toFixed(2)) : 0;
      info.favoriteCoinRatio = info.coin ? Number((info.favorite / info.coin).toFixed(2)) : 0;
      this.cache.set(cacheKey, info);
      return info;
    }
    async getTags(bv) {
      if (!bv) return [];
      const cacheKey = `tags:${bv}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
      if (!this.canRequest(cacheKey)) return [];
      const json = await this.fetchJson(
        cacheKey,
        `https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${encodeURIComponent(bv)}`,
        { credentials: "include" }
      );
      const source = Array.isArray(json.data) ? json.data : Array.isArray(json.data?.tags) ? json.data.tags : [];
      const tags = source.map((tag) => String(tag.tag_name || tag).trim()).filter(Boolean);
      this.cache.set(cacheKey, tags);
      return tags;
    }
    async getUpInfo(uid) {
      if (!uid) return null;
      const cacheKey = `up:${uid}`;
      const cached = this.cache.get(cacheKey);
      if (cached && this.now() - cached.updatedAt < 36e5) return cached;
      if (!this.canRequest(cacheKey)) return null;
      const json = await this.fetchJson(
        cacheKey,
        `https://api.bilibili.com/x/web-interface/card?mid=${encodeURIComponent(uid)}`,
        { credentials: "include" }
      );
      if (json.code !== 0 || !json.data?.card) throw new Error(json.message || "UP API failed");
      const card = json.data.card;
      const upInfo = {
        uid: String(uid),
        name: card.name || "",
        level: Number(card.level_info?.current_level || 0),
        fans: Number(card.fans || 0),
        attention: Number(card.attention || 0),
        sign: card.sign || "",
        updatedAt: this.now()
      };
      this.cache.set(cacheKey, upInfo);
      return upInfo;
    }
    async getComments(aid) {
      if (!aid) return null;
      const cacheKey = `comments:${aid}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
      if (!this.canRequest(cacheKey, 5e3)) return null;
      const params = new URLSearchParams({
        type: "1",
        oid: String(aid),
        sort: "0",
        ps: "1",
        pn: "1",
        nohot: "0"
      });
      const json = await this.fetchJson(
        cacheKey,
        `https://api.bilibili.com/x/v2/reply?${params.toString()}`,
        { credentials: "include" }
      );
      const comments = {
        filteredComments: Boolean(json.data?.control?.web_selection),
        topComment: json.data?.upper?.top?.content?.message || ""
      };
      this.cache.set(cacheKey, comments);
      return comments;
    }
    async dislikeVideo({ aid, bv, reason = 1 }) {
      const csrf = this.csrfProvider();
      if (!csrf) throw new Error("\u7F3A\u5C11 csrf");
      const id = aid || bv;
      if (!id) throw new Error("\u7F3A\u5C11\u89C6\u9891 ID");
      return this.postForm("https://api.bilibili.com/x/feed/dislike", {
        id,
        type: aid ? "av" : "bv",
        reason,
        csrf
      });
    }
    async blockUp(uid) {
      const csrf = this.csrfProvider();
      if (!csrf) throw new Error("\u7F3A\u5C11 csrf");
      if (!uid) throw new Error("\u7F3A\u5C11 UP UID");
      return this.postForm("https://api.bilibili.com/x/relation/modify", {
        fid: uid,
        act: 5,
        re_src: 11,
        csrf
      });
    }
    async postForm(url, payload) {
      const json = await this.fetchJson(`post:${url}:${JSON.stringify(payload)}:${this.now()}`, url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(payload)
      });
      if (json.code !== 0) throw new Error(json.message || "\u63A5\u53E3\u8C03\u7528\u5931\u8D25");
      return json;
    }
  };

  // src/rules.js
  function isNonEmptyList(value) {
    return Array.isArray(value) && value.length > 0;
  }
  function textEquals(a = "", b = "") {
    return String(a).trim() === String(b).trim();
  }
  function matchTextList(text, list, useRegex = false, flags = "") {
    if (!text || !isNonEmptyList(list)) return "";
    const source = String(text);
    for (const item of list) {
      const rule = String(item || "").trim();
      if (!rule) continue;
      if (useRegex) {
        try {
          if (new RegExp(rule, flags).test(source)) return rule;
        } catch {
          continue;
        }
      } else if (textEquals(source, rule)) {
        return rule;
      }
    }
    return "";
  }
  function matchAnyTextList(values, list, useRegex = false, flags = "") {
    if (!isNonEmptyList(values) || !isNonEmptyList(list)) return { rule: "", value: "" };
    for (const item of list) {
      const rule = String(item || "").trim();
      if (!rule) continue;
      for (const value of values) {
        if (useRegex) {
          try {
            if (new RegExp(rule, flags).test(String(value))) return { rule, value };
          } catch {
            continue;
          }
        } else if (textEquals(value, rule)) {
          return { rule, value };
        }
      }
    }
    return { rule: "", value: "" };
  }
  function matchTagList(tags, list, useRegex) {
    if (!isNonEmptyList(tags) || !isNonEmptyList(list)) return { rule: "", value: "" };
    if (useRegex) return matchAnyTextList(tags, list, true, "i");
    for (const rule of list) {
      const normalizedRule = String(rule || "").trim().toLowerCase();
      if (!normalizedRule) continue;
      const hit = tags.find((tag) => String(tag || "").trim().toLowerCase() === normalizedRule);
      if (hit) return { rule, value: hit };
    }
    return { rule: "", value: "" };
  }
  function matchUpNameOrUid(video, settings) {
    const rules = settings.blockedNameOrUid_Array || [];
    if (!isNonEmptyList(rules)) return { rule: "", value: "" };
    for (const rule of rules) {
      const text = String(rule || "").trim();
      if (!text) continue;
      if (settings.blockedNameOrUid_UseRegular && video.upName) {
        try {
          if (new RegExp(text).test(String(video.upName))) return { rule: text, value: video.upName };
        } catch {
          continue;
        }
      } else if (video.upName == text) {
        return { rule: text, value: video.upName };
      }
      if (video.upUid != null && String(video.upUid) == text) {
        return { rule: text, value: String(video.upUid) };
      }
    }
    return { rule: "", value: "" };
  }
  function block(type, item) {
    return { blocked: true, type, item: String(item ?? "") };
  }
  function pass(extra = {}) {
    return { blocked: false, ...extra };
  }
  function isWhitelisted(video, settings) {
    if (!settings.whitelistNameOrUid_Switch || !isNonEmptyList(settings.whitelistNameOrUid_Array)) return false;
    const values = [video.upName, video.upUid].filter(Boolean);
    return Boolean(matchAnyTextList(values, settings.whitelistNameOrUid_Array, false).rule);
  }
  function evaluateVideo(video, settings, nowSeconds = Math.floor(Date.now() / 1e3)) {
    if (isWhitelisted(video, settings)) return pass({ whitelisted: true });
    const favoriteCoinRatio = Number(video.favoriteCoinRatio || 0) || (Number(video.coin || 0) > 0 ? Number((Number(video.favorite || 0) / Number(video.coin)).toFixed(2)) : 0);
    if (settings.blockedTitle_Switch && isNonEmptyList(settings.blockedTitle_Array)) {
      const match = matchTextList(video.title, settings.blockedTitle_Array, settings.blockedTitle_UseRegular);
      if (match) return block("\u6309\u6807\u9898\u5C4F\u853D", match);
    }
    if (settings.blockedNameOrUid_Switch && isNonEmptyList(settings.blockedNameOrUid_Array)) {
      const match = matchUpNameOrUid(video, settings);
      if (match.rule) return block("\u6309UP\u4E3B\u5C4F\u853D", match.value || match.rule);
    }
    if (settings.blockedChargingExclusive_Switch && video.chargingExclusive) {
      return block("\u5C4F\u853D\u5145\u7535\u4E13\u5C5E\u89C6\u9891", video.upName || video.upUid || "");
    }
    if (settings.blockedAboveFavoriteCoinRatio_Switch && Number(settings.blockedAboveFavoriteCoinRatio) > 0 && Number(video.view || 0) >= 5e3 && Number(video.favorite || 0) >= 50 && Number(video.pubdate || 0) > 0 && nowSeconds - Number(video.pubdate) > 7200 && favoriteCoinRatio > Number(settings.blockedAboveFavoriteCoinRatio)) {
      return block("\u5C4F\u853D\u9AD8\u6536\u85CF\u6295\u5E01\u6BD4", `${favoriteCoinRatio}`);
    }
    if (settings.blockedPortraitVideo_Switch && Number(video.width || 0) > 0 && Number(video.width) < Number(video.height || 0)) {
      return block("\u5C4F\u853D\u7AD6\u5C4F\u89C6\u9891", `${video.width} x ${video.height}`);
    }
    if (settings.blockedShortDuration_Switch && Number(settings.blockedShortDuration) > Number(video.duration || Infinity)) {
      return block("\u5C4F\u853D\u4F4E\u65F6\u957F", `${video.duration || 0}\u79D2`);
    }
    if (settings.blockedBelowVideoViews_Switch && Number(settings.blockedBelowVideoViews) > Number(video.view || Infinity)) {
      return block("\u5C4F\u853D\u4F4E\u64AD\u653E\u91CF", `${video.view || 0}\u6B21`);
    }
    if (settings.blockedBelowLikesRate_Switch && Number(settings.blockedBelowLikesRate) > Number(video.likesRate || Infinity)) {
      return block("\u5C4F\u853D\u4F4E\u70B9\u8D5E\u7387", `${video.likesRate || 0}%`);
    }
    if (settings.blockedBelowCoinRate_Switch && Number(settings.blockedBelowCoinRate) > Number(video.coinRate || Infinity)) {
      return block("\u5C4F\u853D\u4F4E\u6295\u5E01\u7387", `${video.coinRate || 0}%`);
    }
    if (settings.blockedBelowVideoFavorite_Switch && Number(settings.blockedBelowVideoFavorite) > Number(video.favorite || Infinity)) {
      return block("\u5C4F\u853D\u4F4E\u6536\u85CF\u6570", `${video.favorite || 0}\u6B21\u6536\u85CF`);
    }
    if (settings.blockedVideoPartitions_Switch && isNonEmptyList(settings.blockedVideoPartitions_Array)) {
      const match = matchTextList(video.partition, settings.blockedVideoPartitions_Array, settings.blockedVideoPartitions_UseRegular);
      if (match) return block("\u6309\u89C6\u9891\u5206\u533A\u5C4F\u853D", video.partition || match);
    }
    if (settings.blockedBelowUpLevel_Switch && Number(settings.blockedBelowUpLevel) > Number(video.upLevel || Infinity)) {
      return block("\u5C4F\u853D\u4F4EUP\u4E3B\u7B49\u7EA7", `${video.upLevel || 0}\u7EA7`);
    }
    if (settings.blockedBelowUpFans_Switch && Number(settings.blockedBelowUpFans) > Number(video.upFans || Infinity)) {
      return block("\u5C4F\u853D\u4F4EUP\u4E3B\u7C89\u4E1D\u6570", `${video.upFans || 0}\u4EBA`);
    }
    if (settings.blockedAboveUpAttention_Switch && Number(settings.blockedAboveUpAttention) < Number(video.upAttention || 0)) {
      return block("\u5C4F\u853D\u9AD8UP\u4E3B\u5173\u6CE8\u6570", `${video.upAttention || 0}\u4EBA`);
    }
    if (settings.blockedUpSigns_Switch && isNonEmptyList(settings.blockedUpSigns_Array)) {
      const match = matchTextList(video.upSign, settings.blockedUpSigns_Array, settings.blockedUpSigns_UseRegular);
      if (match) return block("\u6309UP\u4E3B\u7B80\u4ECB\u5C4F\u853D", match);
    }
    if (settings.blockedTag_Switch && isNonEmptyList(settings.blockedTag_Array)) {
      const match = matchTagList(video.tags || [], settings.blockedTag_Array, settings.blockedTag_UseRegular);
      if (match.rule) return block("\u6309\u6807\u7B7E\u5C4F\u853D", match.value || match.rule);
    }
    if (settings.doubleBlockedTag_Switch && isNonEmptyList(settings.doubleBlockedTag_Array) && isNonEmptyList(video.tags)) {
      for (const pair of settings.doubleBlockedTag_Array) {
        const [left, right] = String(pair).split("|").map((item) => item.trim());
        if (!left || !right) continue;
        const leftMatch = matchTagList(video.tags, [left], settings.doubleBlockedTag_UseRegular);
        const rightMatch = matchTagList(video.tags, [right], settings.doubleBlockedTag_UseRegular);
        if (leftMatch.rule && rightMatch.rule) {
          return block("\u6309\u53CC\u91CD\u6807\u7B7E\u5C4F\u853D", `${leftMatch.value || left},${rightMatch.value || right}`);
        }
      }
    }
    if (settings.blockedFilteredCommentsVideo_Switch && video.filteredComments) {
      return block("\u5C4F\u853D\u7CBE\u9009\u8BC4\u8BBA\u7684\u89C6\u9891", video.upName || "");
    }
    if (settings.blockedTopComment_Switch && isNonEmptyList(settings.blockedTopComment_Array)) {
      const match = matchTextList(video.topComment, settings.blockedTopComment_Array, settings.blockedTopComment_UseRegular);
      if (match) return block("\u6309\u7F6E\u9876\u8BC4\u8BBA\u5C4F\u853D", match);
    }
    return pass();
  }
  function requiredDataGroups(settings) {
    return {
      video: settings.blockedBelowVideoFavorite_Switch || settings.blockedChargingExclusive_Switch || settings.blockedAboveFavoriteCoinRatio_Switch || settings.blockedPortraitVideo_Switch || settings.blockedShortDuration_Switch || settings.blockedBelowVideoViews_Switch || settings.blockedBelowLikesRate_Switch || settings.blockedBelowCoinRate_Switch || settings.blockedVideoPartitions_Switch,
      tags: settings.blockedTag_Switch && isNonEmptyList(settings.blockedTag_Array) || settings.doubleBlockedTag_Switch && isNonEmptyList(settings.doubleBlockedTag_Array),
      up: settings.blockedBelowUpLevel_Switch || settings.blockedBelowUpFans_Switch || settings.blockedAboveUpAttention_Switch || settings.blockedUpSigns_Switch && isNonEmptyList(settings.blockedUpSigns_Array),
      comments: settings.blockedFilteredCommentsVideo_Switch || settings.blockedTopComment_Switch && isNonEmptyList(settings.blockedTopComment_Array)
    };
  }

  // src/ads.js
  function hideNonVideoElements(settings, root = document) {
    if (!settings.hideNonVideoElements_Switch) return;
    if (location.href.startsWith("https://www.bilibili.com/")) {
      root.querySelectorAll(
        `
        div.floor-single-card,
        div.feed-card:has(a[href^="//cm.bilibili.com/"]),
        div.bili-feed-card:has(a[href^="//cm.bilibili.com/"]),
        div.bili-feed-card:has(a[href^="https://live.bilibili.com/"])
      `
      ).forEach((element) => element.classList.add("hideAD"));
    }
    if (location.href.startsWith("https://search.bilibili.com/all")) {
      root.querySelectorAll(
        `
        div.bili-video-card:has(a[href^="https://www.bilibili.com/cheese/"]),
        div.bili-video-card:has(a[href^="//cm.bilibili.com/"]),
        div.bili-video-card:has(a[href^="//live.bilibili.com/"])
      `
      ).forEach((element) => (element.parentElement || element).classList.add("hideAD"));
    }
    if (location.href.startsWith("https://www.bilibili.com/video/")) {
      root.querySelectorAll(
        `
        div#slide_ad,
        .ad-report,
        div.video-page-game-card-small,
        div.video-page-special-card-small,
        div.video-page-operator-card-small,
        div.pop-live-small-mode,
        div.activity-m-v1,
        div.video-card-ad-small,
        .bpx-player-qoeFeedback,
        .slide-ad-exp
      `
      ).forEach((element) => element.classList.add("hideAD"));
    }
    if (location.hostname === "t.bilibili.com") {
      root.querySelectorAll(".bili-dyn-ads").forEach((element) => element.classList.add("hideAD"));
    }
  }
  function handleTrending(settings, root = document) {
    if (settings.hideTrending_Switch) {
      root.querySelectorAll("div.trending").forEach((element) => {
        element.style.display = "none";
      });
    }
    const items = root.querySelectorAll("div.trending-item");
    items.forEach((item) => {
      if (item.style.display === "none" || item.querySelector(".blockedOverlay")) return;
      const text = item.textContent || "";
      let hit = "";
      if (settings.blockedTrendingItem_Switch) {
        hit = matchTextList(text, settings.blockedTrendingItem_Array, settings.blockedTrendingItem_UseRegular);
      }
      if (!hit && settings.blockedTrendingItemByTitleTag_Switch) {
        hit = matchTextList(text, settings.blockedTitle_Array, settings.blockedTitle_UseRegular);
      }
      if (!hit) return;
      if (settings.hideVideoMode_Switch) {
        item.style.display = "none";
        return;
      }
      if (!item.style.position) item.style.position = "relative";
      const overlay = document.createElement("div");
      overlay.className = "blockedOverlay";
      const label = document.createElement("div");
      label.className = "blockedOverlayText";
      label.textContent = hit;
      overlay.appendChild(label);
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "blockedOverlay-undo-btn";
      undo.textContent = "\u64A4\u9500";
      undo.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        overlay.remove();
      });
      overlay.appendChild(undo);
      item.insertAdjacentElement("afterbegin", overlay);
    });
  }
  function installPageSpecificStyles(root = document) {
    if (root.getElementById?.("bbt-page-specific-style")) return;
    const style = document.createElement("style");
    style.id = "bbt-page-specific-style";
    style.textContent = `
    .bili-video-card__skeleton.loading_animation,
    .recommended-swipe,
    .bili-live-card.is-rcmd.enable-no-interest,
    .ad-report.ad-floor-exp.left-banner {
      display: none !important;
    }
  `;
    document.head.appendChild(style);
  }

  // src/config.js
  var STORAGE_KEY = "GM_blockedParameter";
  var DEFAULT_SETTINGS = Object.freeze({
    blockedBelowVideoFavorite_Switch: false,
    blockedBelowVideoFavorite: 0,
    blockedTitle_Switch: false,
    blockedTitle_UseRegular: true,
    blockedTitle_Array: [],
    blockedNameOrUid_Switch: true,
    blockedNameOrUid_UseRegular: false,
    blockedNameOrUid_Array: [],
    blockedVideoPartitions_Switch: true,
    blockedVideoPartitions_UseRegular: false,
    blockedVideoPartitions_Array: [],
    blockedTag_Switch: false,
    blockedTag_UseRegular: true,
    blockedTag_Array: [],
    doubleBlockedTag_Switch: false,
    doubleBlockedTag_UseRegular: true,
    doubleBlockedTag_Array: [],
    blockedShortDuration_Switch: false,
    blockedShortDuration: 0,
    blockedBelowVideoViews_Switch: false,
    blockedBelowVideoViews: 0,
    blockedBelowLikesRate_Switch: false,
    blockedBelowLikesRate: 0,
    blockedBelowCoinRate_Switch: false,
    blockedBelowCoinRate: 0,
    blockedAboveFavoriteCoinRatio_Switch: false,
    blockedAboveFavoriteCoinRatio: 10,
    blockedPortraitVideo_Switch: false,
    blockedChargingExclusive_Switch: false,
    blockedFilteredCommentsVideo_Switch: false,
    blockedTopComment_Switch: false,
    blockedTopComment_UseRegular: true,
    blockedTopComment_Array: [],
    blockedBelowUpLevel_Switch: false,
    blockedBelowUpLevel: 0,
    blockedBelowUpFans_Switch: false,
    blockedBelowUpFans: 0,
    blockedAboveUpAttention_Switch: false,
    blockedAboveUpAttention: 0,
    blockedUpSigns_Switch: false,
    blockedUpSigns_UseRegular: true,
    blockedUpSigns_Array: [],
    whitelistNameOrUid_Switch: false,
    whitelistNameOrUid_Array: [],
    hideTrending_Switch: false,
    blockedTrendingItemByTitleTag_Switch: false,
    blockedTrendingItem_Switch: false,
    blockedTrendingItem_UseRegular: true,
    blockedTrendingItem_Array: [],
    hideNonVideoElements_Switch: true,
    blockedOverlayOnlyDisplaysType_Switch: false,
    hideVideoMode_Switch: false,
    consoleOutputLog_Switch: false
  });
  var ARRAY_KEYS = new Set(
    Object.keys(DEFAULT_SETTINGS).filter((key) => key.endsWith("_Array"))
  );
  var NUMBER_KEYS = /* @__PURE__ */ new Set([
    "blockedBelowVideoFavorite",
    "blockedShortDuration",
    "blockedBelowVideoViews",
    "blockedBelowLikesRate",
    "blockedBelowCoinRate",
    "blockedAboveFavoriteCoinRatio",
    "blockedBelowUpLevel",
    "blockedBelowUpFans",
    "blockedAboveUpAttention"
  ]);
  function clone(value) {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
    }
    return value;
  }
  function normalizeSettings(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    const settings = clone(DEFAULT_SETTINGS);
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      if (ARRAY_KEYS.has(key)) {
        settings[key] = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
        continue;
      }
      if (NUMBER_KEYS.has(key)) {
        const numberValue = Number(value);
        settings[key] = Number.isFinite(numberValue) ? numberValue : DEFAULT_SETTINGS[key];
        continue;
      }
      if (typeof DEFAULT_SETTINGS[key] === "boolean") {
        settings[key] = Boolean(value);
        continue;
      }
      settings[key] = value;
    }
    return settings;
  }
  function loadSettings(getValue = globalThis.GM_getValue) {
    const stored = typeof getValue === "function" ? getValue(STORAGE_KEY, DEFAULT_SETTINGS) : DEFAULT_SETTINGS;
    return normalizeSettings(stored);
  }
  function saveSettings(settings, setValue = globalThis.GM_setValue) {
    const normalized = normalizeSettings(settings);
    if (typeof setValue === "function") {
      setValue(STORAGE_KEY, normalized);
    }
    return normalized;
  }
  function splitInputList(text) {
    return String(text || "").split(",").map((item) => item.trim()).filter(Boolean);
  }
  function addListItems(settings, keyName, rawInput) {
    if (!ARRAY_KEYS.has(keyName)) {
      throw new Error(`Unknown list setting: ${keyName}`);
    }
    const current = Array.isArray(settings[keyName]) ? settings[keyName] : [];
    const items = splitInputList(rawInput);
    const normalizedItems = keyName === "doubleBlockedTag_Array" ? items.map((item) => item.split("|").map((part) => part.trim())).filter((parts) => parts.length === 2 && parts.every(Boolean)).map((parts) => parts.join("|")) : items;
    settings[keyName] = current.concat(normalizedItems);
    return settings[keyName];
  }
  function removeListItem(settings, keyName, index) {
    if (!ARRAY_KEYS.has(keyName)) {
      throw new Error(`Unknown list setting: ${keyName}`);
    }
    const current = Array.isArray(settings[keyName]) ? settings[keyName] : [];
    current.splice(index, 1);
    settings[keyName] = current;
    return current;
  }
  function validateImportedSettings(settings) {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
    return Object.keys(settings).some((key) => Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key));
  }
  function mergeImportedSettings(current, imported) {
    if (!validateImportedSettings(imported)) {
      throw new Error("Invalid settings file");
    }
    return normalizeSettings({ ...current, ...imported });
  }
  function formatTimestamp(date = /* @__PURE__ */ new Date()) {
    const pad = (value, length = 2) => String(value).padStart(length, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join("-");
  }

  // src/quick-action-state.js
  var QUICK_ACTION_STATE_KEY = "GM_quickActionState";
  var EMPTY_STATE = Object.freeze({
    byBv: {},
    byUid: {}
  });
  var ACTION_KEYS = /* @__PURE__ */ new Set(["disliked", "blockedUp", "blacklisted"]);
  function createEmptyQuickActionState() {
    return {
      byBv: {},
      byUid: {}
    };
  }
  function normalizeBucket(bucket = {}) {
    return {
      disliked: Boolean(bucket.disliked),
      blockedUp: Boolean(bucket.blockedUp),
      blacklisted: Boolean(bucket.blacklisted)
    };
  }
  function normalizeQuickActionState(input = EMPTY_STATE) {
    const source = input && typeof input === "object" ? input : EMPTY_STATE;
    const state = createEmptyQuickActionState();
    for (const [bv, bucket] of Object.entries(source.byBv || {})) {
      if (bv) state.byBv[bv] = normalizeBucket(bucket);
    }
    for (const [uid, bucket] of Object.entries(source.byUid || {})) {
      if (uid) state.byUid[String(uid)] = normalizeBucket(bucket);
    }
    return state;
  }
  function loadQuickActionState(getValue = globalThis.GM_getValue) {
    const stored = typeof getValue === "function" ? getValue(QUICK_ACTION_STATE_KEY, createEmptyQuickActionState()) : EMPTY_STATE;
    return normalizeQuickActionState(stored);
  }
  function saveQuickActionState(state, setValue = globalThis.GM_setValue) {
    const normalized = normalizeQuickActionState(state);
    if (typeof setValue === "function") {
      setValue(QUICK_ACTION_STATE_KEY, normalized);
    }
    return normalized;
  }
  function getQuickActionState(state, { bv = "", uid = "" } = {}) {
    const normalized = normalizeQuickActionState(state);
    return {
      ...normalizeBucket(bv ? normalized.byBv[bv] : {}),
      ...normalizeBucket(uid ? normalized.byUid[String(uid)] : {}),
      disliked: Boolean(bv && normalized.byBv[bv]?.disliked),
      blockedUp: Boolean(bv && normalized.byBv[bv]?.blockedUp || uid && normalized.byUid[String(uid)]?.blockedUp),
      blacklisted: Boolean(bv && normalized.byBv[bv]?.blacklisted || uid && normalized.byUid[String(uid)]?.blacklisted)
    };
  }
  function markQuickActionState(state, { bv = "", uid = "" } = {}, action) {
    if (!ACTION_KEYS.has(action)) {
      throw new Error(`Unknown quick action: ${action}`);
    }
    const normalized = state && typeof state === "object" ? state : createEmptyQuickActionState();
    if (!normalized.byBv || typeof normalized.byBv !== "object") normalized.byBv = {};
    if (!normalized.byUid || typeof normalized.byUid !== "object") normalized.byUid = {};
    if (bv) {
      normalized.byBv[bv] = normalizeBucket(normalized.byBv[bv]);
      normalized.byBv[bv][action] = true;
    }
    if (uid) {
      normalized.byUid[String(uid)] = normalizeBucket(normalized.byUid[String(uid)]);
      normalized.byUid[String(uid)][action] = true;
    }
    return normalized;
  }

  // src/background-action.js
  function runInBackground(promise, onError = () => {
  }) {
    Promise.resolve(promise).catch(onError);
  }

  // src/bv.js
  var XOR_CODE = 23442827791579n;
  var MAX_AID = 1n << 51n;
  var BASE = 58n;
  var BV_ALPHABET = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf";
  function av2bv(aid) {
    const bytes = ["B", "V", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
    let index = bytes.length - 1;
    let value = (MAX_AID | BigInt(aid)) ^ XOR_CODE;
    while (value > 0n && index >= 0) {
      bytes[index] = BV_ALPHABET[Number(value % BASE)];
      value /= BASE;
      index -= 1;
    }
    [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
    [bytes[4], bytes[7]] = [bytes[7], bytes[4]];
    return bytes.join("");
  }
  function extractBvFromHref(href = "") {
    const bvMatch = String(href).match(/\/(BV[0-9A-Za-z]+)/);
    if (bvMatch) return bvMatch[1];
    const avMatch = String(href).match(/\/av(\d+)/i);
    if (avMatch) return av2bv(avMatch[1]);
    return "";
  }

  // src/dom.js
  var VIDEO_CARD_SELECTOR = [
    "div.bili-video-card",
    "div.video-page-card-small",
    "li.bili-rank-list-video__item",
    ".video-item",
    "div.video-card",
    "li.rank-item",
    "div.video-card-reco",
    "div.video-card-common",
    "div.rank-wrap"
  ].join(",");
  var NO_BLOCK_URL_RULES = [
    /^https:\/\/www\.bilibili\.com\/anime\//,
    /^https:\/\/live\.bilibili\.com\//,
    /^https:\/\/account\.bilibili\.com\//,
    /^https:\/\/message\.bilibili\.com\//,
    /^https:\/\/t\.bilibili\.com\//,
    /^https:\/\/space\.bilibili\.com\/[0-9]+/,
    /^https:\/\/www\.bilibili\.com\/history/,
    /^https:\/\/link\.bilibili\.com\//
  ];
  function shouldSkipVideoBlocking(url = globalThis.location?.href || "") {
    return NO_BLOCK_URL_RULES.some((rule) => rule.test(url));
  }
  function uniqueElements(elements) {
    return Array.from(new Set(Array.from(elements).filter(Boolean)));
  }
  function getVideoCards(root = document) {
    const directCards = Array.from(root.querySelectorAll(VIDEO_CARD_SELECTOR)).filter(
      (card) => card.querySelector("a[href]")
    );
    const anchorCards = findCandidateCards(root);
    return uniqueElements(directCards.concat(anchorCards)).filter((card) => {
      if (card.classList?.value === "bili-video-card is-rcmd" && !document.querySelector("div.recommend-container__2-line")) {
        return false;
      }
      return true;
    });
  }
  function findCandidateCards(root = document) {
    const anchors = Array.from(root.querySelectorAll("a[href]"));
    const cards = /* @__PURE__ */ new Set();
    for (const anchor of anchors) {
      if (!extractBvFromHref(anchor.href)) continue;
      let card = anchor.closest(VIDEO_CARD_SELECTOR);
      if (!card) {
        let node = anchor;
        for (let i = 0; i < 6 && node; i += 1, node = node.parentElement) {
          if (node.querySelector?.("img") || node.querySelector?.("h3") || node.querySelector?.(".title") || node.querySelector?.(".info")) {
            card = node;
            break;
          }
        }
      }
      if (!card && anchor.parentElement?.parentElement) card = anchor.parentElement.parentElement;
      if (card) cards.add(card);
    }
    return Array.from(cards);
  }
  function readCardInfo(card) {
    const links = Array.from(card.querySelectorAll("a[href]"));
    const videoLink = links.find((link) => extractBvFromHref(link.href));
    const bv = videoLink ? extractBvFromHref(videoLink.href) : "";
    if (!bv) return null;
    const upLink = links.find((link) => /space\.bilibili\.com\/(\d+)/.test(link.href));
    const upUid = upLink?.href.match(/space\.bilibili\.com\/(\d+)/)?.[1] || "";
    const upName = upLink?.querySelector("span")?.textContent?.trim() || upLink?.textContent?.trim() || "";
    return {
      bv,
      link: videoLink.href,
      title: readTitle(card),
      upUid,
      upName
    };
  }
  function readTitle(card) {
    return card.querySelector("[title]:not(span)")?.title?.trim() || card.querySelector(".bili-video-card__info--tit")?.textContent?.trim() || card.querySelector(".title")?.textContent?.trim() || card.querySelector("h3")?.textContent?.trim() || "";
  }
  function getHideTarget(card) {
    return card.closest("div.feed-card") || card.closest("div.bili-feed-card") || (location.href.startsWith("https://search.bilibili.com/") ? card.parentElement : null) || card;
  }
  function findCardsByUpUid(upUid, videoStore, root = document) {
    return getVideoCards(root).filter((card) => {
      const info = readCardInfo(card);
      if (!info) return false;
      const stored = videoStore.get(info.bv);
      return stored?.upUid && String(stored.upUid) === String(upUid);
    });
  }

  // src/native-actions.js
  var NATIVE_CARD_ACTION = Object.freeze({
    DISLIKE_VIDEO: "dislikeVideo",
    NO_MORE_UP: "noMoreUp"
  });
  var TRIGGER_SELECTOR = [
    ".bili-video-card__info--no-interest",
    ".bili-video-card__info--more",
    ".bili-video-card__info--operate",
    ".bili-video-card__info--right",
    ".vui_dropdown",
    ".v-popover",
    "[aria-label='\u66F4\u591A']",
    "[title='\u66F4\u591A']",
    "[role='button']",
    "button"
  ].join(",");
  var MENU_ITEM_SELECTOR = [
    "button",
    "[role='button']",
    "[role='menuitem']",
    ".vui_dropdown-item",
    ".v-popover-content *",
    ".bili-video-card__info--no-interest-panel *",
    ".bili-video-card__no-interest *"
  ].join(",");
  var ACTION_LABELS = Object.freeze({
    [NATIVE_CARD_ACTION.DISLIKE_VIDEO]: [/^内容不感兴趣$/, /^不感兴趣$/, /减少此类内容推荐/],
    [NATIVE_CARD_ACTION.NO_MORE_UP]: [/不想看此\s*UP\s*主/i, /不看此\s*UP\s*主/i, /减少此\s*UP\s*主/i]
  });
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function getText(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }
  function getRoot(card, root) {
    return root || card?.ownerDocument || globalThis.document;
  }
  function isVisible(element) {
    if (!element) return false;
    const style = element.style || {};
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (typeof globalThis.getComputedStyle === "function") {
      const computed = globalThis.getComputedStyle(element);
      if (computed.display === "none" || computed.visibility === "hidden" || computed.opacity === "0") return false;
    }
    return true;
  }
  function matchesAnyText(element, patterns) {
    const text = getText(element);
    return Boolean(text) && patterns.some((pattern) => pattern.test(text));
  }
  function isScriptUi(element) {
    return Boolean(element?.closest?.(".bbt-modal, .bbt-modal-backdrop, .bbt-menu-panel, .bbt-menu-backdrop"));
  }
  function dispatchMouseEvent(element, type) {
    if (!element?.dispatchEvent) return;
    if (typeof MouseEvent === "function") {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      return;
    }
    element.dispatchEvent({ type, bubbles: true, cancelable: true });
  }
  function clickLikeUser(element) {
    for (const type of ["pointerover", "mouseover", "mouseenter"]) dispatchMouseEvent(element, type);
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) dispatchMouseEvent(element, type);
    if (typeof element?.click === "function") {
      element.click();
    } else {
      dispatchMouseEvent(element, "click");
    }
  }
  function queryAll(root, selector) {
    return Array.from(root?.querySelectorAll?.(selector) || []);
  }
  function findNativeTrigger(card) {
    return queryAll(card, TRIGGER_SELECTOR).find((element) => {
      const className = String(element.className || "");
      const text = getText(element);
      const title = element.getAttribute?.("title") || "";
      const aria = element.getAttribute?.("aria-label") || "";
      if (/no-interest|dislike|more|operate|dropdown|popover/.test(className)) return true;
      return /更多|不感兴趣|不想看/.test(`${text} ${title} ${aria}`);
    });
  }
  function findMenuItem(root, card, action) {
    const patterns = ACTION_LABELS[action] || [];
    const candidates = queryAll(card, MENU_ITEM_SELECTOR).concat(queryAll(root, MENU_ITEM_SELECTOR));
    return candidates.find((element) => !isScriptUi(element) && isVisible(element) && matchesAnyText(element, patterns));
  }
  async function waitForMenuItem(root, card, action, waitMs, pollIntervalMs) {
    const deadline = Date.now() + waitMs;
    do {
      const item = findMenuItem(root, card, action);
      if (item) return item;
      if (waitMs <= 0) break;
      await sleep(pollIntervalMs);
    } while (Date.now() <= deadline);
    return null;
  }
  function hasDirectDislikeTrigger(trigger) {
    const className = String(trigger?.className || "");
    return /no-interest|dislike/.test(className);
  }
  async function runNativeCardAction(card, action, { root, waitMs = 1200, pollIntervalMs = 80 } = {}) {
    const searchRoot = getRoot(card, root);
    if (!card || !searchRoot) {
      return { ok: false, reason: "unsupported", message: "\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301" };
    }
    const existingItem = findMenuItem(searchRoot, card, action);
    if (existingItem) {
      clickLikeUser(existingItem);
      return { ok: true, source: "native-menu" };
    }
    const trigger = findNativeTrigger(card);
    if (!trigger) {
      return { ok: false, reason: "unsupported", message: "\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301" };
    }
    clickLikeUser(card);
    clickLikeUser(trigger);
    const menuItem = await waitForMenuItem(searchRoot, card, action, waitMs, pollIntervalMs);
    if (menuItem) {
      if (menuItem !== trigger) clickLikeUser(menuItem);
      return { ok: true, source: "native-menu" };
    }
    if (action === NATIVE_CARD_ACTION.DISLIKE_VIDEO && hasDirectDislikeTrigger(trigger)) {
      return { ok: true, source: "native-trigger" };
    }
    return { ok: false, reason: "unsupported", message: "\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301" };
  }

  // src/overlay.js
  function getOverlayText(result, settings) {
    if (!result?.blocked) return "";
    return settings.blockedOverlayOnlyDisplaysType_Switch ? result.type : `${result.type}: ${result.item}`;
  }
  function applyBlockedState(card, result, settings) {
    if (!card || !result?.blocked) return;
    if (card.dataset.bbtTemporaryVisible === "1") return;
    const text = getOverlayText(result, settings);
    card.dataset.bbtBlocked = "1";
    if (settings.hideVideoMode_Switch) {
      const target = getHideTarget(card);
      target.style.display = "none";
      card.style.display = "none";
      return;
    }
    card.style.display = "";
    if (!card.style.position) card.style.position = "relative";
    let overlay = card.querySelector(":scope > .blockedOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "blockedOverlay";
      const label = document.createElement("div");
      label.className = "blockedOverlayText";
      overlay.appendChild(label);
      const undo = document.createElement("button");
      undo.className = "blockedOverlay-undo-btn";
      undo.type = "button";
      undo.textContent = "\u64A4\u9500";
      undo.title = "\u4E34\u65F6\u663E\u793A\u6B64\u89C6\u9891\uFF08\u79FB\u9664\u8986\u76D6\u5C42\uFF09";
      undo.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        card.dataset.bbtTemporaryVisible = "1";
        overlay.remove();
      });
      overlay.appendChild(undo);
      card.insertAdjacentElement("afterbegin", overlay);
    }
    overlay.querySelector(".blockedOverlayText").textContent = text;
    syncOverlaySize(overlay);
  }
  function removeBlockedState(card) {
    if (!card) return;
    delete card.dataset.bbtBlocked;
    delete card.dataset.bbtTemporaryVisible;
    card.style.display = "";
    const hideTarget = getHideTarget(card);
    if (hideTarget) hideTarget.style.display = "";
    card.querySelector(":scope > .blockedOverlay")?.remove();
  }
  function syncOverlaySize(overlay) {
    if (!overlay?.parentElement) return;
    const rect = overlay.parentElement.getBoundingClientRect();
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }
  function syncAllOverlays(root = document) {
    root.querySelectorAll(".blockedOverlay").forEach(syncOverlaySize);
  }
  function addTemporaryUpOverlay(card, title = "\u5DF2\u5C4F\u853D\u6B64UP\u4E3B") {
    if (!card || card.querySelector(":scope > .blockedOverlay")) return;
    if (!card.style.position) card.style.position = "relative";
    const overlay = document.createElement("div");
    overlay.className = "blockedOverlay";
    const label = document.createElement("div");
    label.className = "blockedOverlayText";
    label.textContent = title;
    overlay.appendChild(label);
    const undo = document.createElement("button");
    undo.className = "blockedOverlay-undo-btn";
    undo.type = "button";
    undo.textContent = "\u64A4\u9500\uFF08\u4E34\u65F6\u67E5\u770B\uFF09";
    undo.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      card.dataset.bbtTemporaryVisible = "1";
      overlay.remove();
    });
    overlay.appendChild(undo);
    card.insertAdjacentElement("afterbegin", overlay);
    syncOverlaySize(overlay);
  }

  // src/ui-state.js
  var ACTION_STATE = Object.freeze({
    IDLE: "idle",
    LOADING: "loading",
    SUCCESS: "success",
    ERROR: "error"
  });
  var STATE_CLASS = Object.freeze({
    [ACTION_STATE.IDLE]: "bbt-state-idle",
    [ACTION_STATE.LOADING]: "bbt-state-loading",
    [ACTION_STATE.SUCCESS]: "bbt-state-success",
    [ACTION_STATE.ERROR]: "bbt-state-error"
  });
  function getActionStateView(state, idleLabel, message = "") {
    const resolvedState = STATE_CLASS[state] ? state : ACTION_STATE.IDLE;
    return {
      label: resolvedState === ACTION_STATE.IDLE ? idleLabel : resolvedState === ACTION_STATE.LOADING ? "\u5904\u7406\u4E2D..." : message || idleLabel,
      className: STATE_CLASS[resolvedState],
      disabled: resolvedState === ACTION_STATE.LOADING || resolvedState === ACTION_STATE.SUCCESS
    };
  }

  // src/quick-actions.js
  function button(text, onClick, className = "", title = "") {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = text;
    if (className) el.className = className;
    if (title) el.title = title;
    el.addEventListener("click", onClick);
    return el;
  }
  function section(title) {
    const block2 = document.createElement("section");
    const heading = document.createElement("h4");
    heading.textContent = title;
    block2.appendChild(heading);
    return block2;
  }
  function setActionState(btn, state, message = "", timeout = 1600) {
    const idleLabel = btn.dataset.idleLabel || btn.textContent;
    btn.dataset.idleLabel = idleLabel;
    btn.classList.remove("bbt-state-idle", "bbt-state-loading", "bbt-state-success", "bbt-state-error");
    const view = getActionStateView(state, idleLabel, message);
    btn.textContent = view.label;
    btn.classList.add(view.className);
    btn.disabled = view.disabled;
    if (state === ACTION_STATE.SUCCESS || state === ACTION_STATE.ERROR) {
      setTimeout(() => setActionState(btn, ACTION_STATE.IDLE), timeout);
    }
  }
  function actionButton(text, onClick, className = "", title = "") {
    const el = button(text, onClick, `bbt-action-button ${className}`.trim(), title);
    setActionState(el, ACTION_STATE.IDLE);
    return el;
  }
  function setPersistedSuccess(btn, label) {
    btn.dataset.idleLabel = label;
    btn.classList.remove("bbt-state-idle", "bbt-state-loading", "bbt-state-error");
    btn.classList.add("bbt-state-success");
    btn.textContent = label;
    btn.disabled = true;
  }
  function createQuickActions({
    api,
    scanner,
    getSettings,
    setSettings,
    getQuickActionState: readQuickActionState = () => ({}),
    setQuickActionState: writeQuickActionState = () => {
    }
  }) {
    const persist = (settings) => {
      const saved = setSettings(settings);
      scanner.schedule(0);
      return saved;
    };
    const addUnique = (settings, key, value) => {
      if (!value) return false;
      if (!Array.isArray(settings[key])) settings[key] = [];
      if (settings[key].some((item) => String(item).toLowerCase() === String(value).toLowerCase())) return false;
      settings[key].push(String(value));
      return true;
    };
    const toggleListValue = (settings, key, value) => {
      if (!value) return false;
      if (!Array.isArray(settings[key])) settings[key] = [];
      const index = settings[key].findIndex((item) => String(item).toLowerCase() === String(value).toLowerCase());
      if (index >= 0) {
        settings[key].splice(index, 1);
        return false;
      }
      settings[key].push(String(value));
      return true;
    };
    const hideUpVideos = (upUid) => {
      for (const card of findCardsByUpUid(upUid, scanner.videoStore)) {
        addTemporaryUpOverlay(card, "\u5DF2\u5C4F\u853D\u6B64UP\u4E3B");
      }
    };
    const showPanel = async (card) => {
      const base = readCardInfo(card);
      if (!base) return;
      scanner.mergeVideo(base.bv, base);
      const video = await scanner.ensureDetails(base.bv, { video: true, tags: true, up: false });
      const settings = normalizeSettings(getSettings());
      let actionState = normalizeQuickActionState(readQuickActionState());
      const upUidForState = video.upUid || base.upUid;
      const storedAction = getQuickActionState(actionState, { bv: base.bv, uid: upUidForState });
      const persistAction = (action) => {
        actionState = markQuickActionState(actionState, { bv: base.bv, uid: upUidForState }, action);
        writeQuickActionState(actionState);
      };
      const backdrop = document.createElement("div");
      backdrop.className = "bbt-modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "bbt-modal";
      const close = () => {
        backdrop.remove();
        modal.remove();
        document.removeEventListener("keydown", onKeydown);
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") close();
      };
      document.addEventListener("keydown", onKeydown);
      backdrop.addEventListener("click", close);
      const header = document.createElement("header");
      header.className = "bbt-modal-header";
      const titleGroup = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = "\u5FEB\u901F\u5C4F\u853D";
      titleGroup.appendChild(title);
      const videoTitle = document.createElement("div");
      videoTitle.className = "bbt-video-title";
      videoTitle.textContent = video.title || base.title || "(\u672A\u77E5\u6807\u9898)";
      titleGroup.appendChild(videoTitle);
      const meta = document.createElement("div");
      meta.className = "bbt-video-meta";
      meta.textContent = `BV: ${base.bv}`;
      titleGroup.appendChild(meta);
      header.appendChild(titleGroup);
      header.appendChild(button("\u5173\u95ED", close, "bbt-modal-close", "\u5173\u95ED"));
      modal.appendChild(header);
      const feedback = section("\u5185\u5BB9\u53CD\u9988");
      const feedbackRow = document.createElement("div");
      feedbackRow.className = "bbt-button-row";
      const dislikeButton = actionButton(storedAction.disliked ? "\u5DF2\u53CD\u9988" : "\u5185\u5BB9\u4E0D\u611F\u5174\u8DA3", async (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        try {
          const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.DISLIKE_VIDEO);
          if (!result.ok) throw new Error(result.message || "\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301");
          card.style.display = "none";
          persistAction("disliked");
          setPersistedSuccess(event.currentTarget, "\u5DF2\u53CD\u9988");
        } catch (error) {
          console.error("\u5185\u5BB9\u4E0D\u611F\u5174\u8DA3\u539F\u751F\u64CD\u4F5C\u5931\u8D25:", error);
          setActionState(event.currentTarget, ACTION_STATE.ERROR, error.message || "\u5931\u8D25");
        }
      });
      if (storedAction.disliked) setPersistedSuccess(dislikeButton, "\u5DF2\u53CD\u9988");
      feedbackRow.appendChild(dislikeButton);
      const blockUpButton = actionButton(storedAction.blockedUp ? "\u5DF2\u5C4F\u853DUP\u4E3B" : "\u4E0D\u60F3\u770B\u6B64UP\u4E3B", async (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        const uid = video.upUid || base.upUid;
        const applyLocalBlock = (label = "\u5DF2\u672C\u5730\u5C4F\u853DUP") => {
          const next = normalizeSettings(getSettings());
          addUnique(next, "blockedNameOrUid_Array", uid);
          persist(next);
          hideUpVideos(uid);
          persistAction("blockedUp");
          setPersistedSuccess(event.currentTarget, label);
        };
        try {
          const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.NO_MORE_UP);
          if (!result.ok) throw new Error(result.message || "\u4EC5\u9996\u9875\u63A8\u8350\u652F\u6301");
          card.style.display = "none";
          persistAction("blockedUp");
          setPersistedSuccess(event.currentTarget, "\u5DF2\u4E0D\u518D\u63A8\u8350\u6B64UP");
        } catch (error) {
          console.error("\u4E0D\u60F3\u770B\u6B64UP\u4E3B\u539F\u751F\u64CD\u4F5C\u5931\u8D25:", error);
          if (uid) {
            applyLocalBlock();
            return;
          }
          setActionState(event.currentTarget, ACTION_STATE.ERROR, error.message || "\u7F3A\u5C11UID");
        }
      });
      if (storedAction.blockedUp) setPersistedSuccess(blockUpButton, "\u5DF2\u4E0D\u518D\u63A8\u8350\u6B64UP");
      feedbackRow.appendChild(blockUpButton);
      const blacklistButton = actionButton(storedAction.blacklisted ? "\u5DF2\u62C9\u9ED1" : "\u62C9\u9ED1\u6B64UP\u4E3B", async (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        const uid = video.upUid || base.upUid;
        if (!uid) {
          setActionState(event.currentTarget, ACTION_STATE.ERROR, "\u7F3A\u5C11UID");
          return;
        }
        if (typeof api.csrfProvider === "function" && !api.csrfProvider()) {
          setActionState(event.currentTarget, ACTION_STATE.ERROR, "\u7F3A\u5C11 csrf");
          return;
        }
        try {
          const request = api.blockUp(uid);
          persistAction("blacklisted");
          setPersistedSuccess(event.currentTarget, "\u5DF2\u62C9\u9ED1");
          runInBackground(request, (error) => {
            console.error("\u62C9\u9ED1\u63A5\u53E3\u540E\u53F0\u9519\u8BEF:", error);
          });
        } catch (error) {
          console.error("\u62C9\u9ED1\u63A5\u53E3\u9519\u8BEF:", error);
          setActionState(event.currentTarget, ACTION_STATE.ERROR, error.message || "\u5931\u8D25");
        }
      }, "bbt-danger");
      if (storedAction.blacklisted) setPersistedSuccess(blacklistButton, "\u5DF2\u62C9\u9ED1");
      feedbackRow.appendChild(blacklistButton);
      feedback.appendChild(feedbackRow);
      modal.appendChild(feedback);
      const upUid = video.upUid || base.upUid;
      const upName = video.upName || base.upName;
      if (upUid || upName) {
        const upSection = section("UP\u4E3B\u5C4F\u853D");
        const info = document.createElement("div");
        info.className = "bbt-inline-info";
        info.textContent = `${upName || "\u672A\u77E5UP\u4E3B"}${upUid ? ` (UID: ${upUid})` : ""}`;
        upSection.appendChild(info);
        upSection.appendChild(
          actionButton(settings.blockedNameOrUid_Array.includes(upUid) ? "\u5DF2\u5C4F\u853D\u6B64UP\u4E3B" : "\u5C4F\u853D\u6B64UP\u4E3B", (event) => {
            const next = normalizeSettings(getSettings());
            const enabled = toggleListValue(next, "blockedNameOrUid_Array", upUid || upName);
            persist(next);
            event.currentTarget.dataset.idleLabel = enabled ? "\u5DF2\u5C4F\u853D\u6B64UP\u4E3B" : "\u5C4F\u853D\u6B64UP\u4E3B";
            setActionState(event.currentTarget, ACTION_STATE.SUCCESS, enabled ? "\u5DF2\u52A0\u5165" : "\u5DF2\u79FB\u9664");
          })
        );
        modal.appendChild(upSection);
      }
      if (video.partition) {
        const partition = section("\u89C6\u9891\u5206\u533A");
        partition.appendChild(
          actionButton(settings.blockedVideoPartitions_Array.includes(video.partition) ? `\u5DF2\u5C4F\u853D\uFF1A${video.partition}` : `\u5C4F\u853D\uFF1A${video.partition}`, (event) => {
            const next = normalizeSettings(getSettings());
            const enabled = toggleListValue(next, "blockedVideoPartitions_Array", video.partition);
            persist(next);
            event.currentTarget.dataset.idleLabel = enabled ? `\u5DF2\u5C4F\u853D\uFF1A${video.partition}` : `\u5C4F\u853D\uFF1A${video.partition}`;
            setActionState(event.currentTarget, ACTION_STATE.SUCCESS, enabled ? "\u5DF2\u52A0\u5165" : "\u5DF2\u79FB\u9664");
          })
        );
        modal.appendChild(partition);
      }
      const tags = Array.isArray(video.tags) ? video.tags : [];
      const tagsSection = section("\u89C6\u9891\u6807\u7B7E");
      const tagRow = document.createElement("div");
      tagRow.className = "bbt-chip-row";
      tags.forEach((tag) => {
        const active = settings.blockedTag_Array.some((item) => String(item).toLowerCase() === String(tag).toLowerCase());
        const tagButton = actionButton(tag, (event) => {
          const next = normalizeSettings(getSettings());
          const enabled = toggleListValue(next, "blockedTag_Array", tag);
          persist(next);
          event.currentTarget.classList.toggle("bbt-chip-active", enabled);
        });
        tagButton.classList.toggle("bbt-chip-active", active);
        tagRow.appendChild(tagButton);
      });
      tagsSection.appendChild(tagRow);
      tagsSection.appendChild(
        actionButton("\u4E00\u952E\u5168\u90E8\u6DFB\u52A0\u6807\u7B7E", (event) => {
          setActionState(event.currentTarget, ACTION_STATE.LOADING);
          const next = normalizeSettings(getSettings());
          tags.forEach((tag) => addUnique(next, "blockedTag_Array", tag));
          persist(next);
          tagRow.querySelectorAll("button").forEach((tagButton) => tagButton.classList.add("bbt-chip-active"));
          setActionState(event.currentTarget, ACTION_STATE.SUCCESS, "\u5DF2\u5168\u90E8\u6DFB\u52A0");
        })
      );
      modal.appendChild(tagsSection);
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
    };
    const injectButton = (card) => {
      if (!card || card.dataset.bbtQuickActionAdded === "1") return;
      const info = readCardInfo(card);
      if (!info) return;
      card.dataset.bbtQuickActionAdded = "1";
      if (!card.style.position) card.style.position = "relative";
      const action = document.createElement("button");
      action.type = "button";
      action.className = "bbt-card-action gm-copy-tags-btn";
      action.textContent = "\u5C4F\u853D";
      action.title = "\u6253\u5F00\u5FEB\u901F\u5C4F\u853D\u9762\u677F";
      action.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showPanel(card).catch((error) => {
          console.error("\u5FEB\u901F\u5C4F\u853D\u9762\u677F\u6253\u5F00\u5931\u8D25:", error);
        });
      });
      card.appendChild(action);
    };
    return {
      scan(root = document) {
        getVideoCards(root).forEach(injectButton);
      },
      hideUpVideos
    };
  }

  // src/scanner.js
  var Scanner = class {
    constructor({ api, getSettings, logger = console }) {
      this.api = api;
      this.getSettings = getSettings;
      this.logger = logger;
      this.videoStore = /* @__PURE__ */ new Map();
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
      Object.assign(current, Object.fromEntries(Object.entries(patch || {}).filter(([, value]) => value !== "" && value !== void 0 && value !== null)));
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
                upSign: upInfo.sign
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
      const needVideo = needs.video || needs.up && !video.upUid || needs.comments && !video.aid;
      if (needVideo) {
        await this.ensureDetails(bv, { video: true, tags: false, up: false });
        video = this.getVideo(bv);
      }
      const requests = [];
      if (needs.tags && !video.tags) {
        requests.push(
          this.api.getTags(bv).then((tags) => {
            if (tags?.length) this.mergeVideo(bv, { tags });
          }).catch((error) => this.log("tags failed", bv, error))
        );
      }
      if (needs.up && video.upUid && video.upLevel === void 0) {
        requests.push(
          this.api.getUpInfo(video.upUid).then((upInfo) => {
            if (!upInfo) return;
            this.mergeVideo(bv, {
              upName: upInfo.name,
              upLevel: upInfo.level,
              upFans: upInfo.fans,
              upAttention: upInfo.attention,
              upSign: upInfo.sign
            });
          }).catch((error) => this.log("up failed", bv, error))
        );
      }
      if (needs.comments && video.aid && video.filteredComments === void 0) {
        requests.push(
          this.api.getComments(video.aid).then((comments) => {
            if (comments) this.mergeVideo(bv, comments);
          }).catch((error) => this.log("comments failed", bv, error))
        );
      }
      await Promise.all(requests);
    }
  };

  // src/settings-panel.js
  var OPTION_GROUPS = [
    {
      title: "\u5E38\u7528\u89C4\u5219",
      summary: "\u6807\u9898\u3001UP\u3001\u6807\u7B7E\u548C\u767D\u540D\u5355\uFF0C\u4F18\u5148\u914D\u7F6E\u8FD9\u91CC\u3002",
      options: [
        { kind: "list", switchKey: "blockedTitle_Switch", regexKey: "blockedTitle_UseRegular", listKey: "blockedTitle_Array", label: "\u6309\u6807\u9898\u5C4F\u853D", title: "\u4E0D\u9700\u8981API\uFF0C\u7F51\u9875\u4E0A\u76F4\u63A5\u6709\u6807\u9898\u4FE1\u606F", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" },
        { kind: "list", switchKey: "blockedNameOrUid_Switch", regexKey: "blockedNameOrUid_UseRegular", listKey: "blockedNameOrUid_Array", label: "\u6309UP\u540D\u79F0\u6216Uid\u5C4F\u853D", title: "\u5927\u90E8\u5206\u60C5\u51B5\u4E5F\u662F\u53EF\u4EE5\u5728\u7F51\u9875\u4E0A\u76F4\u63A5\u62FF\u5230", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" },
        { kind: "list", switchKey: "blockedTag_Switch", regexKey: "blockedTag_UseRegular", listKey: "blockedTag_Array", label: "\u6309\u6807\u7B7E\u5C4F\u853D", title: "\u6807\u7B7EAPI\uFF0C\u8981\u6CE8\u610F\u6709\u4E00\u4E9B\u6807\u7B7E\u53EF\u80FD\u662F\u5206\u533A", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" },
        { kind: "list", switchKey: "doubleBlockedTag_Switch", regexKey: "doubleBlockedTag_UseRegular", listKey: "doubleBlockedTag_Array", label: "\u6309\u53CC\u91CD\u6807\u7B7E\u5C4F\u853D", title: "\u89C6\u9891\u5305\u542B\u4E00\u5BF9\u6307\u5B9A\u6807\u7B7E\u65F6\u624D\u4F1A\u751F\u6548\uFF0C\u4F8B\u5982\uFF1A\u539F\u795E|\u9E23\u6F6E", placeholder: '\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694(\u4EE5"A\u6807\u7B7E|B\u6807\u7B7E"\u683C\u5F0F\u6DFB\u52A0)' },
        { kind: "list", switchKey: "whitelistNameOrUid_Switch", listKey: "whitelistNameOrUid_Array", label: "UP\u767D\u540D\u5355", title: "\u767D\u540D\u5355\uFF0C\u5728\u6700\u540E\u8FDB\u884C\u7684\u5224\u65AD\uFF0C\u6709\u6700\u9AD8\u7684\u4F18\u5148\u7EA7", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" }
      ]
    },
    {
      title: "\u89C6\u9891\u6307\u6807",
      summary: "\u57FA\u4E8E\u64AD\u653E\u3001\u6536\u85CF\u3001\u70B9\u8D5E\u3001\u65F6\u957F\u7B49\u89C6\u9891API\u6570\u636E\u5224\u65AD\u3002",
      options: [
        { kind: "number", switchKey: "blockedBelowVideoFavorite_Switch", valueKey: "blockedBelowVideoFavorite", label: "\u4F4E\u4E8E\u6536\u85CF\u6570", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u6536\u85CF\u6570\u540E\u5224\u65AD\u7684", unit: "\u6B21" },
        { kind: "number", switchKey: "blockedAboveFavoriteCoinRatio_Switch", valueKey: "blockedAboveFavoriteCoinRatio", label: "\u9AD8\u4E8E\u6536\u85CF/\u6295\u5E01\u6BD4", title: "\u53EA\u5904\u7406\u64AD\u653E\u65705000+\u3001\u6536\u85CF\u657050+\u3001\u53D1\u5E03\u65F6\u95F42\u5C0F\u65F6+\u7684\u89C6\u9891" },
        { kind: "number", switchKey: "blockedShortDuration_Switch", valueKey: "blockedShortDuration", label: "\u4F4E\u4E8E\u89C6\u9891\u65F6\u957F", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u65F6\u957F\u540E\u5224\u65AD\u7684", unit: "\u79D2" },
        { kind: "number", switchKey: "blockedBelowVideoViews_Switch", valueKey: "blockedBelowVideoViews", label: "\u4F4E\u4E8E\u64AD\u653E\u91CF", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u64AD\u653E\u91CF\u540E\u5224\u65AD\u7684", unit: "\u6B21" },
        { kind: "number", switchKey: "blockedBelowLikesRate_Switch", valueKey: "blockedBelowLikesRate", label: "\u4F4E\u4E8E\u70B9\u8D5E\u7387", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u64AD\u653E\u91CF\u548C\u70B9\u8D5E\u6570\u540E\u5224\u65AD\u7684", unit: "%" },
        { kind: "number", switchKey: "blockedBelowCoinRate_Switch", valueKey: "blockedBelowCoinRate", label: "\u4F4E\u4E8E\u6295\u5E01\u7387", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u64AD\u653E\u91CF\u548C\u6295\u5E01\u6570\u540E\u5224\u65AD\u7684", unit: "%" },
        { kind: "switch", switchKey: "blockedChargingExclusive_Switch", label: "\u5C4F\u853D\u5145\u7535\u4E13\u5C5E", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u5145\u7535\u89C6\u9891\u6807\u8BB0\u540E\u5224\u65AD\u7684" },
        { kind: "switch", switchKey: "blockedPortraitVideo_Switch", label: "\u5C4F\u853D\u7AD6\u5C4F\u89C6\u9891", title: "\u89C6\u9891API\uFF0C\u662F\u62FF\u5230\u89C6\u9891\u7684\u5206\u8FA8\u7387\u540E\u5224\u65AD\u7684" },
        { kind: "list", switchKey: "blockedVideoPartitions_Switch", regexKey: "blockedVideoPartitions_UseRegular", listKey: "blockedVideoPartitions_Array", label: "\u6309\u89C6\u9891\u5206\u533A\u5C4F\u853D", title: "\u89C6\u9891API\uFF0C\u73B0\u5728\u89C6\u9891\u7684\u5206\u533A\u53EF\u80FD\u4E0D\u662F\u5F88\u597D\u786E\u5B9A\u540D\u5B57\uFF0C\u53EF\u4EE5\u770B\u65E5\u5FD7\u6765\u5224\u65AD", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" }
      ]
    },
    {
      title: "UP\u4E3B\u4E0E\u8BC4\u8BBA",
      summary: "\u57FA\u4E8EUP\u4E3B\u4FE1\u606F\u548C\u8BC4\u8BBAAPI\uFF0C\u8BC4\u8BBA\u76F8\u5173\u8BF7\u6C42\u66F4\u91CD\u3002",
      options: [
        { kind: "number", switchKey: "blockedBelowUpLevel_Switch", valueKey: "blockedBelowUpLevel", label: "\u4F4E\u4E8EUP\u4E3B\u7B49\u7EA7", title: "UP\u4E3BAPI\uFF0C\u662F\u62FF\u5230UP\u4E3B\u7684\u7B49\u7EA7\u4FE1\u606F\u540E\u5224\u65AD\u7684", unit: "\u7EA7" },
        { kind: "number", switchKey: "blockedBelowUpFans_Switch", valueKey: "blockedBelowUpFans", label: "\u4F4E\u4E8EUP\u4E3B\u7C89\u4E1D\u6570", title: "UP\u4E3BAPI\uFF0C\u662F\u62FF\u5230UP\u4E3B\u7684\u7C89\u4E1D\u6570\u540E\u5224\u65AD\u7684", unit: "\u4EBA" },
        { kind: "number", switchKey: "blockedAboveUpAttention_Switch", valueKey: "blockedAboveUpAttention", label: "\u9AD8\u4E8EUP\u4E3B\u5173\u6CE8\u6570", title: "UP\u4E3BAPI\uFF0C\u662F\u62FF\u5230UP\u4E3B\u7684\u5173\u6CE8\u6570\u540E\u5224\u65AD\u7684", unit: "\u4EBA" },
        { kind: "list", switchKey: "blockedUpSigns_Switch", regexKey: "blockedUpSigns_UseRegular", listKey: "blockedUpSigns_Array", label: "\u6309UP\u4E3B\u7B80\u4ECB\u5C4F\u853D", title: "UP\u4E3BAPI\uFF0C\u662F\u62FF\u5230UP\u4E3B\u7684\u7B80\u4ECB\u540E\u5224\u65AD\u7684", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" },
        { kind: "switch", switchKey: "blockedFilteredCommentsVideo_Switch", label: "\u5C4F\u853D\u7CBE\u9009\u8BC4\u8BBA\u89C6\u9891", title: "\u8BC4\u8BBAAPI\uFF0C\u6781\u6613\u8BF7\u6C42\u8FC7\u591A\u5BFC\u81F4\u62D2\u7EDD" },
        { kind: "list", switchKey: "blockedTopComment_Switch", regexKey: "blockedTopComment_UseRegular", listKey: "blockedTopComment_Array", label: "\u6309\u7F6E\u9876\u8BC4\u8BBA\u5C4F\u853D", title: "\u8BC4\u8BBAAPI\uFF0C\u6781\u6613\u8BF7\u6C42\u8FC7\u591A\u5BFC\u81F4\u62D2\u7EDD", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" }
      ]
    },
    {
      title: "\u9875\u9762\u663E\u793A",
      summary: "\u70ED\u641C\u3001\u975E\u89C6\u9891\u5143\u7D20\u3001\u53E0\u52A0\u5C42\u4E0E\u8C03\u8BD5\u9009\u9879\u3002",
      options: [
        { kind: "switch", switchKey: "hideTrending_Switch", label: "\u9690\u85CF\u641C\u7D22\u6846\u70ED\u641C", title: "\u76F4\u63A5\u9690\u85CF\u6240\u6709\u7684\u70ED\u641C\u9879" },
        { kind: "switch", switchKey: "blockedTrendingItemByTitleTag_Switch", label: "\u7528\u6807\u9898\u89C4\u5219\u5C4F\u853D\u70ED\u641C", title: "\u76F4\u63A5\u6309\u5DF2\u6709\u6807\u9898\u5C4F\u853D\u9879\u6765\u5C4F\u853D\u70ED\u641C\u9879" },
        { kind: "list", switchKey: "blockedTrendingItem_Switch", regexKey: "blockedTrendingItem_UseRegular", listKey: "blockedTrendingItem_Array", label: "\u6309\u5173\u952E\u5B57\u5C4F\u853D\u70ED\u641C", title: "\u7C7B\u4F3C\u6807\u9898\u7684\u7528\u6CD5", placeholder: "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694" },
        { kind: "switch", switchKey: "hideNonVideoElements_Switch", label: "\u9690\u85CF\u975E\u89C6\u9891\u5143\u7D20", title: "\u53BB\u5E7F\u544A\u3001\u76F4\u64AD\u3001\u63A8\u5E7F\u7B49\u975E\u6295\u7A3F\u89C6\u9891\u5185\u5BB9" },
        { kind: "switch", switchKey: "blockedOverlayOnlyDisplaysType_Switch", label: "\u53E0\u52A0\u5C42\u53EA\u663E\u793A\u7C7B\u578B", title: "\u9632\u6B62\u663E\u793A\u547D\u4E2D\u7684\u5C4F\u853D\u8BCD" },
        { kind: "switch", switchKey: "hideVideoMode_Switch", label: "\u76F4\u63A5\u9690\u85CF\u89C6\u9891", title: "\u9690\u85CF\u89C6\u9891\u800C\u4E0D\u662F\u4F7F\u7528\u53E0\u52A0\u5C42\u8986\u76D6" },
        { kind: "switch", switchKey: "consoleOutputLog_Switch", label: "\u63A7\u5236\u53F0\u65E5\u5FD7", title: "\u8F93\u51FA\u8C03\u8BD5\u65E5\u5FD7" }
      ]
    }
  ];
  function checkbox(checked, onChange) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "bbt-switch";
    input.checked = Boolean(checked);
    input.addEventListener("change", () => onChange(input.checked));
    return input;
  }
  function makeButton(text, onClick, className = "") {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.textContent = text;
    if (className) button2.className = className;
    button2.addEventListener("click", onClick);
    return button2;
  }
  function openSettingsPanel({ getSettings, setSettings, onSave }) {
    if (document.getElementById("blockedMenuUi")) return;
    let draft = normalizeSettings(getSettings());
    const backdrop = document.createElement("div");
    backdrop.className = "bbt-menu-backdrop";
    const panel = document.createElement("div");
    panel.id = "blockedMenuUi";
    const closePanel = () => {
      panel.remove();
      backdrop.remove();
    };
    backdrop.addEventListener("click", closePanel);
    const header = document.createElement("header");
    header.className = "bbt-menu-header";
    const title = document.createElement("div");
    title.className = "bbt-menu-title";
    title.textContent = "\u811A\u672C\u914D\u7F6E";
    const subtitle = document.createElement("div");
    subtitle.className = "bbt-menu-subtitle";
    subtitle.textContent = "Bilibili \u89C6\u9891\u5C4F\u853D\u89C4\u5219 v1.5.0";
    const titleWrap = document.createElement("div");
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    const closeButton = makeButton("", closePanel, "bbt-modal-close");
    closeButton.title = "\u5173\u95ED";
    header.appendChild(closeButton);
    panel.appendChild(header);
    const prompt = document.createElement("div");
    prompt.id = "blockedMenuPrompt";
    prompt.style.opacity = "0";
    const showPrompt = (text) => {
      prompt.textContent = text;
      prompt.style.opacity = "1";
      setTimeout(() => {
        prompt.style.opacity = "0";
      }, 1500);
    };
    const renderList = (ul, def) => {
      ul.textContent = "";
      const values = draft[def.listKey] || [];
      values.forEach((value, index) => {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = value;
        li.appendChild(text);
        li.appendChild(
          makeButton("x", () => {
            removeListItem(draft, def.listKey, index);
            renderList(ul, def);
          }, "bbt-chip-remove")
        );
        ul.appendChild(li);
      });
    };
    for (const groupDef of OPTION_GROUPS) {
      const section2 = document.createElement("section");
      section2.className = "bbt-option-group";
      const groupHeader = document.createElement("div");
      groupHeader.className = "bbt-option-group-header";
      const groupTitle = document.createElement("h3");
      groupTitle.textContent = groupDef.title;
      const groupSummary = document.createElement("p");
      groupSummary.textContent = groupDef.summary;
      groupHeader.appendChild(groupTitle);
      groupHeader.appendChild(groupSummary);
      section2.appendChild(groupHeader);
      for (const def of groupDef.options) {
        const row = document.createElement("div");
        row.className = `bbt-option bbt-option-${def.kind}`;
        const main = document.createElement("div");
        main.className = "bbt-option-main";
        const label = document.createElement("label");
        label.className = "bbt-option-label";
        label.title = def.title;
        label.appendChild(
          checkbox(draft[def.switchKey], (checked) => {
            draft[def.switchKey] = checked;
          })
        );
        label.append(def.label);
        const hint = document.createElement("div");
        hint.className = "bbt-option-hint";
        hint.textContent = def.title;
        main.appendChild(label);
        main.appendChild(hint);
        row.appendChild(main);
        const controls = document.createElement("div");
        controls.className = "bbt-option-controls";
        if (def.regexKey) {
          const regexLabel = document.createElement("label");
          regexLabel.className = "bbt-regex-toggle";
          regexLabel.title = "\u6B63\u5219\u662F\u4EC0\u4E48\u53EF\u4EE5\u95EEAI\uFF0C\u4F60\u4E5F\u53EF\u4EE5\u7406\u89E3\u6210\u6A21\u7CCA\u5339\u914D";
          regexLabel.appendChild(
            checkbox(draft[def.regexKey], (checked) => {
              draft[def.regexKey] = checked;
            })
          );
          regexLabel.append("\u6B63\u5219");
          controls.appendChild(regexLabel);
        }
        if (def.kind === "number") {
          const valueWrap = document.createElement("div");
          valueWrap.className = "bbt-number-field";
          const input = document.createElement("input");
          input.type = "number";
          input.value = draft[def.valueKey];
          input.addEventListener("input", () => {
            draft[def.valueKey] = Number(input.value || 0);
          });
          valueWrap.appendChild(input);
          if (def.unit) {
            const unit = document.createElement("span");
            unit.textContent = def.unit;
            valueWrap.appendChild(unit);
          }
          controls.appendChild(valueWrap);
        } else if (def.kind === "list") {
          const wrapper = document.createElement("div");
          wrapper.className = "bbt-list-row";
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = def.placeholder || "\u591A\u9879\u8F93\u5165\u8BF7\u7528\u82F1\u6587\u9017\u53F7\u95F4\u9694";
          wrapper.appendChild(input);
          const list = document.createElement("ul");
          wrapper.appendChild(
            makeButton("\u6DFB\u52A0", () => {
              addListItems(draft, def.listKey, input.value);
              input.value = "";
              renderList(list, def);
            }, "bbt-add-button")
          );
          controls.appendChild(wrapper);
          controls.appendChild(list);
          renderList(list, def);
        }
        row.appendChild(controls);
        section2.appendChild(row);
      }
      panel.appendChild(section2);
    }
    const buttons = document.createElement("div");
    buttons.className = "bbt-menu-buttons";
    buttons.appendChild(
      makeButton("\u8BFB\u53D6", () => {
        draft = normalizeSettings(getSettings());
        closePanel();
        openSettingsPanel({ getSettings, setSettings, onSave });
      }, "bbt-secondary-button")
    );
    buttons.appendChild(
      makeButton("\u4FDD\u5B58", () => {
        const saved = setSettings(draft);
        draft = clone(saved);
        showPrompt("\u4FDD\u5B58\u6570\u636E");
        onSave?.();
      }, "bbt-primary-button")
    );
    buttons.appendChild(makeButton("\u5173\u95ED", closePanel, "bbt-secondary-button"));
    buttons.appendChild(
      makeButton("\u5BFC\u51FA", () => {
        const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Bilibili_blocked_videos_by_tags_Config_${formatTimestamp()}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showPrompt("\u8BBE\u7F6E\u5BFC\u51FA\u6210\u529F");
      }, "bbt-secondary-button")
    );
    buttons.appendChild(
      makeButton("\u5BFC\u5165", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.addEventListener("change", async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const imported = JSON.parse(await file.text());
            if (!validateImportedSettings(imported)) throw new Error("\u65E0\u6548\u7684\u914D\u7F6E\u6587\u4EF6");
            draft = mergeImportedSettings(draft, imported);
            closePanel();
            openSettingsPanel({ getSettings: () => draft, setSettings, onSave });
          } catch (error) {
            console.error("\u5BFC\u5165\u8BBE\u7F6E\u65F6\u51FA\u9519:", error);
            showPrompt("\u5BFC\u5165\u5931\u8D25: \u6587\u4EF6\u683C\u5F0F\u9519\u8BEF");
          }
        });
        input.click();
      }, "bbt-secondary-button")
    );
    buttons.appendChild(makeButton("\u4F5C\u8005", () => window.open("https://space.bilibili.com/351422438", "_blank"), "bbt-ghost-button"));
    buttons.appendChild(makeButton("\u8D5E\u52A9", () => window.open("https://afdian.com/a/tjxgame", "_blank"), "bbt-ghost-button"));
    panel.appendChild(buttons);
    panel.appendChild(prompt);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }
  function installFloatingConfigButton(openPanel) {
    if (document.querySelector(".bbt-floating-config")) return;
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = "bbt-floating-config";
    button2.textContent = "\u811A\u672C\u914D\u7F6E";
    button2.addEventListener("click", openPanel);
    document.body.appendChild(button2);
  }

  // src/styles.js
  var BASE_CSS = `
:root {
  --bbt-ui-bg: #17191f;
  --bbt-ui-panel: #23262d;
  --bbt-ui-panel-2: #2d313a;
  --bbt-ui-input: #111318;
  --bbt-ui-border: rgba(255, 255, 255, 0.09);
  --bbt-ui-text: #f6f7fb;
  --bbt-ui-muted: #a9b0bd;
  --bbt-ui-button: #2f73ff;
  --bbt-ui-button-hover: #4b86ff;
  --bbt-ui-warm: #f3b455;
  --bbt-ui-danger: #c33b3b;
  --bbt-ui-danger-hover: #dc4d4d;
  --bbt-ui-success: #20a66b;
  --bbt-ui-error: #e05858;
  --bbt-ui-focus: rgba(76, 125, 255, 0.38);
  --bbt-overlay: rgba(36, 36, 36, 0.86);
}

#blockedMenuUi,
#blockedMenuUi * {
  box-sizing: border-box;
}

.bbt-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999998;
  background: rgba(0, 0, 0, 0.5);
  animation: bbt-fade-in 150ms ease-out;
}

#blockedMenuUi {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999999;
  width: min(760px, calc(100vw - 24px));
  max-height: min(820px, calc(100vh - 24px));
  overflow: auto;
  padding: 0;
  border: 1px solid var(--bbt-ui-border);
  border-radius: 8px;
  background:
    radial-gradient(circle at top left, rgba(243, 180, 85, 0.1), transparent 30%),
    var(--bbt-ui-bg);
  color: var(--bbt-ui-text);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.46);
  font-size: 14px;
  line-height: 1.45;
  animation: bbt-modal-in 170ms ease-out;
}

#blockedMenuUi .bbt-menu-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin: 0;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--bbt-ui-border);
  background: rgba(23, 25, 31, 0.96);
  backdrop-filter: blur(10px);
}

#blockedMenuUi .bbt-menu-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

#blockedMenuUi .bbt-menu-subtitle {
  margin-top: 4px;
  color: var(--bbt-ui-muted);
  font-size: 13px;
}

#blockedMenuUi .bbt-option-group {
  margin: 14px;
  padding: 14px;
  border: 1px solid var(--bbt-ui-border);
  border-radius: 8px;
  background: rgba(35, 38, 45, 0.74);
}

#blockedMenuUi .bbt-option-group-header {
  display: grid;
  gap: 3px;
  margin-bottom: 10px;
}

#blockedMenuUi .bbt-option-group h3 {
  margin: 0;
  color: #ffffff;
  font-size: 15px;
  line-height: 1.3;
}

#blockedMenuUi .bbt-option-group p {
  margin: 0;
  color: var(--bbt-ui-muted);
  font-size: 12px;
  line-height: 1.45;
}

#blockedMenuUi .bbt-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, auto);
  gap: 12px;
  align-items: start;
  padding: 13px 0;
  margin: 0;
  border-radius: 6px;
  background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

#blockedMenuUi .bbt-option:first-of-type {
  border-top: 0;
}

#blockedMenuUi .bbt-option-list {
  grid-template-columns: 1fr;
}

#blockedMenuUi .bbt-option-main {
  min-width: 0;
}

#blockedMenuUi .bbt-option-label {
  color: #fbfcff;
  font-weight: 700;
}

#blockedMenuUi .bbt-option-hint {
  margin: 4px 0 0 42px;
  color: var(--bbt-ui-muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

#blockedMenuUi .bbt-option-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

#blockedMenuUi .bbt-option-list .bbt-option-controls {
  justify-content: stretch;
}

#blockedMenuUi label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

#blockedMenuUi input,
#blockedMenuUi button {
  font: inherit;
}

#blockedMenuUi input[type="text"],
#blockedMenuUi input[type="number"] {
  min-width: 0;
  min-height: 36px;
  padding: 8px 10px;
  border: 1px solid var(--bbt-ui-border);
  border-radius: 6px;
  background: var(--bbt-ui-input);
  color: var(--bbt-ui-text);
}

#blockedMenuUi input[type="text"]:focus,
#blockedMenuUi input[type="number"]:focus {
  outline: 3px solid var(--bbt-ui-focus);
  border-color: rgba(102, 143, 255, 0.42);
}

#blockedMenuUi .bbt-switch {
  flex: 0 0 auto;
  width: 34px;
  height: 20px;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  appearance: none;
  background: #3a3e48;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

#blockedMenuUi .bbt-switch::before {
  content: "";
  display: block;
  width: 14px;
  height: 14px;
  margin: 2px;
  border-radius: 999px;
  background: #ffffff;
  transition: transform 160ms ease;
}

#blockedMenuUi .bbt-switch:checked {
  border-color: transparent;
  background: var(--bbt-ui-success);
}

#blockedMenuUi .bbt-switch:checked::before {
  transform: translateX(14px);
}

#blockedMenuUi .bbt-switch:focus-visible {
  outline: 3px solid var(--bbt-ui-focus);
  outline-offset: 2px;
}

#blockedMenuUi .bbt-regex-toggle {
  min-height: 32px;
  padding: 5px 9px 5px 7px;
  border: 1px solid var(--bbt-ui-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #dce4f1;
  font-size: 12px;
  font-weight: 700;
}

#blockedMenuUi .bbt-regex-toggle .bbt-switch {
  width: 28px;
  height: 16px;
}

#blockedMenuUi .bbt-regex-toggle .bbt-switch::before {
  width: 10px;
  height: 10px;
}

#blockedMenuUi .bbt-regex-toggle .bbt-switch:checked::before {
  transform: translateX(12px);
}

#blockedMenuUi .bbt-number-field {
  display: grid;
  grid-template-columns: minmax(96px, 132px) auto;
  align-items: center;
  gap: 8px;
  color: var(--bbt-ui-muted);
  font-weight: 700;
}

#blockedMenuUi .bbt-list-row {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

#blockedMenuUi ul {
  width: 100%;
  max-height: 120px;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

#blockedMenuUi li {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 6px;
  margin: 0;
  padding: 6px 7px 6px 10px;
  border: 1px solid var(--bbt-ui-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #edf2ff;
  font-size: 12px;
}

#blockedMenuUi li span {
  min-width: 0;
  overflow-wrap: anywhere;
}

#blockedMenuUi button,
.bbt-floating-config,
.bbt-card-action,
.bbt-modal button {
  border: 0;
  border-radius: 6px;
  background: var(--bbt-ui-button);
  color: #fff;
  cursor: pointer;
  transition:
    transform 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease,
    opacity 140ms ease;
}

#blockedMenuUi button:hover,
.bbt-floating-config:hover,
.bbt-card-action:hover,
.bbt-modal button:hover {
  background: var(--bbt-ui-button-hover);
  box-shadow: 0 8px 18px rgba(76, 125, 255, 0.22);
}

#blockedMenuUi button:active,
.bbt-floating-config:active,
.bbt-card-action:active,
.bbt-modal button:active {
  transform: translateY(1px) scale(0.98);
}

#blockedMenuUi button:focus-visible,
.bbt-floating-config:focus-visible,
.bbt-card-action:focus-visible,
.bbt-modal button:focus-visible {
  outline: 3px solid var(--bbt-ui-focus);
  outline-offset: 2px;
}

#blockedMenuUi button {
  min-height: 34px;
  padding: 7px 11px;
  font-weight: 700;
}

#blockedMenuUi .bbt-primary-button {
  background: var(--bbt-ui-success);
}

#blockedMenuUi .bbt-primary-button:hover {
  background: #26b877;
  box-shadow: 0 8px 18px rgba(32, 166, 107, 0.24);
}

#blockedMenuUi .bbt-secondary-button,
#blockedMenuUi .bbt-ghost-button {
  border: 1px solid var(--bbt-ui-border);
  background: var(--bbt-ui-panel-2);
  color: #edf2ff;
}

#blockedMenuUi .bbt-secondary-button:hover,
#blockedMenuUi .bbt-ghost-button:hover {
  background: #3a404b;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}

#blockedMenuUi .bbt-ghost-button {
  color: var(--bbt-ui-muted);
}

#blockedMenuUi .bbt-chip-remove {
  width: 20px;
  min-width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #cfd6e2;
  font-size: 12px;
  line-height: 1;
}

#blockedMenuUi .bbt-chip-remove:hover {
  background: var(--bbt-ui-danger);
  box-shadow: none;
}

#blockedMenuUi .bbt-menu-buttons {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--bbt-ui-border);
  background: rgba(23, 25, 31, 0.96);
  backdrop-filter: blur(10px);
}

#blockedMenuPrompt {
  position: absolute;
  right: 18px;
  bottom: 18px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #111;
  transition: opacity 180ms ease;
}

.bbt-floating-config {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 999900;
  padding: 9px 14px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.26);
}

.bbt-card-action {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 20;
  min-width: 46px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(31, 35, 42, 0.9);
  color: #f7faff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
  opacity: 0.72;
  backdrop-filter: blur(6px);
}

.bbt-card-action:hover,
.bbt-card-action:focus-visible {
  opacity: 1;
  background: #4c7dff;
  transform: translateY(-1px);
}

.blockedOverlay {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  border-radius: 6px;
  background: var(--bbt-overlay);
  color: #fff;
  backdrop-filter: blur(6px);
}

.blockedOverlayText {
  max-width: calc(100% - 72px);
  padding: 8px;
  text-align: center;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.blockedOverlay-undo-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 11;
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  cursor: pointer;
}

.bbt-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999998;
  background: rgba(0, 0, 0, 0.54);
  animation: bbt-fade-in 150ms ease-out;
}

.bbt-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999999;
  width: min(860px, calc(100vw - 28px));
  max-height: min(820px, calc(100vh - 28px));
  overflow: auto;
  padding: 22px;
  border-radius: 8px;
  background: var(--bbt-ui-bg);
  color: #fff;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.46);
  animation: bbt-modal-in 170ms ease-out;
}

.bbt-modal-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.bbt-modal h3 {
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.25;
}

.bbt-video-title {
  max-width: 100%;
  color: #f5f7fb;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.bbt-video-meta {
  margin-top: 4px;
  color: var(--bbt-ui-muted);
  font-size: 12px;
}

.bbt-modal-close {
  width: 34px;
  height: 34px;
  padding: 0 !important;
  border-radius: 999px !important;
  background: #3a3d44 !important;
  font-size: 0;
}

.bbt-modal-close::before {
  content: "x";
  font-size: 18px;
  line-height: 1;
}

.bbt-modal h4 {
  margin: 0 0 12px;
  color: #f7f8fb;
  font-size: 16px;
  line-height: 1.35;
}

.bbt-modal section {
  margin-top: 16px;
  padding: 16px;
  border-radius: 6px;
  background: var(--bbt-ui-panel);
}

.bbt-inline-info {
  margin-bottom: 12px;
  color: #f5f7fb;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.bbt-modal section > .bbt-action-button {
  margin-top: 12px;
}

.bbt-button-row,
.bbt-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.bbt-modal button {
  min-height: 38px;
  padding: 9px 14px;
  font-weight: 700;
  line-height: 1.2;
}

.bbt-modal button.bbt-danger {
  background: var(--bbt-ui-danger);
}

.bbt-modal button.bbt-danger:hover {
  background: var(--bbt-ui-danger-hover);
  box-shadow: 0 8px 18px rgba(195, 59, 59, 0.22);
}

.bbt-action-button {
  position: relative;
}

.bbt-action-button:disabled {
  cursor: default;
  opacity: 0.92;
}

.bbt-state-loading {
  padding-left: 34px !important;
  background: #657184 !important;
}

.bbt-state-loading::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: bbt-spin 720ms linear infinite;
}

.bbt-state-success {
  background: var(--bbt-ui-success) !important;
  box-shadow: 0 8px 18px rgba(32, 166, 107, 0.24) !important;
}

.bbt-state-error {
  background: var(--bbt-ui-error) !important;
  box-shadow: 0 8px 18px rgba(224, 88, 88, 0.22) !important;
}

.bbt-chip-row .bbt-action-button {
  min-height: 34px;
  padding: 7px 11px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--bbt-ui-panel-2);
  color: #eef3ff;
  font-weight: 650;
}

.bbt-chip-active {
  background: var(--bbt-ui-success) !important;
  border-color: transparent !important;
}

@keyframes bbt-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bbt-modal-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 10px)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes bbt-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  #blockedMenuUi {
    width: calc(100vw - 16px);
  }

  #blockedMenuUi .bbt-menu-header {
    padding: 16px;
  }

  #blockedMenuUi .bbt-option-group {
    margin: 10px;
    padding: 12px;
  }

  #blockedMenuUi .bbt-option {
    grid-template-columns: 1fr;
  }

  #blockedMenuUi .bbt-option-hint {
    margin-left: 0;
  }

  #blockedMenuUi .bbt-option-controls {
    justify-content: stretch;
  }

  #blockedMenuUi .bbt-list-row {
    grid-template-columns: 1fr;
    width: 100%;
  }

  #blockedMenuUi .bbt-number-field {
    grid-template-columns: minmax(0, 1fr) auto;
    width: 100%;
  }

  #blockedMenuUi .bbt-menu-buttons {
    padding: 14px 16px 16px;
  }

  .bbt-modal {
    padding: 16px;
  }

  .bbt-modal-header {
    gap: 10px;
  }

  .bbt-button-row,
  .bbt-chip-row {
    gap: 8px;
  }

  .bbt-modal button {
    min-height: 36px;
    padding: 8px 11px;
  }
}

.hideAD {
  display: none !important;
}
`;
  function installStyles(addStyle = globalThis.GM_addStyle) {
    if (typeof addStyle === "function") {
      addStyle(BASE_CSS);
      return;
    }
    const style = document.createElement("style");
    style.textContent = BASE_CSS;
    document.head.appendChild(style);
  }

  // src/main.js
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }
  function hookHistory(onChange) {
    if (window.__bbtHistoryHooked) return;
    window.__bbtHistoryHooked = true;
    const wrap = (name) => {
      const original = history[name];
      history[name] = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event("bbt:urlchange"));
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", () => window.dispatchEvent(new Event("bbt:urlchange")));
    window.addEventListener("bbt:urlchange", onChange);
  }
  function bootstrap() {
    installStyles();
    installPageSpecificStyles();
    let settings = loadSettings();
    let quickActionState = loadQuickActionState();
    const getSettings = () => settings;
    const setSettings = (next) => {
      settings = saveSettings(next);
      return settings;
    };
    const getQuickActionState2 = () => quickActionState;
    const setQuickActionState = (next) => {
      quickActionState = saveQuickActionState(next);
      return quickActionState;
    };
    const api = new ApiClient();
    const scanner = new Scanner({ api, getSettings, logger: console });
    const quickActions = createQuickActions({
      api,
      scanner,
      getSettings,
      setSettings,
      getQuickActionState: getQuickActionState2,
      setQuickActionState
    });
    const runAll = (delay = 0) => {
      scanner.schedule(delay);
      setTimeout(() => quickActions.scan(), delay);
    };
    const openPanel = () => openSettingsPanel({
      getSettings,
      setSettings,
      onSave: () => runAll(0)
    });
    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand("\u5C4F\u853D\u53C2\u6570\u9762\u677F", openPanel);
    }
    installFloatingConfigButton(openPanel);
    let mutationTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(() => runAll(0), 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", () => runAll(0));
    window.addEventListener("resize", () => runAll(100));
    hookHistory(() => runAll(100));
    runAll(0);
  }
  onReady(bootstrap);
})();
