import { useEffect } from "react";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useFacts } from "../../shared/useFacts";
import { loadChannels } from "./services";

export const conversationDirectoryChanged = "eflow:conversation-directory";

export function useConversationDirectory(actor: string) {
  const facts = useFacts(`chat-channels:${actor}`, loadChannels, !!actor);
  useEffect(() => {
    if (!actor) return;
    const sync = createLiveRefreshController({
      onRefresh: () => void facts.refresh(),
      debounceMs: 300,
      hasRealtime: true,
    });
    const refresh = sync.schedule;
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
    live.subscribe(sync.onChannelStatus);
    nativeWindow.addEventListener(conversationDirectoryChanged, refresh);
    return () => {
      sync.dispose();
      nativeWindow.removeEventListener(conversationDirectoryChanged, refresh);
      void supabase.removeChannel(live);
    };
  }, [actor, facts.refresh]);
  return facts;
}
