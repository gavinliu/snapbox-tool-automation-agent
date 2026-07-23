import { getAgentStatusTitle } from "@/features/agent/lib/agent-status-presentation";
import { useAgentRunStore } from "@/features/agent/store/use-agent-run-store";
import { hide, show } from "@snapbox/pkg-floating-menu";
import * as Linking from "expo-linking";
import { useEffect } from "react";

export function AgentStatusOverlay() {
  const phase = useAgentRunStore((state) => state.phase);
  const currentAction = useAgentRunStore((state) => state.currentAction);
  const overlayPermissionGranted = useAgentRunStore(
    (state) => state.overlayPermissionGranted,
  );
  const dismiss = useAgentRunStore((state) => state.dismiss);

  useEffect(() => {
    const title = getAgentStatusTitle({ phase, currentAction });
    if (!overlayPermissionGranted || !title) {
      hide();
      return;
    }

    show([
      {
        title,
        onPress: () => {
          hide();
          dismiss();
          void Linking.openURL(
            Linking.createURL("/tools?toolId=snapbox-tool-automation-agent"),
          );
        },
      },
    ]);
  }, [currentAction, dismiss, overlayPermissionGranted, phase]);

  useEffect(
    () => () => {
      hide();
    },
    [],
  );

  return null;
}
