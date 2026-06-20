import { getHideTarget } from "./dom.js";

export function getOverlayText(result, settings) {
  if (!result?.blocked) return "";
  return settings.blockedOverlayOnlyDisplaysType_Switch ? result.type : `${result.type}: ${result.item}`;
}

export function applyBlockedState(card, result, settings) {
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
    undo.textContent = "撤销";
    undo.title = "临时显示此视频（移除覆盖层）";
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

export function removeBlockedState(card) {
  if (!card) return;
  delete card.dataset.bbtBlocked;
  delete card.dataset.bbtTemporaryVisible;
  card.style.display = "";
  const hideTarget = getHideTarget(card);
  if (hideTarget) hideTarget.style.display = "";
  card.querySelector(":scope > .blockedOverlay")?.remove();
}

export function syncOverlaySize(overlay) {
  if (!overlay?.parentElement) return;
  const rect = overlay.parentElement.getBoundingClientRect();
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

export function syncAllOverlays(root = document) {
  root.querySelectorAll(".blockedOverlay").forEach(syncOverlaySize);
}

export function addTemporaryUpOverlay(card, title = "已屏蔽此UP主") {
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
  undo.textContent = "撤销（临时查看）";
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
