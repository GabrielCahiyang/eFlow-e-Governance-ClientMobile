import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useFacts } from "../../shared/useFacts";
import { loadChannels } from "./services";

export const conversationDirectoryChanged = "eflow:conversation-directory";

export function useConversationDirectory(actor: string) {
  const facts = useFacts(`chat-channels:${actor}`, loadChannels, !!actor);
  useEffect(() => {
    if (!actor) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer || AppState.currentState !== "active") return;
      timer = setTimeout(() => {
        timer = undefined;
        void facts.refresh();
      }, 300);
    };
    const live = createPostgresChannel(`native-chat-directory:${actor}`);
    for (const table of [
      "chat_messages",
      "chat_channels",
      "projects",
      "tasks",
    ]) {
      live.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refresh,
      );
    }
    live.subscribe((status) => {
      if (status === "SUBSCRIBED") refresh();
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const fallback = setInterval(refresh, 30_000);
    nativeWindow.addEventListener(conversationDirectoryChanged, refresh);
    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      foreground.remove();
      nativeWindow.removeEventListener(conversationDirectoryChanged, refresh);
      void supabase.removeChannel(live);
    };
  }, [actor, facts.refresh]);
  return facts;
}
