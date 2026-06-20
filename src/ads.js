import { matchTextList } from "./rules.js";

export function hideNonVideoElements(settings, root = document) {
  if (!settings.hideNonVideoElements_Switch) return;

  if (location.href.startsWith("https://www.bilibili.com/")) {
    root
      .querySelectorAll(
        `
        div.floor-single-card,
        div.feed-card:has(a[href^="//cm.bilibili.com/"]),
        div.bili-feed-card:has(a[href^="//cm.bilibili.com/"]),
        div.bili-feed-card:has(a[href^="https://live.bilibili.com/"])
      `,
      )
      .forEach((element) => element.classList.add("hideAD"));
  }

  if (location.href.startsWith("https://search.bilibili.com/all")) {
    root
      .querySelectorAll(
        `
        div.bili-video-card:has(a[href^="https://www.bilibili.com/cheese/"]),
        div.bili-video-card:has(a[href^="//cm.bilibili.com/"]),
        div.bili-video-card:has(a[href^="//live.bilibili.com/"])
      `,
      )
      .forEach((element) => (element.parentElement || element).classList.add("hideAD"));
  }

  if (location.href.startsWith("https://www.bilibili.com/video/")) {
    root
      .querySelectorAll(
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
      `,
      )
      .forEach((element) => element.classList.add("hideAD"));
  }

  if (location.hostname === "t.bilibili.com") {
    root.querySelectorAll(".bili-dyn-ads").forEach((element) => element.classList.add("hideAD"));
  }
}

export function handleTrending(settings, root = document) {
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
    undo.textContent = "撤销";
    undo.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      overlay.remove();
    });
    overlay.appendChild(undo);
    item.insertAdjacentElement("afterbegin", overlay);
  });
}

export function installPageSpecificStyles(root = document) {
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
