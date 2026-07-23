import type { AgentRunPhase } from "@/features/agent/store/use-agent-run-store";

export function getAgentStatusTitle({
  phase,
  currentAction,
}: {
  phase: AgentRunPhase;
  currentAction: string | null;
}) {
  switch (phase) {
    case "running":
      return `Agent · ${currentAction ?? "处理中"}`;
    case "succeeded":
      return "Agent · 任务已完成";
    case "failed":
      return "Agent · 执行失败";
    case "idle":
      return null;
  }
}
