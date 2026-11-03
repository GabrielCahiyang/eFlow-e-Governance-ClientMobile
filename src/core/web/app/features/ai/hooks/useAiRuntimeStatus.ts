import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  AI_RESTARTING_MESSAGE,
  getAiEndpointStatus,
  type AiRuntimeState,
} from "../../../shared/controlPanelClient";

const RUNTIME_KEYS = new Set([
  "ai_endpoint",
  "ai_endpoint_status",
  "ai_endpoint_status_message",
  "ai_endpoint_heartbeat",
]);

const INITIAL_STATE: AiRuntimeState = {
  endpoint: "",
  status: "unknown",
  message: "",
};

export function useAiRuntimeStatus(): AiRuntimeState {
  const [runtime, setRuntime] = useState<AiRuntimeState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    try {
      setRuntime(await getAiEndpointStatus());
    } catch {
      setRuntime({
        endpoint: "",
        status: "offline",
        message: AI_RESTARTING_MESSAGE,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refreshWhileActive = async () => {
      if (active) await refresh();
    };
    void refreshWhileActive();
    const pollingFallback = globalThis.setInterval(() => {
      void refreshWhileActive();
    }, 15_000);

    const channel = supabase
      .channel(`ai_runtime_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_config" },
        (payload) => {
          const changed = (payload.new || payload.old) as { key?: string };
          if (changed.key && RUNTIME_KEYS.has(changed.key)) {
            void refreshWhileActive();
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      globalThis.clearInterval(pollingFallback);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return runtime;
}
