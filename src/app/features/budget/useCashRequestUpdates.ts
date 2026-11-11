import { useEffect } from "react";
import { AppState } from "react-native";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";

export function useCashRequestUpdates(
  taskId: string,
  enabled: boolean,
  reload: () => Promise<unknown>,
  subtaskId?: string,
) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer || AppState.currentState !== "active") return;
      timer = setTimeout(() => {
        timer = undefined;
        void reload();
      }, 250);
    };
    const channel = createPostgresChannel(`native-task-cash:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "petty_cash_requests",
          filter: subtaskId
            ? `subtask_id=eq.${subtaskId}`
            : `task_id=eq.${taskId}`,
        },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const fallback = subtaskId ? undefined : setInterval(refresh, 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      app?.remove();
      void supabase.removeChannel(channel);
    };
  }, [taskId, subtaskId, enabled, reload]);
}
