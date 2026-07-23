import { create } from "zustand";

export type AgentRunPhase = "idle" | "running" | "succeeded" | "failed";

type AgentRunState = {
  phase: AgentRunPhase;
  currentAction: string | null;
  errorMessage: string | null;
  overlayPermissionGranted: boolean;
  start: () => void;
  reportAction: (action: string) => void;
  succeed: () => void;
  fail: (message: string) => void;
  dismiss: () => void;
  setOverlayPermissionGranted: (granted: boolean) => void;
};

export const useAgentRunStore = create<AgentRunState>((set) => ({
  phase: "idle",
  currentAction: null,
  errorMessage: null,
  overlayPermissionGranted: false,
  start: () =>
    set({ phase: "running", currentAction: "准备任务", errorMessage: null }),
  reportAction: (currentAction) =>
    set((state) =>
      state.phase === "running" ? { ...state, currentAction } : state,
    ),
  succeed: () =>
    set({ phase: "succeeded", currentAction: null, errorMessage: null }),
  fail: (errorMessage) =>
    set({ phase: "failed", currentAction: null, errorMessage }),
  dismiss: () =>
    set({ phase: "idle", currentAction: null, errorMessage: null }),
  setOverlayPermissionGranted: (overlayPermissionGranted) =>
    set({ overlayPermissionGranted }),
}));
