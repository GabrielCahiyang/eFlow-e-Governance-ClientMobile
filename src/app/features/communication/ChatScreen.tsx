import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useTheme } from "../../components/ui/Appearance";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { readWithTimeout } from "../../shared/readTimeout";
import { authoritativeReadEpoch } from "../../shared/displayCache";
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
import { filterConversationContext } from "./conversationContext";
import { chatImageTypes, uploadChatImage } from "./chatImages";
import { useComposerDraft } from "./useComposerDraft";
import { ConversationInfo } from "./ConversationInfo";
import { ChatAvatar } from "./ChatAvatar";
import { ConversationList } from "./ConversationList";
import {
  Composer,
  MessageThread,
  ThreadFrame,
  ThreadHeader,
} from "./MessageThread";
import {
  filterConversations,
  type ConversationFilter,
} from "./chatPresentation";
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
  const [newChat, setNewChat] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [personQuery, setPersonQuery] = useState("");
  const [info, setInfo] = useState(false);
  const [pending, setPending] = useState<{
    scope: string;
    item: MessageDraft;
  }>();
  const [attachment, setAttachment] = useState<{
    scope: string;
    file: Awaited<ReturnType<typeof chooseFiles>>[number];
  }>();
  const action = useAction();
  const channels = useConversationDirectory(actor);
  const available = filterConversationContext(
    channels.data || [],
    route.taskId,
    undefined,
    route.projectId,
  );
  const matching = filterConversations(available, filter, query);
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
    hasOlder?: boolean;
  }>({ scope: "", rows: [] });
  const accessEpoch = authoritativeReadEpoch();
  const scope = JSON.stringify([actor, channel?.id, accessEpoch]);
  const composer = useComposerDraft(actor, channel?.id);
  const draft = composer.value;
  const image = attachment?.scope === scope ? attachment.file : undefined;
  const shown = useMemo(
    () =>
      mergeMessages(
        history.scope === scope ? history.rows : [],
        messages.data?.rows ?? [],
      ),
    [history, messages.data, scope],
  );
  const olderAvailable =
    !!shown.length &&
    (history.scope === scope
      ? (history.hasOlder ?? messages.data?.hasOlder)
      : messages.data?.hasOlder);
  const [olderStatus, setOlderStatus] = useState<{
    scope: string;
    loading: boolean;
    error?: Error;
  }>();
  const olderRequest = useRef<{
    cursor: string;
    controller: AbortController;
    state: "pending" | "done" | "failed";
  }>(undefined);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  useEffect(
    () => () => {
      olderRequest.current?.controller.abort();
      olderRequest.current = undefined;
    },
    [scope],
  );

  async function loadOlder(retry = false) {
    if (
      !channel ||
      !olderAvailable ||
      !messages.data ||
      messages.error ||
      currentScope.current !== scope
    )
      return;
    const before = shown[0];
    const active = olderRequest.current;
    if (
      active?.state === "pending" ||
      (active?.cursor === before.id && !(retry && active.state === "failed"))
    )
      return;
    const request: NonNullable<typeof olderRequest.current> = {
      cursor: before.id,
      controller: new AbortController(),
      state: "pending",
    };
    olderRequest.current = request;
    setOlderStatus({ scope, loading: true });
    const stillCurrent = () =>
      olderRequest.current === request &&
      currentScope.current === scope &&
      accessEpoch === authoritativeReadEpoch();
    try {
      assertAccess(actor);
      const batch = await readWithTimeout(() =>
        loadMessages(channel.id, before, request.controller.signal),
      );
      if (!stillCurrent()) return;
      setHistory((previous) =>
        previous.scope === scope
          ? {
              scope,
              rows: mergeMessages(batch.rows, previous.rows),
              hasOlder: batch.hasOlder,
            }
          : previous,
      );
      request.state = "done"; // Retain the cursor lock until a new oldest row renders.
      setOlderStatus(undefined);
    } catch (error) {
      request.controller.abort();
      if (!stillCurrent()) return;
      request.state = "failed";
      setOlderStatus({
        scope,
        loading: false,
        error:
          error instanceof Error
            ? error
            : new Error("Could not load older messages."),
      });
    }
  }
  useEffect(() => {
    if (messages.data)
      setHistory((previous) => ({
        scope,
        rows: mergeMessages(
          previous.scope === scope ? previous.rows : [],
          messages.data!.rows,
        ),
        hasOlder:
          previous.scope === scope
            ? (previous.hasOlder ?? messages.data!.hasOlder)
            : messages.data!.hasOlder,
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
  const original = pending?.scope === scope ? pending.item : recovery.data;
  useEffect(() => {
    setInfo(false);
  }, [scope]);
  useEffect(() => {
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
          if (
            currentScope.current !== scope ||
            accessEpoch !== authoritativeReadEpoch()
          )
            return;
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
              hasOlder:
                previous.scope === scope ? previous.hasOlder : undefined,
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
  }, [channel?.id, actor, scope]);
  const send = () =>
    action.run(async () => {
      if (!channel || composer.loading || recovery.loading || recovery.error)
        return;
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
      setPending({ scope, item });
      assertAccess(actor);
      await sendChat(
        item.id,
        channel.id,
        actor,
        profile!.full_name,
        item.text,
        item.imagePath,
      );
      await composer.clear();
      await draftStore.remove(actor, "chat:" + channel.id);
      setPending((current) => (current?.scope === scope ? undefined : current));
      setAttachment((current) =>
        current?.scope === scope ? undefined : current,
      );
      await Promise.all([
        messages.refresh(),
        channels.refresh(),
        recovery.refresh(),
      ]);
    });
  const pickImage = () =>
    void action.run(async () => {
      if (image) {
        setAttachment(undefined);
        return;
      }
      const [chosen] = await chooseFiles(chatImageTypes);
      if (chosen && currentScope.current === scope)
        setAttachment({ scope, file: chosen });
    });
  const lastCreated = messages.data?.rows.at(-1)?.created_at;
  const readMarker = useRef<string | undefined>(undefined);
  // Opening an unread conversation marks it read, as Messenger does.
  // Failure leaves the unread state intact and retries on the next open.
  useEffect(() => {
    if (!channel?.unread || !lastCreated) return;
    const marker = channel.id + ":" + lastCreated;
    if (readMarker.current === marker) return;
    readMarker.current = marker;
    void (async () => {
      try {
        assertAccess(actor);
        await readConversation(channel.id, lastCreated);
        nativeWindow.dispatchEvent({ type: conversationDirectoryChanged });
      } catch {
        // The directory keeps showing the authoritative unread state.
      }
    })();
  }, [channel?.id, channel?.unread, lastCreated]);
  const openPerson = (personId: string, name?: string | null) =>
    action.run(async () => {
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor)
        throw new Error("Sign in again.");
      assertAccess(actor);
      const id = await openDirectConversation(personId);
      await channels.refresh();
      navigate({ name: "messages", id, title: name || undefined });
      setNewChat(false);
    });
  const peopleSheet = (
    <Sheet
      open={newChat}
      title="New conversation"
      busy={action.busy}
      onClose={() => setNewChat(false)}
    >
      {people.error ? (
        <ErrorState error={people.error} />
      ) : (
        <View style={{ gap: 8 }}>
          <Field
            label="Search people"
            value={personQuery}
            onChangeText={setPersonQuery}
          />
          {!people.data ? (
            <Loading label="Loading people" layout="summary" />
          ) : (
            people.data
              .filter(
                (p) =>
                  p.id !== actor &&
                  (p.name || "")
                    .toLowerCase()
                    .includes(personQuery.trim().toLowerCase()),
              )
              .map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${p.name || "Colleague"}`}
                  disabled={action.busy}
                  onPress={() => void openPerson(p.id, p.name)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 56,
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderRadius: 14,
                    opacity: action.busy ? 0.6 : 1,
                    backgroundColor: pressed
                      ? palette.glassSurface
                      : "transparent",
                  })}
                >
                  <ChatAvatar name={p.name} size={44} />
                  <Text style={{ flex: 1, fontWeight: "600" }}>
                    {p.name || "Colleague"}
                  </Text>
                </Pressable>
              ))
          )}
          {!!action.error && (
            <ErrorState context="action" error={action.error} />
          )}
        </View>
      )}
    </Sheet>
  );
  if (!channel)
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Screen
          compact
          onRefresh={() => channels.refresh()}
          description={undefined}
        >
          {channels.error ? (
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
          ) : (
            <ConversationList
              channels={matching}
              total={available.length}
              query={query}
              onQuery={setQuery}
              filter={filter}
              onFilter={setFilter}
              onOpen={(item) =>
                navigate({
                  ...route,
                  name: "messages",
                  id: item.id,
                  title: item.name,
                })
              }
              onCompose={!contextual ? () => setNewChat(true) : undefined}
              composeDisabled={action.busy}
            />
          )}
          {!!action.error && !newChat && (
            <ErrorState context="action" error={action.error} />
          )}
          {peopleSheet}
        </Screen>
      </KeyboardAvoidingView>
    );
  const sendDisabled =
    (channels.loading && !channels.data) ||
    (messages.loading && !messages.data) ||
    !!messages.error ||
    recovery.loading ||
    composer.loading ||
    !!recovery.error ||
    (!(original?.text ?? draft).trim() && !original?.imagePath && !image);
  return (
    <ThreadFrame>
      <ThreadHeader
        channel={channel}
        onInfo={() => setInfo(true)}
        shortcut={
          channel.taskId
            ? {
                label: "Open task",
                onPress: () =>
                  navigate({
                    name: "task",
                    id: channel.taskId,
                    projectId: channel.projectId || route.projectId,
                  }),
              }
            : channel.projectId
              ? {
                  label: "Open project",
                  onPress: () =>
                    navigate({ name: "project", id: channel.projectId }),
                }
              : undefined
        }
      />
      <MessageThread
        key={scope}
        actor={actor}
        channel={channel}
        messages={shown}
        busy={action.busy}
        placeholder={
          messages.error ? (
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
          ) : undefined
        }
        onLoadOlder={
          olderAvailable ? (retry) => void loadOlder(retry) : undefined
        }
        loadingOlder={olderStatus?.scope === scope && olderStatus.loading}
        olderError={
          olderStatus?.scope === scope ? olderStatus.error : undefined
        }
        onReact={(message, emoji) =>
          void action.run(async () => {
            assertAccess(actor);
            await toggleMessageReaction(message.id, emoji);
            await messages.refresh();
          })
        }
        onPin={(message) =>
          void action.run(async () => {
            assertAccess(actor);
            await setMessagePin(message.id, !message.pinned_at);
            await messages.refresh();
          })
        }
      />
      <Composer
        value={original?.text ?? draft}
        onChange={composer.setValue}
        onBlur={composer.onBlur}
        editable={
          !original &&
          !action.busy &&
          !composer.loading &&
          !recovery.loading &&
          !recovery.error
        }
        imageName={image?.name}
        onPickImage={original ? undefined : pickImage}
        pickDisabled={action.busy}
        busy={action.busy}
        sendDisabled={sendDisabled}
        onSend={() => void send()}
        notice={
          original ? (
            <Notice>
              A pending message is retained. Send again to retry the same
              message identity.
            </Notice>
          ) : undefined
        }
        error={
          <>
            {!!recovery.error && <ErrorState error={recovery.error} />}
            {!!composer.error && <ErrorState error={composer.error} />}
            {!!action.error && (
              <ErrorState context="action" error={action.error} />
            )}
          </>
        }
      />
      <ConversationInfo
        actor={actor}
        channel={channel}
        messages={shown}
        open={info}
        onClose={() => setInfo(false)}
      />
      {peopleSheet}
    </ThreadFrame>
  );
}
