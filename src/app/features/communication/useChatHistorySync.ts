import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { authoritativeReadEpoch } from "../../shared/displayCache";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { readWithTimeout } from "../../shared/readTimeout";
import { mergeMessages } from "./messageHistory";
import { refreshChatHistory, type Message } from "./services";

export type ChatHistory = {
  scope: string;
  rows: Message[];
  hasOlder?: boolean;
};
type Props = {
  channelId?: string;
  scope: string;
  accessEpoch: number;
  shown: Message[];
  recent?: Message[];
  setHistory: Dispatch<SetStateAction<ChatHistory>>;
  refreshRecent: () => Promise<void>;
  refreshPeople: () => Promise<void>;
  focusId?: string;
  refreshFocus: () => Promise<void>;
};

export function useChatHistorySync(props: Props) {
  const latest = useRef(props);
  latest.current = props;
  const { channelId, scope, accessEpoch, setHistory } = props;
  useEffect(() => {
    if (!channelId) return;
    let stopped = false;
    let checking = false;
    const stillCurrent = () =>
      !stopped &&
      latest.current.scope === scope &&
      authoritativeReadEpoch() === accessEpoch;
    const recheck = async () => {
      if (!stillCurrent() || checking) return;
      checking = true;
      const loaded = latest.current;
      const recent = new Set(loaded.recent?.map((row) => row.id));
      const older = new Map(
        loaded.shown
          .filter((row) => !recent.has(row.id))
          .map((row) => [row.id, row]),
      );
      try {
        if (older.size) {
          const rows = await readWithTimeout(() =>
            refreshChatHistory(channelId, [...older.keys()]),
          );
          if (stillCurrent())
            setHistory((previous) =>
              previous.scope === scope
                ? {
                    ...previous,
                    rows: mergeMessages(
                      rows,
                      previous.rows.filter(
                        (row) =>
                          !older.has(row.id) ||
                          older.get(row.id) !== row ||
                          !!row.deleted_at,
                      ),
                    ),
                  }
                : previous,
            );
        }
      } catch {
        // The recent read still checks access when an older page fails.
      } finally {
        checking = false;
        if (stillCurrent()) {
          void latest.current.refreshRecent();
          void latest.current.refreshPeople();
          void latest.current.refreshFocus();
        }
      }
    };
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void recheck();
    });
    const fallback = setInterval(() => {
      if (AppState.currentState === "active") void recheck();
    }, 30_000);
    const live = createPostgresChannel("native-chat:" + channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: "channel_id=eq." + channelId,
        },
        (payload) => {
          if (!stillCurrent()) return;
          const row = payload.new as Partial<Message>;
          const id =
            payload.eventType === "DELETE"
              ? (payload.old as Partial<Message>).id
              : row.id;
          if (id)
            setHistory((previous) => {
              const rows = previous.scope === scope ? previous.rows : [];
              return {
                scope,
                rows:
                  payload.eventType === "DELETE"
                    ? rows.filter((item) => item.id !== id)
                    : mergeMessages(rows, [row as Message]),
                hasOlder:
                  previous.scope === scope ? previous.hasOlder : undefined,
              };
            });
          if (row.activity_kind === "nickname")
            void latest.current.refreshPeople();
          if (id && id === latest.current.focusId)
            void latest.current.refreshFocus();
          void latest.current.refreshRecent();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void recheck();
      });
    return () => {
      stopped = true;
      app.remove();
      clearInterval(fallback);
      void supabase.removeChannel(live);
    };
  }, [channelId, scope, accessEpoch, setHistory]);
}
