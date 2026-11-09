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
import { draftStore } from "../../../platform/draftStore";
import { chooseFiles } from "../../../platform/files";
import { nativeWindow } from "../../../platform/webRuntime";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import type { AppRoute, Navigate } from "../../shared/routes";
import {
  loadChannels,
  loadMessages,
  sendChat,
  listChatPeople,
  openDirectConversation,
  readConversation,
  setMessagePin,
  toggleMessageReaction,
  type Message,
} from "./services";
import {
  mergeMessages,
  isMessageDraft,
  type MessageDraft,
} from "./messageHistory";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { filterConversationContext } from "./conversationContext";
import { ChatImage, chatImageTypes, uploadChatImage } from "./chatImages";
import { ConversationInfo } from "./ConversationInfo";
import {
  conversationDirectoryChanged,
  useConversationDirectory,
} from "./useConversationDirectory";
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
  const assertAccess = useAccountActionAccess();
  const contextual = !!(route.projectId || route.taskId);
  const [draft, setDraft] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [query, setQuery] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [info, setInfo] = useState(false);
  const [pending, setPending] = useState<MessageDraft>();
  const [image, setImage] =
    useState<Awaited<ReturnType<typeof chooseFiles>>[number]>();
  const action = useAction();
  const channels = useConversationDirectory(actor);
  const available = filterConversationContext(
    channels.data || [],
    route.taskId,
    undefined,
    route.projectId,
  );
  const matching = available.filter((item) =>
    [item.name, item.projectTitle, item.lastMessage].some((value) =>
      value?.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );
  const channel = channels.error
    ? undefined
    : route.id
      ? available.find((item) => item.id === route.id)
      : route.taskId
        ? available[0]
        : route.projectId
          ? available.find(
              (item) =>
                item.kind === "project" && item.projectId === route.projectId,
            )
          : undefined;
  const people = useFacts(
    "chat-directory:" + actor,
    () => listChatPeople(),
    newChat,
  );
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
      return saved as MessageDraft | null;
    },
    !!channel,
  );
  const original = pending || recovery.data;
  useEffect(() => {
    setDraft("");
    setPending(undefined);
    setImage(undefined);
    setInfo(false);
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void messages.refresh();
      });
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
      if (!(await loadChannels()).some((item) => item.id === channel.id))
        throw new Error(
          "This conversation is no longer available to your account.",
        );
      assertAccess(actor);
      const item = original || {
        id: crypto.randomUUID(),
        text: draft,
        imagePath: image
          ? await uploadChatImage(channel.id, actor, image)
          : undefined,
      };
      if (!item.text.trim() && !item.imagePath) return;
      await draftStore.set(actor, "chat:" + channel.id, item);
      setPending(item);
      assertAccess(actor);
      await sendChat(
        item.id,
        channel.id,
        actor,
        profile!.full_name,
        item.text,
        item.imagePath,
      );
      await draftStore.remove(actor, "chat:" + channel.id);
      setPending(undefined);
      setDraft("");
      setImage(undefined);
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
              {!original && (
                <Button
                  variant="outline"
                  disabled={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      if (image) {
                        setImage(undefined);
                        return;
                      }
                      const [chosen] = await chooseFiles(chatImageTypes);
                      if (chosen) setImage(chosen);
                    })
                  }
                >
                  {image ? `Remove ${image.name}` : "Attach image"}
                </Button>
              )}
              <Button
                busy={action.busy}
                disabled={
                  (channels.loading && !channels.data) ||
                  (messages.loading && !messages.data) ||
                  !!messages.error ||
                  recovery.loading ||
                  !!recovery.error ||
                  !(
                    (original?.text || draft).trim() ||
                    original?.imagePath ||
                    image
                  )
                }
                onPress={() => void send()}
              >
                {original ? "Retry original message" : "Send message"}
              </Button>
              {!!recovery.error && <ErrorState error={recovery.error} />}
              {!!action.error && (
                <ErrorState context="action" error={action.error} />
              )}
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
                ? "Conversations for this project."
                : "Project, task, Office and direct conversations."
            : undefined
        }
        onRefresh={() => (channel ? messages.refresh() : channels.refresh())}
        actions={
          channel ? (
            <Button variant="outline" onPress={() => setInfo(true)}>
              Conversation info
            </Button>
          ) : !contextual && !route.id ? (
            <Button disabled={action.busy} onPress={() => setNewChat(true)}>
              New conversation
            </Button>
          ) : undefined
        }
      >
        {!channel && !contextual && !route.id && (
          <Field
            label="Search conversations"
            value={query}
            onChangeText={setQuery}
          />
        )}
        {!channel ? (
          channels.error ? (
            <ErrorState
              error={channels.error}
              retry={() => void channels.refresh()}
            />
          ) : !channels.data ? (
            <Loading label="Loading conversations" layout="navigation" />
          ) : route.id || route.taskId || route.projectId ? (
            <Empty
              title="Conversation unavailable"
              description="This account has no authorized conversation at this location."
            />
          ) : !matching.length ? (
            <Empty
              kind="messages"
              title={
                query.trim()
                  ? "No matching conversations"
                  : "No conversations yet"
              }
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
            matching.map((item) => (
              <NavigationRow
                key={item.id}
                title={item.name}
                icon={
                  item.unread ? (
                    <View
                      accessibilityLabel="Unread"
                      style={{
                        backgroundColor: palette.primary,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                      }}
                    />
                  ) : undefined
                }
                description={
                  item.lastMessage ||
                  (item.kind === "direct"
                    ? "Direct"
                    : item.kind === "org"
                      ? "Office"
                      : item.kind === "project"
                        ? "Project"
                        : "Task")
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
                    projectId: channel.projectId || route.projectId,
                  })
                }
              >
                Open task
              </Button>
            )}
            {!channel.taskId && !!channel.projectId && (
              <Button
                variant="outline"
                onPress={() =>
                  navigate({ name: "project", id: channel.projectId })
                }
              >
                Open project
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
                    gap: 5,
                    padding: 12,
                    borderRadius: 16,
                    width: "88%",
                    alignSelf:
                      message.sender_id === actor ? "flex-end" : "flex-start",
                    backgroundColor:
                      message.sender_id === actor
                        ? palette.primarySoft
                        : palette.surface,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>
                    {message.sender_name}
                  </Text>
                  <Text selectable>{message.content}</Text>
                  {!!message.image_path && (
                    <ChatImage actor={actor} path={message.image_path} />
                  )}
                  <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                    {dateLabel(message.created_at)}
                  </Text>
                  <View
                    style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
                  >
                    <Button
                      variant="outline"
                      onPress={() =>
                        void action.run(async () => {
                          assertAccess(actor);
                          await toggleMessageReaction(message.id, "👍");
                          await messages.refresh();
                        })
                      }
                    >
                      👍{" "}
                      {Object.keys(message.reaction_users?.["👍"] || {}).length}
                    </Button>
                    <Button
                      variant="outline"
                      onPress={() =>
                        void action.run(async () => {
                          assertAccess(actor);
                          await setMessagePin(message.id, !message.pinned_at);
                          await messages.refresh();
                        })
                      }
                    >
                      {message.pinned_at ? "Unpin" : "Pin"}
                    </Button>
                  </View>
                </View>
              ))
            )}
            {channel.unread && !messages.error && !!messages.data?.length && (
              <Button
                variant="outline"
                onPress={() =>
                  void action.run(async () => {
                    assertAccess(actor);
                    await readConversation(
                      channel.id,
                      messages.data!.at(-1)!.created_at,
                    );
                    nativeWindow.dispatchEvent({
                      type: conversationDirectoryChanged,
                    });
                    await channels.refresh();
                  })
                }
              >
                Mark conversation read
              </Button>
            )}
            <ConversationInfo
              actor={actor}
              channel={channel}
              messages={shown}
              open={info}
              onClose={() => setInfo(false)}
            />
          </>
        )}
        {!channel && !!action.error && (
          <ErrorState context="action" error={action.error} />
        )}
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
                  assertAccess(actor);
                  const id = await openDirectConversation(recipient);
                  await channels.refresh();
                  navigate({
                    name: "messages",
                    id,
                    title:
                      people.data?.find((p) => p.id === recipient)?.name ||
                      undefined,
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
            <>
              <Field
                label="Search people"
                value={personQuery}
                onChangeText={setPersonQuery}
              />
              <Choice
                label="Colleague"
                value={recipient}
                onChange={setRecipient}
                options={(people.data || [])
                  .filter(
                    (p) =>
                      p.id !== actor &&
                      (p.name || "")
                        .toLowerCase()
                        .includes(personQuery.trim().toLowerCase()),
                  )
                  .map((p) => ({ value: p.id, label: p.name || "Colleague" }))}
              />
            </>
          )}
        </Sheet>
      </Screen>
    </KeyboardAvoidingView>
  );
}
