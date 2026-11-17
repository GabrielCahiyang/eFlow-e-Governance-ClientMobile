import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useToast } from "../../components/ui/Toast";
import { useFacts } from "../../shared/useFacts";
import {
  fetchInboxUnreadCounts,
  type InboxCountsState,
} from "./useInboxCounts";

export const inboxReadEvent = "eflow:inbox-read";

/**
 * The single live source of unread Inbox counts: one small query, refreshed
 * by realtime (bursts coalesced) and by local read events.
 */
export function useInboxIndicator(
  actor?: string,
): InboxCountsState & { unread: number } {
  const { toast } = useToast();
  const { data, error, refresh, refreshIfStale } = useFacts(
    "mobile-inbox-unread-counts:" + actor,
    () => fetchInboxUnreadCounts(actor!),
    !!actor,
  );
  useEffect(() => {
    if (!actor) return;
    const sync = () => void refresh();
    const live = createLiveRefreshController({
      onRefresh: sync,
      // Several notifications often arrive together; count once per burst.
      debounceMs: 500,
      maxWaitMs: 3_000,
      hasRealtime: true,
    });
    const channel = createPostgresChannel("mobile-inbox-indicator:" + actor)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + actor,
        },
        (event) => {
          const row = event.new;
          if (
            event.eventType === "INSERT" &&
            AppState.currentState === "active" &&
            "user_id" in row &&
            row.user_id === actor &&
            !row.read &&
            (row.type === "assignment" || row.type === "reassignment")
          )
            toast({
              eyebrow: "Inbox",
              title: "New assignment in Inbox",
              message: "Open Inbox to review your updated work assignment.",
              type: "info",
              icon: "bell",
            });
          live.schedule();
        },
      )
      .subscribe(live.onChannelStatus);
    nativeWindow.addEventListener(inboxReadEvent, sync);
    return () => {
      nativeWindow.removeEventListener(inboxReadEvent, sync);
      live.dispose();
      void supabase.removeChannel(channel);
    };
  }, [actor, refresh, toast]);
  return {
    data: actor && !error ? data : undefined,
    refresh,
    refreshIfStale,
    unread: actor && !error ? (data?.all ?? 0) : 0,
  };
}
