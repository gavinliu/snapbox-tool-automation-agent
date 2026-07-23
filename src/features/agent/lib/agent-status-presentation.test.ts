import { getAgentStatusTitle } from "./agent-status-presentation";

describe("getAgentStatusTitle", () => {
  it.each([
    ["idle", null, null],
    ["running", "点击", "Agent · 点击"],
    ["running", null, "Agent · 处理中"],
    ["succeeded", null, "Agent · 任务已完成"],
    ["failed", null, "Agent · 执行失败"],
  ] as const)("maps %s state to its overlay title", (phase, currentAction, expected) => {
    expect(getAgentStatusTitle({ phase, currentAction })).toBe(expected);
  });
});
