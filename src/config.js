export const STORAGE_KEY = "GM_blockedParameter";

export const DEFAULT_SETTINGS = Object.freeze({
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

  consoleOutputLog_Switch: false,
});

const ARRAY_KEYS = new Set(
  Object.keys(DEFAULT_SETTINGS).filter((key) => key.endsWith("_Array")),
);

const NUMBER_KEYS = new Set([
  "blockedBelowVideoFavorite",
  "blockedShortDuration",
  "blockedBelowVideoViews",
  "blockedBelowLikesRate",
  "blockedBelowCoinRate",
  "blockedAboveFavoriteCoinRatio",
  "blockedBelowUpLevel",
  "blockedBelowUpFans",
  "blockedAboveUpAttention",
]);

export function clone(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

export function normalizeSettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const settings = clone(DEFAULT_SETTINGS);

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = source[key];

    if (ARRAY_KEYS.has(key)) {
      settings[key] = Array.isArray(value)
        ? value.map((item) => String(item).trim()).filter(Boolean)
        : [];
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

export function loadSettings(getValue = globalThis.GM_getValue) {
  const stored = typeof getValue === "function" ? getValue(STORAGE_KEY, DEFAULT_SETTINGS) : DEFAULT_SETTINGS;
  return normalizeSettings(stored);
}

export function saveSettings(settings, setValue = globalThis.GM_setValue) {
  const normalized = normalizeSettings(settings);
  if (typeof setValue === "function") {
    setValue(STORAGE_KEY, normalized);
  }
  return normalized;
}

export function splitInputList(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function addListItems(settings, keyName, rawInput) {
  if (!ARRAY_KEYS.has(keyName)) {
    throw new Error(`Unknown list setting: ${keyName}`);
  }

  const current = Array.isArray(settings[keyName]) ? settings[keyName] : [];
  const items = splitInputList(rawInput);
  const normalizedItems =
    keyName === "doubleBlockedTag_Array"
      ? items
          .map((item) => item.split("|").map((part) => part.trim()))
          .filter((parts) => parts.length === 2 && parts.every(Boolean))
          .map((parts) => parts.join("|"))
      : items;

  settings[keyName] = current.concat(normalizedItems);
  return settings[keyName];
}

export function removeListItem(settings, keyName, index) {
  if (!ARRAY_KEYS.has(keyName)) {
    throw new Error(`Unknown list setting: ${keyName}`);
  }

  const current = Array.isArray(settings[keyName]) ? settings[keyName] : [];
  current.splice(index, 1);
  settings[keyName] = current;
  return current;
}

export function validateImportedSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  return Object.keys(settings).some((key) => Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key));
}

export function mergeImportedSettings(current, imported) {
  if (!validateImportedSettings(imported)) {
    throw new Error("Invalid settings file");
  }
  return normalizeSettings({ ...current, ...imported });
}

export function formatTimestamp(date = new Date()) {
  const pad = (value, length = 2) => String(value).padStart(length, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("-");
}
