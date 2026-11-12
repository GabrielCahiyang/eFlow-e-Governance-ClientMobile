import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
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
            toast("New assignment in Inbox");
          sync();
        },
      )
      .subscribe();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    const poll = setInterval(() => {
      if (AppState.currentState === "active") sync();
    }, 30_000);
    nativeWindow.addEventListener(inboxReadEvent, sync);
    return () => {
      nativeWindow.removeEventListener(inboxReadEvent, sync);
      clearInterval(poll);
      app.remove();
      void supabase.removeChannel(channel);
    };
  }, [actor, refresh, toast]);
  return !!actor && !error && data === true;
}
