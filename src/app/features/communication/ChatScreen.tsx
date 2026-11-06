import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../../components/ui/Appearance";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Choice,
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  Sheet,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import { fetchAllProfiles } from "../../../core/web/lib/supabaseService";
import { draftStore } from "../../../platform/draftStore";
import type { AppRoute, Navigate } from "../../shared/routes";
import {
  loadChannels,
  loadMessages,
  sendChat,
  getOrCreateDirectChannel,
  type Message,
} from "./services";
import { mergeMessages, isMessageDraft } from "./messageHistory";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { fetchProjectTasks } from "../projects/services";
import { filterConversationContext } from "./conversationContext";
export function ChatScreen({
  navigate,
  route,
}: {
  navigate: Navigate;
  route: AppRoute;
}) {
  const { profile } = useAuth();
  const palette = useTheme();
  const actor = profile!.id;
  const contextual = !!(route.projectId || route.taskId);
  const [draft, setDraft] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [pending, setPending] = useState<{ id: string; text: string }>();
  const action = useAction();
  const readChannels = async () => {
    const [available, tasks] = await Promise.all([
      loadChannels(actor),
      route.projectId && !route.taskId
        ? fetchProjectTasks(route.projectId)
        : Promise.resolve([]),
    ]);
    return filterConversationContext(
      available,
      route.taskId,
      route.projectId ? new Set(tasks.map((task) => task.id)) : undefined,
    );
  };
  const channels = useFacts(
    "chat-channels:" + [actor, route.projectId, route.taskId].join(":"),
    readChannels,
  );
  const channel = channels.error
    ? undefined
    : route.id
      ? channels.data?.find((item) => item.id === route.id)
      : route.taskId
        ? channels.data?.[0]
        : undefined;
  const people = useFacts("chat-directory:" + actor, fetchAllProfiles, newChat);
  const messages = useFacts(
    "chat-messages:" + actor + ":" + channel?.id,
    () => loadMessages(channel!.id),
    !!channel,
  );
  const [history, setHistory] = useState<{
    scope: string;
    rows: Message[];
    exhausted: boolean;
  }>({ scope: "", rows: [], exhausted: false });
  const scope = actor + ":" + channel?.id;
  const historyRows = history.scope === scope ? history.rows : [];
  const shown = mergeMessages(historyRows, messages.data || []);
  useEffect(() => {
    if (messages.data)
      setHistory((previous) => ({
        scope,
        rows: mergeMessages(
          previous.scope === scope ? previous.rows : [],
          messages.data!,
        ),
        exhausted: previous.scope === scope ? previous.exhausted : false,
      }));
  }, [messages.data, scope]);
  const recovery = useFacts(
    "chat-draft:" + actor + ":" + channel?.id,
    async () => {
      const saved = await draftStore.get<unknown>(actor, "chat:" + channel!.id);
      if (saved !== null && !isMessageDraft(saved))
        throw new Error(
          "This saved message is unreadable. Verify its original send before continuing.",
        );
      return saved as { id: string; text: string } | null;
    },
    !!channel,
  );
  const original = pending || recovery.data;
  useEffect(() => {
    setDraft("");
    setPending(undefined);
    if (!channel) return;
    const live = createPostgresChannel("native-chat:" + channel.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: "channel_id=eq." + channel.id,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as any).id;
            setHistory((previous) =>
              previous.scope === scope
                ? {
                    ...previous,
                    rows: previous.rows.filter((row) => row.id !== id),
                  }
                : previous,
            );
          } else if ((payload.new as any).id) {
            setHistory((previous) => ({
              scope,
              rows: mergeMessages(
                previous.scope === scope ? previous.rows : [],
                [payload.new as Message],
              ),
              exhausted: previous.scope === scope && previous.exhausted,
            }));
          }
          void messages.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [channel?.id, actor]);
  const send = () =>
    action.run(async () => {
      if (!channel) return;
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor)
        throw new Error("Sign in again.");
      if (!(await readChannels()).some((item) => item.id === channel.id))
        throw new Error(
          "This conversation is no longer available to your account.",
        );
      const item = original || { id: crypto.randomUUID(), text: draft };
      if (!item.text.trim()) return;
      await draftStore.set(actor, "chat:" + channel.id, item);
      setPending(item);
      await sendChat(item.id, channel.id, actor, profile!.full_name, item.text);
      await draftStore.remove(actor, "chat:" + channel.id);
      setPending(undefined);
      setDraft("");
      await Promise.all([
        messages.refresh(),
        channels.refresh(),
        recovery.refresh(),
      ]);
    });
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        compact
        footer={
          channel && (
            <View
              style={{
                backgroundColor: palette.surface,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: palette.border,
                padding: 12,
                gap: 8,
              }}
            >
              {original && (
                <Notice>
                  A pending message is retained. Retry sends the same message
                  identity.
                </Notice>
              )}
              <Field
                label="Message"
                value={original?.text || draft}
                onChangeText={setDraft}
                editable={!original && !action.busy}
                multiline
                maxLength={5000}
              />
              <Button
                busy={action.busy}
                disabled={
                  channels.loading ||
                  messages.loading ||
                  !!messages.error ||
                  recovery.loading ||
                  !!recovery.error ||
                  !(original?.text || draft).trim()
                }
                onPress={() => void send()}
              >
                {original ? "Retry original message" : "Send message"}
              </Button>
              {!!recovery.error && <ErrorState error={recovery.error} />}
              {!!action.error && <ErrorState context="action" error={action.error} />}
            </View>
          )
        }
        title={
          channel?.name ||
          (route.taskId
            ? "Task conversation"
            : route.projectId
              ? "Project conversations"
              : "Messages")
        }
        description={
          !channel
            ? route.taskId
              ? "Conversation linked to this task."
              : route.projectId
                ? "Authorized task conversations in this project."
                : "Task, Office and direct conversations."
            : undefined
        }
        onRefresh={() =>
          channel ? messages.refresh() : channels.refresh()
        }
        actions={
          !channel && !contextual && !route.id ? (
            <Button disabled={action.busy} onPress={() => setNewChat(true)}>
              New conversation
            </Button>
          ) : undefined
        }
      >
        {!channel ? (
          channels.error ? (
            <ErrorState
              error={channels.error}
              retry={() => void channels.refresh()}
            />
          ) : !channels.data ? (
            <Loading label="Loading conversations" layout="navigation" />
          ) : route.id || route.taskId ? (
            <Empty
              title="Conversation unavailable"
              description="This account has no authorized conversation at this location."
            />
          ) : !channels.data.length ? (
            <Empty
              kind="messages"
              title="No conversations yet"
              description="Your authorized direct, Office and task conversations appear here."
              action={
                !contextual && !route.id ? (
                  <Button onPress={() => setNewChat(true)}>
                    New conversation
                  </Button>
                ) : undefined
              }
            />
          ) : (
            channels.data.map((item) => (
              <NavigationRow
                key={item.id}
                title={item.name}
                description={
                  item.kind === "direct"
                    ? "Direct"
                    : item.kind === "org"
                      ? "Office"
                      : "Task"
                }
                onPress={() =>
                  navigate({
                    ...route,
                    name: "messages",
                    id: item.id,
                    title: item.name,
                  })
                }
              />
            ))
          )
        ) : (
          <>
            {!!channel.taskId && (
              <Button
                variant="outline"
                onPress={() =>
                  navigate({
                    name: "task",
                    id: channel.taskId,
                    projectId: route.projectId,
                  })
                }
              >
                Open task
              </Button>
            )}
            {!!shown.length &&
              !(history.scope === scope && history.exhausted) && (
                <Button
                  variant="outline"
                  busy={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      const batch = await loadMessages(channel.id, shown[0]);
                      setHistory((previous) =>
                        previous.scope === scope
                          ? {
                              ...previous,
                              rows: mergeMessages(batch, previous.rows),
                              exhausted: batch.length < 100,
                            }
                          : previous,
                      );
                    })
                  }
                >
                  Load older messages
                </Button>
              )}
            {messages.error ? (
              <ErrorState
                error={messages.error}
                retry={() => void messages.refresh()}
              />
            ) : !messages.data ? (
              <Loading label="Loading messages" layout="messages" />
            ) : !shown.length ? (
              <Empty
                kind="messages"
                compact
                title="No messages yet"
                description="Use the message field below to start the conversation."
              />
            ) : (
              shown.map((message) => (
                <View
                  key={message.id}
                  style={{
                    gap: 4,
                    paddingVertical: 8,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderColor: palette.border,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>
                    {message.sender_name}
                  </Text>
                  <Text selectable>{message.content}</Text>
                  <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                    {dateLabel(message.created_at)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
        {!channel && !!action.error && <ErrorState context="action" error={action.error} />}
        <Sheet
          open={newChat}
          title="New conversation"
          busy={action.busy}
          onClose={() => setNewChat(false)}
          footer={
            <Button
              busy={action.busy}
              disabled={!recipient}
              onPress={() =>
                void action.run(async () => {
                  const session = await supabase.auth.getSession();
                  if (session.error || session.data.session?.user.id !== actor)
                    throw new Error("Sign in again.");
                  const id = await getOrCreateDirectChannel(actor, recipient);
                  await channels.refresh();
                  navigate({
                    name: "messages",
                    id,
                    title: people.data?.find((p) => p.id === recipient)
                      ?.full_name,
                  });
                  setNewChat(false);
                })
              }
            >
              Open conversation
            </Button>
          }
        >
          {people.error ? (
            <ErrorState error={people.error} />
          ) : (
            <Choice
              label="Colleague"
              value={recipient}
              onChange={setRecipient}
              options={(people.data || [])
                .filter(
                  (p) => p.id !== actor && p.is_active && p.role !== "admin",
                )
                .map((p) => ({ value: p.id, label: p.full_name }))}
            />
          )}
        </Sheet>
      </Screen>
    </KeyboardAvoidingView>
  );
}
