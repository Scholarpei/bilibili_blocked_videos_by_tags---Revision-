import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSettings } from "../src/config.js";
import { evaluateVideo } from "../src/rules.js";

test("matches title rules before API-backed rules", () => {
  const settings = normalizeSettings({
    blockedTitle_Switch: true,
    blockedTitle_Array: ["低质"],
    blockedTag_Switch: true,
    blockedTag_Array: ["游戏"],
  });

  const result = evaluateVideo({
    title: "低质搬运视频",
    tags: ["游戏"],
  }, settings);

  assert.equal(result.blocked, true);
  assert.equal(result.type, "按标题屏蔽");
  assert.equal(result.item, "低质");
});

test("whitelist overrides a matched blocked UP", () => {
  const settings = normalizeSettings({
    blockedNameOrUid_Switch: true,
    blockedNameOrUid_Array: ["123"],
    whitelistNameOrUid_Switch: true,
    whitelistNameOrUid_Array: ["123"],
  });

  const result = evaluateVideo({
    upUid: "123",
    upName: "trusted",
  }, settings);

  assert.equal(result.blocked, false);
  assert.equal(result.whitelisted, true);
});

test("matches double tag rules only when both tags exist", () => {
  const settings = normalizeSettings({
    doubleBlockedTag_Switch: true,
    doubleBlockedTag_Array: ["原神|鸣潮"],
  });

  assert.equal(evaluateVideo({ tags: ["原神", "鸣潮"] }, settings).blocked, true);
  assert.equal(evaluateVideo({ tags: ["原神"] }, settings).blocked, false);
});

test("keeps legacy exact title matching case sensitive", () => {
  const settings = normalizeSettings({
    blockedTitle_Switch: true,
    blockedTitle_UseRegular: false,
    blockedTitle_Array: ["Spam"],
  });

  assert.equal(evaluateVideo({ title: "spam" }, settings).blocked, false);
  assert.equal(evaluateVideo({ title: "Spam" }, settings).blocked, true);
});

test("keeps regex UP matching scoped to names while UID stays exact", () => {
  const settings = normalizeSettings({
    blockedNameOrUid_Switch: true,
    blockedNameOrUid_UseRegular: true,
    blockedNameOrUid_Array: ["12."],
  });

  assert.equal(evaluateVideo({ upName: "trusted", upUid: "123" }, settings).blocked, false);
  assert.equal(evaluateVideo({ upName: "abc12x", upUid: "999" }, settings).blocked, true);
});

test("requires safe thresholds before blocking favorite coin ratio", () => {
  const settings = normalizeSettings({
    blockedAboveFavoriteCoinRatio_Switch: true,
    blockedAboveFavoriteCoinRatio: 10,
  });

  const youngVideo = evaluateVideo({
    view: 10000,
    favorite: 100,
    coin: 1,
    pubdate: Math.floor(Date.now() / 1000),
  }, settings);

  const oldVideo = evaluateVideo({
    view: 10000,
    favorite: 100,
    coin: 1,
    pubdate: Math.floor(Date.now() / 1000) - 7201,
  }, settings);

  assert.equal(youngVideo.blocked, false);
  assert.equal(oldVideo.blocked, true);
  assert.equal(oldVideo.type, "屏蔽高收藏投币比");
});
