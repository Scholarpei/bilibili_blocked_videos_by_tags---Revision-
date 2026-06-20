import test from "node:test";
import assert from "node:assert/strict";

import { runInBackground } from "../src/background-action.js";

test("starts a background request without waiting for it to settle", async () => {
  let settled = false;
  const pending = new Promise((resolve) => {
    setTimeout(() => {
      settled = true;
      resolve();
    }, 50);
  });

  const startedAt = Date.now();
  runInBackground(pending);
  const elapsed = Date.now() - startedAt;

  assert.equal(settled, false);
  assert.ok(elapsed < 30);
});

test("reports background request failures without throwing to the caller", async () => {
  const errors = [];

  runInBackground(Promise.reject(new Error("boom")), (error) => errors.push(error.message));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(errors, ["boom"]);
});
