export const QUICK_ACTION_STATE_KEY = "GM_quickActionState";

const EMPTY_STATE = Object.freeze({
  byBv: {},
  byUid: {},
});

const ACTION_KEYS = new Set(["disliked", "blockedUp", "blacklisted"]);

export function createEmptyQuickActionState() {
  return {
    byBv: {},
    byUid: {},
  };
}

function normalizeBucket(bucket = {}) {
  return {
    disliked: Boolean(bucket.disliked),
    blockedUp: Boolean(bucket.blockedUp),
    blacklisted: Boolean(bucket.blacklisted),
  };
}

export function normalizeQuickActionState(input = EMPTY_STATE) {
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

export function loadQuickActionState(getValue = globalThis.GM_getValue) {
  const stored = typeof getValue === "function" ? getValue(QUICK_ACTION_STATE_KEY, createEmptyQuickActionState()) : EMPTY_STATE;
  return normalizeQuickActionState(stored);
}

export function saveQuickActionState(state, setValue = globalThis.GM_setValue) {
  const normalized = normalizeQuickActionState(state);
  if (typeof setValue === "function") {
    setValue(QUICK_ACTION_STATE_KEY, normalized);
  }
  return normalized;
}

export function getQuickActionState(state, { bv = "", uid = "" } = {}) {
  const normalized = normalizeQuickActionState(state);
  return {
    ...normalizeBucket(bv ? normalized.byBv[bv] : {}),
    ...normalizeBucket(uid ? normalized.byUid[String(uid)] : {}),
    disliked: Boolean(bv && normalized.byBv[bv]?.disliked),
    blockedUp: Boolean((bv && normalized.byBv[bv]?.blockedUp) || (uid && normalized.byUid[String(uid)]?.blockedUp)),
    blacklisted: Boolean((bv && normalized.byBv[bv]?.blacklisted) || (uid && normalized.byUid[String(uid)]?.blacklisted)),
  };
}

export function markQuickActionState(state, { bv = "", uid = "" } = {}, action) {
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
