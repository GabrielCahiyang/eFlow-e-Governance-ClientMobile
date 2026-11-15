import { useEffect } from "react";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";

export function useWorkRecordUpdates(
  rootId: string | undefined,
  refresh: () => void,
  personal = false,
) {
  useEffect(() => {
    if (!rootId) return;
    const live = createLiveRefreshController({
      onRefresh: refresh,
      debounceMs: 120,
      hasRealtime: !personal,
    });
    const schedule = live.schedule;
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    const channel = personal
      ? undefined
      : createPostgresChannel("native-work-record:" + rootId)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "tasks",
              filter: "id=eq." + rootId,
            },
            schedule,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "subtasks",
              filter: "task_id=eq." + rootId,
            },
            schedule,
          )
          .subscribe(live.onChannelStatus);
    return () => {
      live.dispose();
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [rootId, refresh, personal]);
}
