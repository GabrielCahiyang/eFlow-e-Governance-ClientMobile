import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useToast } from "../../components/ui/Toast";
import { useFacts } from "../../shared/useFacts";

export const inboxReadEvent = "eflow:inbox-read";

export function useInboxIndicator(actor?: string) {
  const { toast } = useToast();
  const { data, error, refresh } = useFacts(
    "mobile-inbox-unread:" + actor,
    async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", actor!)
        .eq("read", false)
        .limit(1);
      if (error) throw error;
      return data.length > 0;
    },
    !!actor,
  );
  useEffect(() => {
    if (!actor) return;
    const sync = () => void refresh();
    const live = createLiveRefreshController({
      onRefresh: sync,
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
          sync();
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
  return !!actor && !error && data === true;
}
