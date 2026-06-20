import test from "node:test";
import assert from "node:assert/strict";

import { ApiClient, getCsrfToken } from "../src/api.js";

test("reads csrf token from cookie", () => {
  assert.equal(getCsrfToken("foo=bar; bili_jct=token123; other=x"), "token123");
  assert.equal(getCsrfToken("foo=bar"), "");
});

test("deduplicates in-flight JSON requests", async () => {
  let calls = 0;
  const api = new ApiClient({
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({ code: 0, data: { value: calls } }),
      };
    },
  });

  const [a, b] = await Promise.all([
    api.fetchJson("same", "https://api.example.test/one"),
    api.fetchJson("same", "https://api.example.test/one"),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(a, b);
});

test("maps comment API fields used by filtered and top comment rules", async () => {
  let requestedUrl = "";
  const api = new ApiClient({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            control: { web_selection: true },
            upper: { top: { content: { message: "置顶内容" } } },
          },
        }),
      };
    },
  });

  const comments = await api.getComments(12345);

  assert.equal(new URL(requestedUrl).searchParams.get("oid"), "12345");
  assert.equal(comments.filteredComments, true);
  assert.equal(comments.topComment, "置顶内容");
});

test("rejects hung requests instead of leaving actions loading forever", async () => {
  const api = new ApiClient({
    timeoutMs: 5,
    fetchImpl: () => new Promise(() => {}),
  });

  const result = await Promise.race([
    api.fetchJson("hung", "https://api.example.test/hung").then(
      () => "resolved",
      (error) => error.message,
    ),
    new Promise((resolve) => setTimeout(() => resolve("still pending"), 25)),
  ]);

  assert.match(result, /请求超时/);
});
