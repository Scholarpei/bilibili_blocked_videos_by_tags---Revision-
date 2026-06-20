import test from "node:test";
import assert from "node:assert/strict";

import { av2bv, extractBvFromHref } from "../src/bv.js";

test("extracts BV ids from Bilibili links", () => {
  assert.equal(
    extractBvFromHref("https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333"),
    "BV1xx411c7mD"
  );
});

test("converts AV ids for bv2av compatibility", () => {
  assert.equal(av2bv(170001), "BV17x411w7KC");
  assert.equal(extractBvFromHref("https://www.bilibili.com/video/av170001"), "BV17x411w7KC");
});
