import { normalizeSettings } from "./config.js";
import { runInBackground } from "./background-action.js";
import { findCardsByUpUid, getVideoCards, readCardInfo } from "./dom.js";
import { NATIVE_CARD_ACTION, runNativeCardAction } from "./native-actions.js";
import { addTemporaryUpOverlay } from "./overlay.js";
import {
  getQuickActionState,
  markQuickActionState,
  normalizeQuickActionState,
} from "./quick-action-state.js";
import { ACTION_STATE, getActionStateView } from "./ui-state.js";

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
  const block = document.createElement("section");
  const heading = document.createElement("h4");
  heading.textContent = title;
  block.appendChild(heading);
  return block;
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

export function createQuickActions({
  api,
  scanner,
  getSettings,
  setSettings,
  getQuickActionState: readQuickActionState = () => ({}),
  setQuickActionState: writeQuickActionState = () => {},
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
      addTemporaryUpOverlay(card, "已屏蔽此UP主");
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
    title.textContent = "快速屏蔽";
    titleGroup.appendChild(title);

    const videoTitle = document.createElement("div");
    videoTitle.className = "bbt-video-title";
    videoTitle.textContent = video.title || base.title || "(未知标题)";
    titleGroup.appendChild(videoTitle);

    const meta = document.createElement("div");
    meta.className = "bbt-video-meta";
    meta.textContent = `BV: ${base.bv}`;
    titleGroup.appendChild(meta);

    header.appendChild(titleGroup);
    header.appendChild(button("关闭", close, "bbt-modal-close", "关闭"));
    modal.appendChild(header);

    const feedback = section("内容反馈");
    const feedbackRow = document.createElement("div");
    feedbackRow.className = "bbt-button-row";
    const dislikeButton = actionButton(storedAction.disliked ? "已反馈" : "内容不感兴趣", async (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        try {
          const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.DISLIKE_VIDEO);
          if (!result.ok) throw new Error(result.message || "当前页面不支持");
          card.style.display = "none";
          persistAction("disliked");
          setPersistedSuccess(event.currentTarget, "已反馈");
        } catch (error) {
          console.error("内容不感兴趣原生操作失败:", error);
          setActionState(event.currentTarget, ACTION_STATE.ERROR, error.message || "失败");
        }
      });
    if (storedAction.disliked) setPersistedSuccess(dislikeButton, "已反馈");
    feedbackRow.appendChild(dislikeButton);

    const blockUpButton = actionButton(storedAction.blockedUp ? "已屏蔽UP主" : "不想看此UP主", async (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        const uid = video.upUid || base.upUid;
        const applyLocalBlock = (label = "已本地屏蔽UP") => {
          const next = normalizeSettings(getSettings());
          addUnique(next, "blockedNameOrUid_Array", uid);
          persist(next);
          hideUpVideos(uid);
          persistAction("blockedUp");
          setPersistedSuccess(event.currentTarget, label);
        };
        try {
          const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.NO_MORE_UP);
          if (!result.ok) throw new Error(result.message || "仅首页推荐支持");
          card.style.display = "none";
          persistAction("blockedUp");
          setPersistedSuccess(event.currentTarget, "已不再推荐此UP");
        } catch (error) {
          console.error("不想看此UP主原生操作失败:", error);
          if (uid) {
            applyLocalBlock();
            return;
          }
          setActionState(event.currentTarget, ACTION_STATE.ERROR, error.message || "缺少UID");
        }
      });
    if (storedAction.blockedUp) setPersistedSuccess(blockUpButton, "已不再推荐此UP");
    feedbackRow.appendChild(blockUpButton);

    const blacklistButton = actionButton(storedAction.blacklisted ? "已拉黑" : "拉黑此UP主", async (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        const uid = video.upUid || base.upUid;
        if (!uid) {
          setActionState(event.currentTarget, ACTION_STATE.ERROR, "缺少UID");
          return;
        }
        if (typeof api.csrfProvider === "function" && !api.csrfProvider()) {
          setActionState(event.currentTarget, ACTION_STATE.ERROR, "缺少 csrf");
          return;
        }
        try {
          const request = api.blockUp(uid);
          persistAction("blacklisted");
          setPersistedSuccess(event.currentTarget, "已拉黑");
          runInBackground(request, (error) => {
            console.error("拉黑接口后台错误:", error);
          });
        } catch (error) {
          console.error("拉黑接口错误:", error);
          setActionState(event.currentTarget, ACTION_STATE.ERROR, error.message || "失败");
        }
      }, "bbt-danger");
    if (storedAction.blacklisted) setPersistedSuccess(blacklistButton, "已拉黑");
    feedbackRow.appendChild(blacklistButton);
    feedback.appendChild(feedbackRow);
    modal.appendChild(feedback);

    const upUid = video.upUid || base.upUid;
    const upName = video.upName || base.upName;
    if (upUid || upName) {
      const upSection = section("UP主屏蔽");
      const info = document.createElement("div");
      info.className = "bbt-inline-info";
      info.textContent = `${upName || "未知UP主"}${upUid ? ` (UID: ${upUid})` : ""}`;
      upSection.appendChild(info);
      upSection.appendChild(
        actionButton(settings.blockedNameOrUid_Array.includes(upUid) ? "已屏蔽此UP主" : "屏蔽此UP主", (event) => {
          const next = normalizeSettings(getSettings());
          const enabled = toggleListValue(next, "blockedNameOrUid_Array", upUid || upName);
          persist(next);
          event.currentTarget.dataset.idleLabel = enabled ? "已屏蔽此UP主" : "屏蔽此UP主";
          setActionState(event.currentTarget, ACTION_STATE.SUCCESS, enabled ? "已加入" : "已移除");
        }),
      );
      modal.appendChild(upSection);
    }

    if (video.partition) {
      const partition = section("视频分区");
      partition.appendChild(
        actionButton(settings.blockedVideoPartitions_Array.includes(video.partition) ? `已屏蔽：${video.partition}` : `屏蔽：${video.partition}`, (event) => {
          const next = normalizeSettings(getSettings());
          const enabled = toggleListValue(next, "blockedVideoPartitions_Array", video.partition);
          persist(next);
          event.currentTarget.dataset.idleLabel = enabled ? `已屏蔽：${video.partition}` : `屏蔽：${video.partition}`;
          setActionState(event.currentTarget, ACTION_STATE.SUCCESS, enabled ? "已加入" : "已移除");
        }),
      );
      modal.appendChild(partition);
    }

    const tags = Array.isArray(video.tags) ? video.tags : [];
    const tagsSection = section("视频标签");
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
      actionButton("一键全部添加标签", (event) => {
        setActionState(event.currentTarget, ACTION_STATE.LOADING);
        const next = normalizeSettings(getSettings());
        tags.forEach((tag) => addUnique(next, "blockedTag_Array", tag));
        persist(next);
        tagRow.querySelectorAll("button").forEach((tagButton) => tagButton.classList.add("bbt-chip-active"));
        setActionState(event.currentTarget, ACTION_STATE.SUCCESS, "已全部添加");
      }),
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
    action.textContent = "屏蔽";
    action.title = "打开快速屏蔽面板";
    action.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showPanel(card).catch((error) => {
        console.error("快速屏蔽面板打开失败:", error);
      });
    });
    card.appendChild(action);
  };

  return {
    scan(root = document) {
      getVideoCards(root).forEach(injectButton);
    },
    hideUpVideos,
  };
}
