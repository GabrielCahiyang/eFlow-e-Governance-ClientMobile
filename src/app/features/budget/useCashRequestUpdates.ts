import { useEffect } from "react";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";

export function useCashRequestUpdates(
  taskId: string,
  enabled: boolean,
  reload: () => Promise<unknown>,
  subtaskId?: string,
  includeAllocations = false,
) {
  useEffect(() => {
    if (!enabled) return;
    const live = createLiveRefreshController({
      onRefresh: () => void reload(),
      debounceMs: 250,
      hasRealtime: true,
    });
    const refresh = live.schedule;
    const channel = createPostgresChannel(`native-task-cash:${taskId}`).on(
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
    );
    if (includeAllocations) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_budget_allocations",
          filter: `task_id=eq.${taskId}`,
        },
        refresh,
      );
    }
    channel.subscribe(live.onChannelStatus);
    const changed = (event: { detail?: { taskId?: string } }) => {
      if (!event.detail?.taskId || event.detail.taskId === taskId) refresh();
    };
    nativeWindow.addEventListener("eflow:finance-updated", changed);
    return () => {
      live.dispose();
      nativeWindow.removeEventListener("eflow:finance-updated", changed);
      void supabase.removeChannel(channel);
    };
  }, [taskId, subtaskId, enabled, reload, includeAllocations]);
}
