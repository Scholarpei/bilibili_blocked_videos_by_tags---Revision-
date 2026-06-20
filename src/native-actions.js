export const NATIVE_CARD_ACTION = Object.freeze({
  DISLIKE_VIDEO: "dislikeVideo",
  NO_MORE_UP: "noMoreUp",
});

const TRIGGER_SELECTOR = [
  ".bili-video-card__info--no-interest",
  ".bili-video-card__info--more",
  ".bili-video-card__info--operate",
  ".bili-video-card__info--right",
  ".vui_dropdown",
  ".v-popover",
  "[aria-label='更多']",
  "[title='更多']",
  "[role='button']",
  "button",
].join(",");

const MENU_ITEM_SELECTOR = [
  "button",
  "[role='button']",
  "[role='menuitem']",
  ".vui_dropdown-item",
  ".v-popover-content *",
  ".bili-video-card__info--no-interest-panel *",
  ".bili-video-card__no-interest *",
].join(",");

const ACTION_LABELS = Object.freeze({
  [NATIVE_CARD_ACTION.DISLIKE_VIDEO]: [/^内容不感兴趣$/, /^不感兴趣$/, /减少此类内容推荐/],
  [NATIVE_CARD_ACTION.NO_MORE_UP]: [/不想看此\s*UP\s*主/i, /不看此\s*UP\s*主/i, /减少此\s*UP\s*主/i],
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

export async function runNativeCardAction(card, action, { root, waitMs = 1200, pollIntervalMs = 80 } = {}) {
  const searchRoot = getRoot(card, root);
  if (!card || !searchRoot) {
    return { ok: false, reason: "unsupported", message: "当前页面不支持" };
  }

  const existingItem = findMenuItem(searchRoot, card, action);
  if (existingItem) {
    clickLikeUser(existingItem);
    return { ok: true, source: "native-menu" };
  }

  const trigger = findNativeTrigger(card);
  if (!trigger) {
    return { ok: false, reason: "unsupported", message: "当前页面不支持" };
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

  return { ok: false, reason: "unsupported", message: "当前页面不支持" };
}
