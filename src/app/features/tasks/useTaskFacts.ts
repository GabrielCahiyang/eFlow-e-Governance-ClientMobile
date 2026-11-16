import { useEffect } from "react";
import { useAuth } from "../authentication";
import {
  BULK_REFRESH_DEBOUNCE_MS,
  BULK_REFRESH_MAX_WAIT_MS,
  createLiveRefreshController,
} from "../../shared/liveUpdates";
import { useFacts } from "../../shared/useFacts";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import { fetchVisibleTasks } from "./services";
export function useTaskFacts(scope: string, enabled = true) {
  const { profile } = useAuth();
  const facts = useFacts(
    `tasks:${scope}:${profile?.id}`,
    fetchVisibleTasks,
    !!profile && enabled,
  );
  useEffect(() => {
    if (!profile || !enabled) return;
    const live = createLiveRefreshController({
      onRefresh: () => void facts.refresh(),
      // Unfiltered `tasks` listener: coalesce system-wide bursts.
      debounceMs: BULK_REFRESH_DEBOUNCE_MS,
      maxWaitMs: BULK_REFRESH_MAX_WAIT_MS,
      hasRealtime: true,
    });
    const channel = createPostgresChannel(
      "native-task-facts:" + scope + ":" + profile.id,
    )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        live.schedule,
      )
      .subscribe(live.onChannelStatus);
    return () => {
      live.dispose();
      void supabase.removeChannel(channel);
    };
  }, [scope, profile?.id, enabled]);
  return facts;
}
