import { ApiClient } from "./api.js";
import { installPageSpecificStyles } from "./ads.js";
import { loadSettings, saveSettings } from "./config.js";
import { getScanRoot, getStartupDelay } from "./page-lifecycle.js";
import { loadQuickActionState, saveQuickActionState } from "./quick-action-state.js";
import { createQuickActions } from "./quick-actions.js";
import { Scanner } from "./scanner.js";
import { installFloatingConfigButton, openSettingsPanel } from "./settings-panel.js";
import { installStyles } from "./styles.js";

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
  const getQuickActionState = () => quickActionState;
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
    getQuickActionState,
    setQuickActionState,
  });

  const resolveScanRoot = () => getScanRoot(document, location.href);
  const runAll = (delay = 0) => {
    scanner.schedule(delay, resolveScanRoot);
    setTimeout(() => {
      const root = resolveScanRoot();
      if (root) quickActions.scan(root);
    }, delay);
  };

  const openPanel = () =>
    openSettingsPanel({
      getSettings,
      setSettings,
      onSave: () => runAll(0),
    });

  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("屏蔽参数面板", openPanel);
  }
  installFloatingConfigButton(openPanel);

  let mutationTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => runAll(getStartupDelay(location.href)), 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const runAfterStartupDelay = () => runAll(getStartupDelay(location.href));

  window.addEventListener("load", runAfterStartupDelay);
  window.addEventListener("resize", () => runAll(100));
  hookHistory(() => runAll(getStartupDelay(location.href) || 100));
  runAfterStartupDelay();
}

onReady(bootstrap);
