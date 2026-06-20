import { extractBvFromHref } from "./bv.js";

export const VIDEO_CARD_SELECTOR = [
  "div.bili-video-card",
  "div.video-page-card-small",
  "li.bili-rank-list-video__item",
  ".video-item",
  "div.video-card",
  "li.rank-item",
  "div.video-card-reco",
  "div.video-card-common",
  "div.rank-wrap",
].join(",");

export const NO_BLOCK_URL_RULES = [
  /^https:\/\/www\.bilibili\.com\/anime\//,
  /^https:\/\/live\.bilibili\.com\//,
  /^https:\/\/account\.bilibili\.com\//,
  /^https:\/\/message\.bilibili\.com\//,
  /^https:\/\/t\.bilibili\.com\//,
  /^https:\/\/space\.bilibili\.com\/[0-9]+/,
  /^https:\/\/www\.bilibili\.com\/history/,
  /^https:\/\/link\.bilibili\.com\//,
];

export function shouldSkipVideoBlocking(url = globalThis.location?.href || "") {
  return NO_BLOCK_URL_RULES.some((rule) => rule.test(url));
}

export function uniqueElements(elements) {
  return Array.from(new Set(Array.from(elements).filter(Boolean)));
}

export function getVideoCards(root = document) {
  const directCards = Array.from(root.querySelectorAll(VIDEO_CARD_SELECTOR)).filter((card) =>
    card.querySelector("a[href]"),
  );
  const anchorCards = findCandidateCards(root);
  return uniqueElements(directCards.concat(anchorCards)).filter((card) => {
    if (card.classList?.value === "bili-video-card is-rcmd" && !document.querySelector("div.recommend-container__2-line")) {
      return false;
    }
    return true;
  });
}

export function findCandidateCards(root = document) {
  const anchors = Array.from(root.querySelectorAll("a[href]"));
  const cards = new Set();

  for (const anchor of anchors) {
    if (!extractBvFromHref(anchor.href)) continue;

    let card = anchor.closest(VIDEO_CARD_SELECTOR);
    if (!card) {
      let node = anchor;
      for (let i = 0; i < 6 && node; i += 1, node = node.parentElement) {
        if (
          node.querySelector?.("img") ||
          node.querySelector?.("h3") ||
          node.querySelector?.(".title") ||
          node.querySelector?.(".info")
        ) {
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

export function readCardInfo(card) {
  const links = Array.from(card.querySelectorAll("a[href]"));
  const videoLink = links.find((link) => extractBvFromHref(link.href));
  const bv = videoLink ? extractBvFromHref(videoLink.href) : "";
  if (!bv) return null;

  const upLink = links.find((link) => /space\.bilibili\.com\/(\d+)/.test(link.href));
  const upUid = upLink?.href.match(/space\.bilibili\.com\/(\d+)/)?.[1] || "";
  const upName =
    upLink?.querySelector("span")?.textContent?.trim() ||
    upLink?.textContent?.trim() ||
    "";

  return {
    bv,
    link: videoLink.href,
    title: readTitle(card),
    upUid,
    upName,
  };
}

export function readTitle(card) {
  return (
    card.querySelector("[title]:not(span)")?.title?.trim() ||
    card.querySelector(".bili-video-card__info--tit")?.textContent?.trim() ||
    card.querySelector(".title")?.textContent?.trim() ||
    card.querySelector("h3")?.textContent?.trim() ||
    ""
  );
}

export function getHideTarget(card) {
  return (
    card.closest("div.feed-card") ||
    card.closest("div.bili-feed-card") ||
    (location.href.startsWith("https://search.bilibili.com/") ? card.parentElement : null) ||
    card
  );
}

export function findCardsByUpUid(upUid, videoStore, root = document) {
  return getVideoCards(root).filter((card) => {
    const info = readCardInfo(card);
    if (!info) return false;
    const stored = videoStore.get(info.bv);
    return stored?.upUid && String(stored.upUid) === String(upUid);
  });
}
