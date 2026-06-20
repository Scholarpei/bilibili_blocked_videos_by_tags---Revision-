export const BASE_CSS = `
:root {
  --bbt-ui-bg: #202124;
  --bbt-ui-panel: #2a2c31;
  --bbt-ui-panel-2: #32353b;
  --bbt-ui-input: #3b3f46;
  --bbt-ui-text: #fff;
  --bbt-ui-muted: #b8c0cc;
  --bbt-ui-button: #4c7dff;
  --bbt-ui-button-hover: #668fff;
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
  width: min(940px, calc(100vw - 28px));
  max-height: min(860px, calc(100vh - 24px));
  overflow: auto;
  padding: 22px;
  border-radius: 8px;
  background: var(--bbt-ui-bg);
  color: var(--bbt-ui-text);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.46);
  font-size: 14px;
  animation: bbt-modal-in 170ms ease-out;
}

#blockedMenuUi .bbt-menu-header {
  position: sticky;
  top: -22px;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  margin: -22px -22px 16px;
  padding: 22px 22px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(32, 33, 36, 0.96);
  backdrop-filter: blur(10px);
}

#blockedMenuUi .bbt-menu-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

#blockedMenuUi .bbt-option {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(112px, auto) auto;
  gap: 10px;
  align-items: center;
  padding: 13px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: var(--bbt-ui-panel);
  border: 1px solid rgba(255, 255, 255, 0.045);
}

#blockedMenuUi label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

#blockedMenuUi input,
#blockedMenuUi button {
  font: inherit;
}

#blockedMenuUi input[type="text"],
#blockedMenuUi input[type="number"] {
  min-width: 0;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  background: var(--bbt-ui-input);
  color: var(--bbt-ui-text);
}

#blockedMenuUi input[type="text"]:focus,
#blockedMenuUi input[type="number"]:focus {
  outline: 3px solid var(--bbt-ui-focus);
  border-color: rgba(102, 143, 255, 0.42);
}

#blockedMenuUi .bbt-list-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

#blockedMenuUi ul {
  grid-column: 1 / -1;
  max-height: 120px;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

#blockedMenuUi li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  padding: 7px 9px;
  border-radius: 4px;
  background: var(--bbt-ui-input);
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

#blockedMenuUi .bbt-menu-buttons {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 14px -22px -22px;
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(32, 33, 36, 0.96);
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
    padding: 16px;
  }

  #blockedMenuUi .bbt-menu-header {
    top: -16px;
    margin: -16px -16px 14px;
    padding: 16px;
  }

  #blockedMenuUi .bbt-option {
    grid-template-columns: 1fr;
  }

  #blockedMenuUi .bbt-menu-buttons {
    margin: 14px -16px -16px;
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

export function installStyles(addStyle = globalThis.GM_addStyle) {
  if (typeof addStyle === "function") {
    addStyle(BASE_CSS);
    return;
  }
  const style = document.createElement("style");
  style.textContent = BASE_CSS;
  document.head.appendChild(style);
}
