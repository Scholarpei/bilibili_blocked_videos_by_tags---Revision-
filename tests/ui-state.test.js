import test from "node:test";
import assert from "node:assert/strict";

import { ACTION_STATE, getActionStateView } from "../src/ui-state.js";

test("maps quick action states to visible labels and classes", () => {
  assert.deepEqual(getActionStateView(ACTION_STATE.IDLE, "内容不感兴趣"), {
    label: "内容不感兴趣",
    className: "bbt-state-idle",
    disabled: false,
  });

  assert.deepEqual(getActionStateView(ACTION_STATE.LOADING, "内容不感兴趣"), {
    label: "处理中...",
    className: "bbt-state-loading",
    disabled: true,
  });

  assert.deepEqual(getActionStateView(ACTION_STATE.SUCCESS, "内容不感兴趣", "已反馈"), {
    label: "已反馈",
    className: "bbt-state-success",
    disabled: true,
  });

  assert.deepEqual(getActionStateView(ACTION_STATE.ERROR, "内容不感兴趣", "缺少 csrf"), {
    label: "缺少 csrf",
    className: "bbt-state-error",
    disabled: false,
  });
});
