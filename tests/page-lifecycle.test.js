import test from "node:test";
import assert from "node:assert/strict";

import { getScanRoot, getStartupDelay, isVideoDetailPage } from "../src/page-lifecycle.js";

class FakeDocument {
  constructor(matches = {}) {
    this.matches = matches;
  }

  querySelector(selector) {
    return this.matches[selector] || null;
  }
}

test("recognizes Bilibili video detail pages", () => {
  assert.equal(isVideoDetailPage("https://www.bilibili.com/video/BV1YNjP6VEr6/"), true);
  assert.equal(isVideoDetailPage("https://www.bilibili.com/video/av170001"), true);
  assert.equal(isVideoDetailPage("https://search.bilibili.com/all?keyword=BV1YNjP6VEr6"), false);
});

test("limits video detail scans to the right recommendation area", () => {
  const document = new FakeDocument({
    ".right-container": { name: "right" },
    "#mirror-vdcon": { name: "whole-video-page" },
  });

  assert.deepEqual(
    getScanRoot(document, "https://www.bilibili.com/video/BV1YNjP6VEr6/"),
    { name: "right" },
  );
});

test("does not scan the whole document while video detail layout is still mounting", () => {
  const document = new FakeDocument({
    "#mirror-vdcon": { name: "whole-video-page" },
  });

  assert.equal(getScanRoot(document, "https://www.bilibili.com/video/BV1YNjP6VEr6/"), null);
});

test("delays video detail startup scans until Bilibili has mounted player and header", () => {
  assert.ok(getStartupDelay("https://www.bilibili.com/video/BV1YNjP6VEr6/") >= 1000);
  assert.equal(getStartupDelay("https://www.bilibili.com/"), 0);
});
