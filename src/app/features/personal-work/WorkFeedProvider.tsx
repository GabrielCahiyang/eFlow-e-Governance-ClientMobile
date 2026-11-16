import { createContext, useContext, useEffect, type ReactNode } from "react";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { loadWorkFeed } from "../../../core/web/app/features/personal-work/services/workFeedService";
import { ACCESS_CHANGED_EVENT } from "../../../core/web/app/features/project-access/services/accessService";
import {
  BULK_REFRESH_DEBOUNCE_MS,
  BULK_REFRESH_MAX_WAIT_MS,
  createLiveRefreshController,
} from "../../shared/liveUpdates";
import { useFacts } from "../../shared/useFacts";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useAuth } from "../authentication";
import { clearDisplayCache } from "../../shared/displayCache";
import { displayWorkSnapshot, mobileWorkSnapshot } from "./displayWorkSnapshot";

const Context = createContext<ReturnType<typeof useFeed> | null>(null);
function useFeed(actor: string) {
  return useFacts(
    "mobile-work:v4:" + actor,
    async () => mobileWorkSnapshot(await loadWorkFeed(actor)),
    !!actor,
    {
      actor,
      select: displayWorkSnapshot,
    },
  );
}

export function WorkFeedProvider({ children }: { children: ReactNode }) {
  const actor = useAuth().profile?.id || "";
  const facts = useFeed(actor);
  useEffect(() => {
    if (!actor) return;
    // These listeners see every task/subtask/project change the actor can
    // read, and each refresh reloads the whole assigned-work snapshot. Route
    // change events through a bounded debounce that skips work while
    // backgrounded and catches up once on return to the foreground.
    const changes = createLiveRefreshController({
      onRefresh: () => void facts.refresh(),
      debounceMs: BULK_REFRESH_DEBOUNCE_MS,
      maxWaitMs: BULK_REFRESH_MAX_WAIT_MS,
      hasRealtime: true,
      pollIntervalMs: 0,
    });
    const schedule = changes.schedule;
    const live = createLiveRefreshController({
      onRefresh: () => void facts.refreshIfStale(),
      hasRealtime: true,
    });
    const channel = createPostgresChannel("mobile-work:" + actor)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtask_progress_updates" },
        schedule,
      )
      .subscribe(live.onChannelStatus);
    const workChanged = () => clearDisplayCache("data");
    const accessChanged = () => clearDisplayCache("access");
    nativeWindow.addEventListener("eflow:work-updated", workChanged);
    nativeWindow.addEventListener(ACCESS_CHANGED_EVENT, accessChanged);
    return () => {
      changes.dispose();
      live.dispose();
      void supabase.removeChannel(channel);
      nativeWindow.removeEventListener("eflow:work-updated", workChanged);
      nativeWindow.removeEventListener(ACCESS_CHANGED_EVENT, accessChanged);
    };
  }, [actor, facts.refresh, facts.refreshIfStale]);
  return <Context.Provider value={facts}>{children}</Context.Provider>;
}

export function useMobileWorkFeed() {
  const facts = useContext(Context);
  if (!facts) throw new Error("WorkFeedProvider is missing");
  return facts;
}
