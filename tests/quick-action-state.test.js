import test from "node:test";
import assert from "node:assert/strict";

import {
  createEmptyQuickActionState,
  getQuickActionState,
  markQuickActionState,
  normalizeQuickActionState,
} from "../src/quick-action-state.js";

test("stores and restores quick action state by BV and UID", () => {
  const state = createEmptyQuickActionState();

  markQuickActionState(state, { bv: "BV123", uid: "456" }, "disliked");
  markQuickActionState(state, { bv: "BV123", uid: "456" }, "blockedUp");
  markQuickActionState(state, { bv: "BV123", uid: "456" }, "blacklisted");

  assert.deepEqual(getQuickActionState(state, { bv: "BV123", uid: "456" }), {
    disliked: true,
    blockedUp: true,
    blacklisted: true,
  });
});

test("normalizes malformed stored quick action state", () => {
  const state = normalizeQuickActionState({
    byBv: { BV1: { disliked: 1 } },
    byUid: { 123: { blacklisted: true } },
  });

  assert.deepEqual(getQuickActionState(state, { bv: "BV1", uid: "123" }), {
    disliked: true,
    blockedUp: false,
    blacklisted: true,
  });
});
