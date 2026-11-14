import { AppState, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
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
import { retryTransientRead } from "../../shared/retryTransientRead";
import { readWithTimeout } from "../../shared/readTimeout";
import { authoritativeReadEpoch } from "../../shared/displayCache";
import { useAction } from "../../shared/useAction";
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
  readChatMessage,
  removeConversationMessage,
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
import {
  chatImageTypes,
  cleanupChatImage,
  uploadChatImage,
} from "./chatImages";
import { useComposerDraft } from "./useComposerDraft";
import { useChatHistorySync, type ChatHistory } from "./useChatHistorySync";
import { useChatAttachment } from "./useChatAttachment";
import { conversationLoadState } from "./conversationLoadState";
import { MentionedMessage } from "./MentionedMessage";
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
  const {
    profile,
    checkingAccess,
    accessError,
    refresh: refreshAccess,
  } = useAuth();
  const palette = useTheme();
  const actor = profile!.id;
  const focusedScreen = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const visible = focusedScreen && appState !== "background" && appState !== "inactive";
  useEffect(() => {
    const listener = AppState.addEventListener("change", setAppState);
    return () => listener.remove();
  }, []);
  const assertAccess = useAccountActionAccess();
  const contextual = !!(route.projectId || route.taskId);
  const [newChat, setNewChat] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [personQuery, setPersonQuery] = useState("");
  const [info, setInfo] = useState(false);
  const [dismissedMention, setDismissedMention] = useState<string>();
  const [pending, setPending] = useState<{
    scope: string;
    item: MessageDraft;
  }>();
  const action = useAction();
  const picker = useAction({ requireAccess: false });
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
  const members = useFacts(
    "chat-people:" + actor + ":" + channel?.id,
    () => listChatPeople(channel!.id),
    !!channel,
  );
  const messages = useFacts(
    "chat-messages:" + actor + ":" + channel?.id,
    () => retryTransientRead(() => loadMessages(channel!.id)),
    !!channel,
  );
  const [history, setHistory] = useState<ChatHistory>({ scope: "", rows: [] });
  const accessEpoch = authoritativeReadEpoch();
  const scope = JSON.stringify([actor, channel?.id, accessEpoch]);
  const composer = useComposerDraft(actor, channel?.id);
  const draft = composer.value;
  const attachment = useChatAttachment(actor, channel?.id);
  const image = attachment.file;
  const shown = useMemo(
    () =>
      mergeMessages(
        history.scope === scope ? history.rows : [],
        messages.data?.rows ?? [],
      ),
    [history, messages.data, scope],
  );
  const focusId =
    route.recordId !== dismissedMention ? route.recordId : undefined;
  const inHistory = shown.find((message) => message.id === focusId);
  const focused = useFacts(
    `chat-focus:${actor}:${channel?.id}:${focusId}`,
    () => readChatMessage(channel!.id, focusId!),
    !!channel && !!focusId && !inHistory,
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
    setDismissedMention(undefined);
  }, [scope]);
  useChatHistorySync({
    channelId: visible ? channel?.id : undefined,
    scope,
    accessEpoch,
    shown,
    recent: messages.data?.rows,
    setHistory,
    refreshRecent: messages.refresh,
    refreshPeople: members.refresh,
    focusId,
    refreshFocus: focused.refresh,
  });
  const send = () =>
    action.run(async () => {
      if (
        !channel ||
        channel.archived ||
        composer.loading ||
        recovery.loading ||
        recovery.error
      )
        return;
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor)
        throw new Error("Sign in again.");
      const current = (await loadChannels()).find(
        (item) => item.id === channel.id,
      );
      if (!current)
        throw new Error(
          "This conversation is no longer available to your account.",
        );
      if (current.archived) {
        void channels.refresh();
        throw new Error("This project chat is archived.");
      }
      assertAccess(actor);
      const item = original || {
        id: crypto.randomUUID(),
        text: draft,
        mentions: composer.draft.mentions,
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
        item.mentions,
      );
      await composer.clear();
      await attachment.set();
      await draftStore.remove(actor, "chat:" + channel.id);
      setPending((current) => (current?.scope === scope ? undefined : current));
      await Promise.all([
        messages.refresh(),
        channels.refresh(),
        recovery.refresh(),
      ]);
    });
  const pickImage = () =>
    void picker.run(async () => {
      if (image) {
        await attachment.set();
        return;
      }
      const [chosen] = await chooseFiles(chatImageTypes);
      if (chosen && currentScope.current === scope)
        await attachment.set(chosen);
    });
  const lastCreated = messages.data?.rows.at(-1)?.created_at;
  const readMarker = useRef<string | undefined>(undefined);
  // Opening an unread conversation marks it read, as Messenger does.
  // Failure leaves the unread state intact and retries on the next open.
  useEffect(() => {
    if (!visible) {
      readMarker.current = undefined;
      return;
    }
    if (!channel?.unread || !lastCreated || messages.error || checkingAccess || accessError) return;
    const marker = channel.id + ":" + lastCreated;
    if (readMarker.current === marker) return;
    readMarker.current = marker;
    void (async () => {
      try {
        assertAccess(actor);
        await readConversation(channel.id, lastCreated);
        nativeWindow.dispatchEvent({ type: conversationDirectoryChanged });
      } catch {
        if (readMarker.current === marker) readMarker.current = undefined;
        // The next focus or successful thread read can retry.
      }
    })();
  }, [visible, channel?.id, channel?.unread, lastCreated, messages.error, checkingAccess, accessError]);
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
              actor={actor}
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
    checkingAccess ||
    !!accessError ||
    attachment.loading ||
    !!attachment.error ||
    recovery.loading ||
    composer.loading ||
    !!recovery.error ||
    (!(original?.text ?? draft).trim() && !original?.imagePath && !image);
  const retryConversation = async () => {
    action.clear();
    if (accessError || action.error) await refreshAccess();
    await messages.refresh();
  };
  const historyState = conversationLoadState({
    loaded: !!messages.data,
    hasMessages: !!shown.length,
    checking: messages.loading || checkingAccess,
    readError: messages.error || accessError,
    sendError: action.error,
  });
  return (
    <ThreadFrame>
      <ThreadHeader
        actor={actor}
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
                    projectId:
                      channel.parentProjectId ||
                      channel.projectId ||
                      route.projectId,
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
      {!!focusId && !messages.error && !accessError && (
        <MentionedMessage
          actor={actor}
          message={inHistory ?? focused.data}
          pending={focused.loading}
          unavailable={!!focused.error}
          onClose={() => setDismissedMention(focusId)}
        />
      )}
      <MessageThread
        key={scope}
        actor={actor}
        channel={channel}
        messages={shown}
        people={members.error ? [] : (members.data ?? [])}
        busy={action.busy}
        placeholder={
          historyState === "unavailable" ? (
            <ErrorState
              error={messages.error || accessError}
              retry={() => void retryConversation()}
            />
          ) : historyState === "loading" ? (
            <Loading label="Loading messages" layout="messages" />
          ) : historyState === "empty" ? (
            <Empty
              kind="messages"
              compact
              title="No messages yet"
              description={channel.archived ? undefined : "Use the message field below to start the conversation."}
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
            if (channel.archived) return;
            await toggleMessageReaction(message.id, emoji);
            await messages.refresh();
          })
        }
        onPin={(message) =>
          void action.run(async () => {
            assertAccess(actor);
            if (channel.archived) return;
            await setMessagePin(message.id, !message.pinned_at);
            await messages.refresh();
          })
        }
        onRemove={(message) =>
          action.run(async () => {
            assertAccess(actor);
            if (channel.archived || message.sender_id !== actor)
              throw new Error("This message cannot be deleted.");
            const path = await removeConversationMessage(message.id);
            if (path) void cleanupChatImage(path).catch(() => {});
            const deleted = await readChatMessage(channel.id, message.id);
            if (deleted && currentScope.current === scope)
              setHistory((previous) =>
                previous.scope === scope
                  ? {
                      ...previous,
                      rows: mergeMessages(previous.rows, [deleted]),
                    }
                  : previous,
              );
            await Promise.all([
              messages.refresh(),
              channels.refresh(),
              focused.refresh(),
            ]);
          })
        }
      />
      {channel.archived ? (
        <Notice>
          This project chat is archived. You can still read its messages.
        </Notice>
      ) : (
        <Composer
          key={scope}
          value={original?.text ?? draft}
          mentionDraft={composer.draft}
          onMention={composer.setDraft}
          people={members.error ? [] : (members.data ?? [])}
          actor={actor}
          group={channel.kind !== "direct"}
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
          pickDisabled={action.busy || picker.busy || attachment.loading}
          busy={action.busy}
          sendDisabled={sendDisabled}
          onSend={() => void send()}
          error={
            <>
              {!!recovery.error && <ErrorState error={recovery.error} />}
              {!!composer.error && <ErrorState error={composer.error} />}
              {!!(picker.error || attachment.error) && (
                <ErrorState error={picker.error || attachment.error} />
              )}
              {!!action.error && (
                <ErrorState
                  context="action"
                  error={action.error}
                  retry={() => void retryConversation()}
                />
              )}
            </>
          }
        />
      )}
      <ConversationInfo
        actor={actor}
        channel={channel}
        messages={shown}
        open={info && !messages.error && !accessError}
        onClose={() => setInfo(false)}
        onChanged={async () => {
          nativeWindow.dispatchEvent({ type: conversationDirectoryChanged });
          await Promise.all([
            channels.refresh(),
            messages.refresh(),
            members.refresh(),
          ]);
        }}
      />
      {peopleSheet}
    </ThreadFrame>
  );
}
