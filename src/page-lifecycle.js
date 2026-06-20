export const VIDEO_DETAIL_STARTUP_DELAY = 1200;

export function isVideoDetailPage(url = globalThis.location?.href || "") {
  return /^https:\/\/www\.bilibili\.com\/video\/(?:BV[0-9A-Za-z]+|av[0-9]+)/.test(String(url));
}

export function getScanRoot(root = document, url = globalThis.location?.href || "") {
  if (!isVideoDetailPage(url)) return root;
  return root.querySelector(".right-container") || root.querySelector(".right-container-inner") || null;
}

export function getStartupDelay(url = globalThis.location?.href || "") {
  return isVideoDetailPage(url) ? VIDEO_DETAIL_STARTUP_DELAY : 0;
}
