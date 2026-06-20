import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSettings } from "../src/config.js";
import { Scanner } from "../src/scanner.js";

class FakeCard {
  constructor({ href, title = "" }) {
    this.anchor = {
      href,
      textContent: title,
      querySelector: () => null,
    };
    this.dataset = {};
  }

  querySelectorAll(selector) {
    return selector === "a[href]" ? [this.anchor] : [];
  }

  querySelector() {
    return null;
  }
}

test("skips API-backed blocking checks for the current video detail page BV", async () => {
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { href: "https://www.bilibili.com/video/BV1YNjP6VEr6/" },
  });

  let tagRequests = 0;
  const scanner = new Scanner({
    api: {
      getTags: async () => {
        tagRequests += 1;
        throw new Error("current detail page tags should not be requested");
      },
      getVideoInfo: async () => null,
      getUpInfo: async () => null,
      getComments: async () => null,
    },
    getSettings: () =>
      normalizeSettings({
        blockedTag_Switch: true,
        blockedTag_Array: ["嘉豪"],
      }),
    logger: { log: () => {} },
  });

  try {
    await scanner.processCard(new FakeCard({ href: "https://www.bilibili.com/video/BV1YNjP6VEr6/" }));
    assert.equal(tagRequests, 0);
  } finally {
    if (originalLocation) Object.defineProperty(globalThis, "location", originalLocation);
    else delete globalThis.location;
  }
});
