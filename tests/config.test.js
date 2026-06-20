import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SETTINGS,
  addListItems,
  normalizeSettings,
  validateImportedSettings,
} from "../src/config.js";

test("normalizes legacy settings without changing stored key names", () => {
  const settings = normalizeSettings({
    blockedTitle_Switch: true,
    blockedTitle_Array: ["spam"],
  });

  assert.equal(settings.blockedTitle_Switch, true);
  assert.deepEqual(settings.blockedTitle_Array, ["spam"]);
  assert.equal(settings.blockedNameOrUid_Switch, DEFAULT_SETTINGS.blockedNameOrUid_Switch);
  assert.equal(settings.hideNonVideoElements_Switch, true);
});

test("adds comma separated list items and preserves double tag pairs", () => {
  const settings = normalizeSettings({});

  addListItems(settings, "blockedTitle_Array", "a, b,, c ");
  addListItems(settings, "doubleBlockedTag_Array", "tag1|tag2, bad, tag3 | tag4");

  assert.deepEqual(settings.blockedTitle_Array, ["a", "b", "c"]);
  assert.deepEqual(settings.doubleBlockedTag_Array, ["tag1|tag2", "tag3|tag4"]);
});

test("accepts exported config files that contain known settings", () => {
  assert.equal(validateImportedSettings({ blockedTitle_Switch: false }), true);
  assert.equal(validateImportedSettings({ unknown: true }), false);
});
