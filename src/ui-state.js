export const ACTION_STATE = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
});

const STATE_CLASS = Object.freeze({
  [ACTION_STATE.IDLE]: "bbt-state-idle",
  [ACTION_STATE.LOADING]: "bbt-state-loading",
  [ACTION_STATE.SUCCESS]: "bbt-state-success",
  [ACTION_STATE.ERROR]: "bbt-state-error",
});

export function getActionStateView(state, idleLabel, message = "") {
  const resolvedState = STATE_CLASS[state] ? state : ACTION_STATE.IDLE;
  return {
    label:
      resolvedState === ACTION_STATE.IDLE
        ? idleLabel
        : resolvedState === ACTION_STATE.LOADING
          ? "处理中..."
          : message || idleLabel,
    className: STATE_CLASS[resolvedState],
    disabled: resolvedState === ACTION_STATE.LOADING || resolvedState === ACTION_STATE.SUCCESS,
  };
}
