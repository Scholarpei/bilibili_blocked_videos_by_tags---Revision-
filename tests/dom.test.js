import test from "node:test";
import assert from "node:assert/strict";

import { getVideoCards, isCurrentVideoPageBv } from "../src/dom.js";

class FakeElement {
  constructor({ tagName = "div", className = "", attrs = {}, text = "" } = {}) {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.attrs = { ...attrs };
    this._text = text;
    this.children = [];
    this.parentElement = null;
    this.classList = { value: className };
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  get href() {
    return this.attrs.href || "";
  }

  get title() {
    return this.attrs.title || "";
  }

  get textContent() {
    return `${this._text}${this.children.map((child) => child.textContent).join("")}`;
  }

  matches(selector) {
    const trimmed = selector.trim();
    if (trimmed.includes(",")) return trimmed.split(",").some((part) => this.matches(part));
    if (trimmed === "*") return true;

    const tagClassMatch = trimmed.match(/^([a-z]+)?((?:\.[\w-]+)+)$/i);
    if (tagClassMatch) {
      const [, tagName, classes] = tagClassMatch;
      return (!tagName || this.tagName.toLowerCase() === tagName.toLowerCase()) && this.hasClasses(classes.slice(1).split("."));
    }

    if (/^\.[\w-]+(?:\.[\w-]+)*$/.test(trimmed)) {
      return this.hasClasses(trimmed.slice(1).split("."));
    }

    const attrMatch = trimmed.match(/^([a-z]+)?\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/i);
    if (attrMatch) {
      const [, tagName, name, value] = attrMatch;
      if (tagName && this.tagName.toLowerCase() !== tagName.toLowerCase()) return false;
      return value === undefined ? this.attrs[name] !== undefined : this.attrs[name] === value;
    }

    return this.tagName.toLowerCase() === trimmed.toLowerCase();
  }

  hasClasses(classes) {
    const ownClasses = String(this.className).split(/\s+/).filter(Boolean);
    return classes.every((className) => ownClasses.includes(className));
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(",").map((part) => part.trim()).filter(Boolean);
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selectors.some((part) => child.matches(part))) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
}

test("identifies the BV currently open on a video detail page", () => {
  assert.equal(
    isCurrentVideoPageBv("BV1ni9RBREhp", "https://www.bilibili.com/video/BV1ni9RBREhp/"),
    true,
  );
  assert.equal(
    isCurrentVideoPageBv("BV1otherBV111", "https://www.bilibili.com/video/BV1ni9RBREhp/"),
    false,
  );
});

test("does not treat non-video pages as current video pages", () => {
  assert.equal(
    isCurrentVideoPageBv("BV1ni9RBREhp", "https://search.bilibili.com/all?keyword=BV1ni9RBREhp"),
    false,
  );
});

test("does not treat a multi-video page section as one video card", () => {
  const originalDocument = globalThis.document;
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  const document = new FakeElement({ tagName: "document" });
  const section = document.appendChild(new FakeElement({ className: "right-container-inner" }));
  section.appendChild(new FakeElement({ tagName: "h3", text: "相关推荐" }));
  const firstWrapper = section.appendChild(new FakeElement({ className: "rec-entry" }));
  const secondWrapper = section.appendChild(new FakeElement({ className: "rec-entry" }));
  firstWrapper.appendChild(new FakeElement({ tagName: "a", attrs: { href: "https://www.bilibili.com/video/BV1111111111/" }, text: "推荐一" }));
  secondWrapper.appendChild(new FakeElement({ tagName: "a", attrs: { href: "https://www.bilibili.com/video/BV2222222222/" }, text: "推荐二" }));

  globalThis.document = document;
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { href: "https://www.bilibili.com/video/BVcurrent001/" },
  });

  try {
    assert.deepEqual(getVideoCards(document), []);
  } finally {
    globalThis.document = originalDocument;
    if (originalLocation) Object.defineProperty(globalThis, "location", originalLocation);
    else delete globalThis.location;
  }
});
