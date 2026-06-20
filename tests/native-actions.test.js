import test from "node:test";
import assert from "node:assert/strict";

import {
  NATIVE_CARD_ACTION,
  runNativeCardAction,
} from "../src/native-actions.js";

class FakeElement {
  constructor({ tagName = "div", className = "", text = "", attrs = {}, visible = true } = {}) {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this._text = text;
    this.attrs = { ...attrs };
    this.children = [];
    this.parentElement = null;
    this.ownerDocument = null;
    this.visible = visible;
    this.clickCount = 0;
    this.events = [];
    this.listeners = new Map();
  }

  appendChild(child) {
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument || this;
    this.children.push(child);
    for (const descendant of child.querySelectorAll("*")) {
      descendant.ownerDocument = child.ownerDocument;
    }
    return child;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    this.events.push(event.type);
    for (const listener of this.listeners.get(event.type) || []) {
      listener.call(this, event);
    }
    return true;
  }

  click() {
    this.clickCount += 1;
    this.dispatchEvent({ type: "click", bubbles: true, cancelable: true });
  }

  get textContent() {
    return `${this._text}${this.children.map((child) => child.textContent).join("")}`;
  }

  getAttribute(name) {
    if (name === "class") return this.className;
    return this.attrs[name] || null;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  matches(selector) {
    const trimmed = selector.trim();
    if (trimmed === "*") return true;
    if (trimmed.includes(",")) return trimmed.split(",").some((part) => this.matches(part));
    if (/^\.[\w-]+(?:\.[\w-]+)*$/.test(trimmed)) {
      const classes = String(this.className).split(/\s+/);
      return trimmed
        .slice(1)
        .split(".")
        .every((className) => classes.includes(className));
    }
    const attrMatch = trimmed.match(/^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);
    if (attrMatch) {
      const [, name, value] = attrMatch;
      return value === undefined ? this.attrs[name] !== undefined : this.attrs[name] === value;
    }
    return this.tagName.toLowerCase() === trimmed.toLowerCase();
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

function createDocument() {
  const document = new FakeElement({ tagName: "document" });
  document.ownerDocument = document;
  document.body = new FakeElement({ tagName: "body" });
  document.body.ownerDocument = document;
  document.appendChild(document.body);
  return document;
}

test("clicks the native no-interest trigger when Bilibili exposes it directly", async () => {
  const document = createDocument();
  const card = new FakeElement({ className: "bili-video-card is-rcmd enable-no-interest" });
  const trigger = new FakeElement({ className: "bili-video-card__info--no-interest" });
  document.body.appendChild(card);
  card.appendChild(trigger);

  const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.DISLIKE_VIDEO, {
    root: document,
    waitMs: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, "native-trigger");
  assert.equal(trigger.clickCount, 1);
});

test("opens Bilibili's menu and clicks the native no-more-this-up item", async () => {
  const document = createDocument();
  const card = new FakeElement({ className: "feed-card" });
  const trigger = new FakeElement({ className: "bili-video-card__info--no-interest" });
  const menuItem = new FakeElement({ tagName: "button", text: "不想看此UP主" });
  trigger.addEventListener("click", () => {
    document.body.appendChild(menuItem);
  });
  document.body.appendChild(card);
  card.appendChild(trigger);

  const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.NO_MORE_UP, {
    root: document,
    waitMs: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, "native-menu");
  assert.equal(trigger.clickCount, 1);
  assert.equal(menuItem.clickCount, 1);
});

test("reports unsupported when the native up recommendation action is unavailable", async () => {
  const document = createDocument();
  const card = new FakeElement({ className: "video-card" });
  document.body.appendChild(card);

  const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.NO_MORE_UP, {
    root: document,
    waitMs: 0,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported");
});

test("does not pass a sandbox window object into MouseEvent init", async () => {
  const originalMouseEvent = globalThis.MouseEvent;
  const originalWindow = globalThis.window;
  globalThis.window = { sandboxed: true };
  globalThis.MouseEvent = class MouseEvent {
    constructor(type, init = {}) {
      if ("view" in init) {
        throw new TypeError("Failed to read the 'view' property from 'UIEventInit'");
      }
      this.type = type;
      this.bubbles = init.bubbles;
      this.cancelable = init.cancelable;
    }
  };

  try {
    const document = createDocument();
    const card = new FakeElement({ className: "bili-video-card is-rcmd enable-no-interest" });
    const trigger = new FakeElement({ className: "bili-video-card__info--no-interest" });
    document.body.appendChild(card);
    card.appendChild(trigger);

    const result = await runNativeCardAction(card, NATIVE_CARD_ACTION.DISLIKE_VIDEO, {
      root: document,
      waitMs: 0,
    });

    assert.equal(result.ok, true);
    assert.equal(trigger.clickCount, 1);
  } finally {
    globalThis.MouseEvent = originalMouseEvent;
    globalThis.window = originalWindow;
  }
});
