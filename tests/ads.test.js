import test from "node:test";
import assert from "node:assert/strict";

import { installPageSpecificStyles } from "../src/ads.js";

function createFakeDocument() {
  const head = {
    children: [],
    appendChild(element) {
      this.children.push(element);
      return element;
    },
  };

  return {
    head,
    created: [],
    getElementById() {
      return null;
    },
    createElement(tagName) {
      const element = {
        tagName: tagName.toUpperCase(),
        id: "",
        textContent: "",
      };
      this.created.push(element);
      return element;
    },
  };
}

test("page-specific ad styles do not hide Bilibili player containers", () => {
  const originalDocument = globalThis.document;
  const fakeDocument = createFakeDocument();
  globalThis.document = fakeDocument;

  try {
    installPageSpecificStyles(fakeDocument);
    const css = fakeDocument.head.children[0].textContent;

    assert.equal(css.includes(".player-area-ctnr"), false);
    assert.equal(css.includes("#bilibili-player"), false);
    assert.equal(css.includes(".bpx-player-container"), false);
  } finally {
    globalThis.document = originalDocument;
  }
});
