import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createPostgresChannel } from "../../shared/postgresChannel";

export function useWorkRecordUpdates(
  rootId: string | undefined,
  refresh: () => void,
  personal = false,
) {
  useEffect(() => {
    if (!rootId) return;
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, 120);
    };
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
          .subscribe((state) => {
            if (state === "SUBSCRIBED") schedule();
          });
    const fallback = personal
      ? setInterval(() => {
          if (AppState.currentState === "active") refresh();
        }, 30_000)
      : undefined;
    return () => {
      if (timer) clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      app.remove();
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [rootId, refresh, personal]);
}
