import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
  type AccessibilityActionEvent,
} from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import ImagePlus from "lucide-react-native/icons/image-plus";
import Info from "lucide-react-native/icons/info";
import Pin from "lucide-react-native/icons/pin";
import PinOff from "lucide-react-native/icons/pin-off";
import Trash2 from "lucide-react-native/icons/trash";
import X from "lucide-react-native/icons/x";
import { brandColors, withOpacity } from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { useNavigationHeader } from "../navigation/navigationHeaderContext";
import { Text } from "../../components/ui/Typography";
import { Button, ErrorState, Sheet } from "../../components/ui";
import { ChatAvatar } from "./ChatAvatar";
import { ChatImage } from "./chatImages";
import {
  buildThreadItems,
  conversationKindLabel,
  quickReactions,
  reactionSummary,
  timeLabel,
  type ThreadItem,
} from "./chatPresentation";
import type { Channel, ChatPerson, Message } from "./services";
import { parseMessage } from "../../../core/web/app/features/chat-calls/services/chatMessageCodec";
import {
  CHAT_TEXT_LIMIT,
  findMentionQuery,
  insertChatMention,
  mentionHighlights,
  type ChatDraft,
} from "../../../core/web/app/features/chat-calls/services/chatMentions";
import { messagePreview } from "./messageHistory";
import { MentionSuggestions } from "./MentionSuggestions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      () => setVisible(true),
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Full-height conversation container that lifts the header, messages and
 * composer above the keyboard (like Messenger) instead of being covered.
 * Android is edge-to-edge, so the window does not resize and padding is
 * required on both platforms. The screen's offset from the window top is
 * measured so the native header does not leave the composer partly hidden.
 */
export function ThreadFrame({ children }: { children: ReactNode }) {
  const palette = useTheme();
  const frame = useRef<ComponentRef<typeof View>>(null);
  const [offset, setOffset] = useState(0);
  return (
    <View
      ref={frame}
      style={{ flex: 1, backgroundColor: palette.background }}
      onLayout={() =>
        frame.current?.measureInWindow((_x, y) => setOffset(Math.max(0, y)))
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

export function ThreadHeader({
  actor,
  channel,
  onInfo,
  shortcut,
}: {
  actor: string;
  channel: Channel;
  onInfo: () => void;
  shortcut?: { label: string; onPress: () => void };
}) {
  const palette = useTheme();
  const navHeader = useNavigationHeader();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: (navHeader?.topInset ?? 0) + 8,
        paddingBottom: 8,
        backgroundColor: palette.surface,
        borderBottomWidth: 1,
        borderColor: palette.border,
      }}
    >
      {!!navHeader?.onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint={navHeader.backHint}
          onPress={navHeader.onBack}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: pressed ? palette.primarySoft : palette.background,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          })}
        >
          <ArrowLeft size={17} color={palette.text} />
        </Pressable>
      )}
      <ChatAvatar
        name={channel.name}
        kind={channel.kind}
        size={40}
        actor={actor}
        path={channel.avatarPath}
      />
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          accessibilityRole="header"
          style={{ fontSize: 16, lineHeight: 22, fontWeight: "700" }}
        >
          {channel.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, lineHeight: 16, color: palette.mutedLabel }}
        >
          {channel.kind === "task" && channel.projectTitle
            ? `Task chat · ${channel.projectTitle}`
            : conversationKindLabel(channel.kind)}
        </Text>
      </View>
      {shortcut && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shortcut.label}
          hitSlop={4}
          onPress={shortcut.onPress}
          style={({ pressed }) => ({
            minHeight: 34,
            justifyContent: "center",
            paddingHorizontal: 11,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: withOpacity(palette.primary, 0.2),
            backgroundColor: pressed ? palette.background : palette.primarySoft,
          })}
        >
          <Text
            style={{ fontSize: 12.5, fontWeight: "700", color: palette.primary }}
          >
            {shortcut.label}
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Conversation info"
        hitSlop={6}
        onPress={onInfo}
        style={({ pressed }) => ({
          width: 34,
          height: 34,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: pressed ? palette.primarySoft : palette.background,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        })}
      >
        <Info size={17} color={palette.primary} />
      </Pressable>
    </View>
  );
}

export function MessageThread({
  actor,
  channel,
  messages,
  placeholder,
  onLoadOlder,
  loadingOlder,
  olderError,
  onReact,
  onPin,
  onRemove,
  onOpenInfo,
  people,
  busy,
}: {
  actor: string;
  channel: Channel;
  messages: Message[];
  /** Replaces the list while loading, failed, or empty. */
  placeholder?: ReactNode;
  onLoadOlder?: (retry?: boolean) => void;
  loadingOlder?: boolean;
  olderError?: Error;
  onReact: (message: Message, emoji: string) => void;
  onPin: (message: Message) => void;
  onRemove: (message: Message) => Promise<boolean>;
  onOpenInfo?: () => void;
  people: ChatPerson[];
  busy?: boolean;
}) {
  const palette = useTheme();
  const [stamped, setStamped] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  const latestPinned = useMemo(
    () =>
      onOpenInfo
        ? [...messages].reverse().find((m) => !!m.pinned_at && !m.deleted_at)
        : undefined,
    [messages, onOpenInfo],
  );
  const nicknames = useMemo(
    () => new Map(people.map((person) => [person.id, person.nickname])),
    [people],
  );
  const closeActions = () => {
    setSelected(undefined);
    setConfirmRemoval(false);
    setRemoveFailed(false);
  };
  // Inverted list: newest at the bottom, scroll position anchored there.
  const data = useMemo(
    () => buildThreadItems(messages, actor).reverse(),
    [messages, actor],
  );
  const previousOldest = useRef<string | undefined>(undefined);
  const contentHeight = useRef(0);
  const [historyHeight, setHistoryHeight] = useState(0);
  const oldest = messages[0]?.id;
  const addingHistory =
    previousOldest.current !== oldest &&
    messages.findIndex((message) => message.id === previousOldest.current) > 0;
  // VirtualizedList can briefly shrink as the old footer disappears before
  // the new cells are measured. Keep the old height so native scrolling
  // doesn't clamp the current offset during that layout pass.
  const minimumHeight = addingHistory ? contentHeight.current : historyHeight;
  useLayoutEffect(() => {
    if (addingHistory) setHistoryHeight(minimumHeight);
    previousOldest.current = oldest;
  }, [addingHistory, minimumHeight, oldest]);
  if (placeholder)
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        {placeholder}
      </View>
    );
  const current = channel.archived
    ? undefined
    : messages.find(
        (m) => m.id === selected && !m.deleted_at && !m.activity_kind,
      );
  return (
    <>
      {!!latestPinned && !!onOpenInfo && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View pinned message in Conversation info"
          onPress={onOpenInfo}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: pressed
              ? withOpacity(palette.primary, 0.14)
              : palette.primarySoft,
            borderBottomWidth: 1,
            borderColor: palette.border,
          })}
        >
          <Pin size={13} color={palette.primary} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 12.5,
              fontWeight: "600",
              color: palette.primary,
            }}
          >
            Pinned:{" "}
            {parseMessage(latestPinned.content).text.trim() || "Attachment"}
          </Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: "700",
              color: palette.primary,
            }}
          >
            Info
          </Text>
        </Pressable>
      )}
      <FlatList
        inverted
        style={{ flex: 1 }}
        data={data}
        keyExtractor={(item) => item.message.id}
        // Native anchoring handles incoming messages at the newest edge.
        maintainVisibleContentPosition={
          addingHistory
            ? undefined
            : {
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 32,
              }
        }
        onEndReached={
          onLoadOlder && !olderError ? () => onLoadOlder() : undefined
        }
        onEndReachedThreshold={0.5}
        onScrollBeginDrag={() => setHistoryHeight(0)}
        onContentSizeChange={(_width, height) => {
          contentHeight.current = height;
          if (historyHeight && height > historyHeight + 1) setHistoryHeight(0);
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: minimumHeight,
        }}
        ListFooterComponent={
          onLoadOlder ? (
            <View style={{ minHeight: 36, justifyContent: "center" }}>
              {olderError ? (
                <ErrorState
                  error={olderError}
                  retry={() => onLoadOlder(true)}
                />
              ) : loadingOlder ? (
                <Text
                  accessibilityRole="progressbar"
                  accessibilityLiveRegion="polite"
                  style={{ color: palette.mutedLabel, textAlign: "center" }}
                >
                  Loading older messages…
                </Text>
              ) : null}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Bubble
            item={item}
            actor={actor}
            direct={channel.kind === "direct"}
            readOnly={!!channel.archived}
            nickname={nicknames.get(item.message.sender_id)}
            showTime={stamped === item.message.id}
            onTap={() =>
              setStamped((id) =>
                id === item.message.id ? undefined : item.message.id,
              )
            }
            onMore={() => setSelected(item.message.id)}
            onReact={(emoji) => onReact(item.message, emoji)}
          />
        )}
      />
      <Sheet
        open={!!current}
        title="Message"
        busy={busy}
        onClose={closeActions}
      >
        {current && confirmRemoval ? (
          <View style={{ gap: 12 }}>
            <Text>Delete this message for everyone in the conversation?</Text>
            {removeFailed && (
              <ErrorState error="Could not confirm deletion. Try again." />
            )}
            <Button
              variant="outline"
              disabled={busy}
              icon={<X size={16} color={palette.primary} />}
              onPress={() => setConfirmRemoval(false)}
            >
              Keep message
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              icon={<Trash2 size={16} color={palette.onDanger} />}
              onPress={async () => {
                if (await onRemove(current)) closeActions();
                else setRemoveFailed(true);
              }}
            >
              Delete message
            </Button>
          </View>
        ) : (
          current && (
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 4,
                }}
              >
                {quickReactions.map((emoji) => {
                  const mine = !!current.reaction_users?.[emoji]?.[actor];
                  return (
                    <Pressable
                      key={emoji}
                      accessibilityRole="button"
                      accessibilityLabel={`React ${emoji}`}
                      accessibilityState={{ selected: mine }}
                      disabled={busy}
                      onPress={() => {
                        onReact(current, emoji);
                        closeActions();
                      }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: mine
                          ? palette.primarySoft
                          : palette.glassSurface,
                      }}
                    >
                      <Text style={{ fontSize: 24, lineHeight: 30 }}>
                        {emoji}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Button
                variant="outline"
                disabled={busy}
                icon={
                  current.pinned_at ? (
                    <PinOff size={16} color={palette.primary} />
                  ) : (
                    <Pin size={16} color={palette.primary} />
                  )
                }
                onPress={() => {
                  onPin(current);
                  closeActions();
                }}
              >
                {current.pinned_at ? "Unpin message" : "Pin message"}
              </Button>
              {current.sender_id === actor && (
                <Button
                  variant="outline"
                  disabled={busy}
                  icon={<Trash2 size={16} color={palette.primary} />}
                  onPress={() => setConfirmRemoval(true)}
                >
                  Delete for everyone
                </Button>
              )}
            </View>
          )
        )}
      </Sheet>
    </>
  );
}

function Bubble({
  item,
  actor,
  direct,
  readOnly,
  nickname,
  showTime,
  onTap,
  onMore,
  onReact,
}: {
  item: ThreadItem;
  actor: string;
  direct: boolean;
  readOnly: boolean;
  nickname?: string | null;
  showTime: boolean;
  onTap: () => void;
  onMore: () => void;
  onReact: (emoji: string) => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { message, mine, first, last, separator } = item;
  const sender = nickname || message.sender_name;
  const parsed = parseMessage(message.content);
  const body = parsed.text;
  const hasText = !!body.trim();
  if (message.deleted_at || message.activity_kind)
    return (
      <Text
        style={{
          alignSelf: message.activity_kind
            ? "center"
            : mine
              ? "flex-end"
              : "flex-start",
          color: palette.mutedLabel,
          fontSize: 12.5,
          fontStyle: message.deleted_at ? "italic" : "normal",
          marginHorizontal: 12,
          marginVertical: 8,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
      >
        {messagePreview(message, actor)}
      </Text>
    );
  const reactions = reactionSummary(message, actor);
  const fill = mine ? palette.primary : palette.surface;
  const ink = mine ? palette.onPrimary : palette.text;
  const big = 18,
    small = 5;
  const corners = mine
    ? {
        borderTopLeftRadius: big,
        borderBottomLeftRadius: big,
        borderTopRightRadius: first ? big : small,
        borderBottomRightRadius: last ? big : small,
      }
    : {
        borderTopRightRadius: big,
        borderBottomRightRadius: big,
        borderTopLeftRadius: first ? big : small,
        borderBottomLeftRadius: last ? big : small,
      };
  const label = `${mine ? "You" : sender}: ${
    body || "Image attachment"
  }, ${timeLabel(message.created_at)}`;
  return (
    <View style={{ marginTop: first ? 8 : 2 }}>
      {!!separator && (
        <View
          style={{
            alignSelf: "center",
            marginVertical: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
        >
          <Text
            style={{
              fontSize: 11.5,
              lineHeight: 15,
              fontWeight: "600",
              color: palette.mutedLabel,
            }}
          >
            {separator}
          </Text>
        </View>
      )}
      {!mine && !direct && first && (
        <Text
          numberOfLines={1}
          style={{
            marginLeft: 40,
            marginBottom: 2,
            fontSize: 12,
            lineHeight: 16,
            color: palette.mutedLabel,
          }}
        >
          {sender}
        </Text>
      )}
      <View
        style={{
          flexDirection: mine ? "row-reverse" : "row",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {!mine && (
          <View style={{ width: 32 }}>
            {last && <ChatAvatar name={sender} size={32} />}
          </View>
        )}
        <View
          style={{
            maxWidth: "78%",
            alignItems: mine ? "flex-end" : "flex-start",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={
              readOnly
                ? "Double tap to show the time."
                : "Double tap for the time. Hold for message actions."
            }
            accessibilityActions={
              readOnly ? [] : [{ name: "longpress", label: "Message actions" }]
            }
            onAccessibilityAction={(event: AccessibilityActionEvent) => {
              if (event.nativeEvent.actionName === "longpress") onMore();
            }}
            onPress={onTap}
            onLongPress={readOnly ? undefined : onMore}
            delayLongPress={280}
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              borderRadius: big,
              overflow: "hidden",
              backgroundColor: hasText ? fill : "transparent",
              borderWidth: hasText && !mine ? 1 : 0,
              borderColor: palette.border,
              paddingHorizontal: hasText ? 14 : 0,
              paddingVertical: hasText ? 8 : 0,
              gap: 6,
              ...corners,
            })}
          >
            {!!parsed.replyToText && (
              <Text
                numberOfLines={2}
                style={{ color: ink, fontSize: 12, opacity: 0.8 }}
              >
                {parsed.replyToName ? `${parsed.replyToName}: ` : ""}
                {parsed.replyToText}
              </Text>
            )}
            {hasText && (
              <Text
                selectable={false}
                style={{ color: ink, fontSize: 15, lineHeight: 21 }}
              >
                {highlightMentions(body, parsed.mentions ?? [], !direct)}
              </Text>
            )}
            {!!message.image_path && (
              <ChatImage
                actor={actor}
                path={message.image_path}
                resizeMode="cover"
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 14,
                  ...(hasText
                    ? { marginHorizontal: -6, marginBottom: -2 }
                    : {}),
                }}
              />
            )}
          </Pressable>
          {(reactions.length > 0 || !!message.pinned_at) && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 4,
                marginTop: -6,
                zIndex: 1,
              }}
            >
              {!!message.pinned_at && (
                <View
                  accessibilityLabel="Pinned"
                  style={{
                    minHeight: 24,
                    paddingHorizontal: 6,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.surface,
                    borderWidth: 1,
                    borderColor: palette.border,
                  }}
                >
                  <Pin size={12} color={palette.primary} />
                </View>
              )}
              {reactions.map((r) => (
                <Pressable
                  key={r.emoji}
                  accessibilityRole="button"
                  disabled={readOnly}
                  accessibilityLabel={`${r.emoji} ${r.count}${
                    r.mine ? ", your reaction. Double tap to remove" : ""
                  }`}
                  hitSlop={8}
                  onPress={() => onReact(r.emoji)}
                  style={{
                    minHeight: 24,
                    paddingHorizontal: 7,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: r.mine
                      ? palette.primarySoft
                      : palette.surface,
                    borderWidth: 1,
                    borderColor: r.mine ? palette.primary : palette.border,
                  }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 16 }}>
                    {r.emoji}
                  </Text>
                  {r.count > 1 && (
                    <Text
                      style={{
                        fontSize: 11,
                        lineHeight: 14,
                        color: palette.muted,
                      }}
                    >
                      {r.count}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
          {showTime && (
            <Text
              style={{
                marginTop: 4,
                fontSize: 11,
                lineHeight: 14,
                color: palette.mutedLabel,
              }}
            >
              {timeLabel(message.created_at)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function highlightMentions(
  text: string,
  mentions: NonNullable<ReturnType<typeof parseMessage>["mentions"]>,
  group: boolean,
) {
  const spans: ReactNode[] = [];
  let offset = 0;
  for (const { start, label } of mentionHighlights(text, mentions, group)) {
    if (start < offset) continue;
    spans.push(
      text.slice(offset, start),
      <Text key={start} style={{ fontWeight: "800" }}>
        {label}
      </Text>,
    );
    offset = start + label.length;
  }
  return offset ? [...spans, text.slice(offset)] : text;
}

export function Composer({
  value,
  onChange,
  mentionDraft,
  onMention,
  people,
  actor,
  group,
  onBlur,
  editable,
  imageName,
  onPickImage,
  pickDisabled,
  onSend,
  sendDisabled,
  busy,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  mentionDraft: ChatDraft;
  onMention: (value: ChatDraft) => void;
  people: ChatPerson[];
  actor: string;
  group: boolean;
  onBlur?: () => void;
  editable: boolean;
  imageName?: string;
  onPickImage?: () => void;
  pickDisabled?: boolean;
  onSend: () => void;
  sendDisabled: boolean;
  busy?: boolean;
  error?: ReactNode;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const keyboard = useKeyboardVisible();
  const inset = useSafeAreaInsets();
  const accent = palette.primary;
  const hasContent = !sendDisabled;
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [forced, setForced] = useState<typeof selection>();
  const query =
    editable && selection.start === selection.end
      ? findMentionQuery(value, Math.min(selection.end, value.length))
      : undefined;
  const insert = (label: string, id?: string) => {
    if (!query) return;
    const result = insertChatMention(mentionDraft, query, label, id);
    if (!result) return;
    onMention(result.draft);
    const caret = { start: result.caret, end: result.caret };
    setSelection(caret);
    setForced(caret);
    input.current?.focus();
  };
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 10,
        paddingTop: 8,
        // The conversation hides the tab bar, so the composer owns the
        // gesture-bar inset; it is dropped while the keyboard is open.
        paddingBottom: keyboard ? 8 : 8 + inset.bottom,
        gap: 8,
      }}
    >
      {error}
      {query && (
        <MentionSuggestions
          query={query.term}
          people={people}
          actor={actor}
          group={group}
          onSelect={insert}
        />
      )}
      {!!imageName && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            alignSelf: "flex-start",
            maxWidth: "100%",
            minHeight: 36,
            paddingLeft: 12,
            borderRadius: 18,
            backgroundColor: palette.primarySoft,
          }}
        >
          <ImagePlus size={16} color={palette.primary} />
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 13, color: palette.primary }}
          >
            {imageName}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${imageName}`}
            disabled={busy || pickDisabled || !onPickImage}
            onPress={onPickImage}
            style={{
              width: 44,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} color={palette.primary} />
          </Pressable>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        {!!onPickImage && !imageName && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach image"
            disabled={pickDisabled}
            hitSlop={4}
            onPress={onPickImage}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? withOpacity(palette.primary, 0.2)
                : palette.primarySoft,
              opacity: pickDisabled ? 0.4 : 1,
              marginBottom: 2,
            })}
          >
            <ImagePlus size={20} color={accent} />
          </Pressable>
        )}
        <View
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 132,
            justifyContent: "center",
            paddingHorizontal: 15,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: isDark ? palette.background : "#f7f9fd",
          }}
        >
          <TextInput
            ref={input}
            accessibilityLabel="Message"
            placeholder="Write a message…"
            placeholderTextColor={palette.mutedLabel}
            value={value}
            onChangeText={(text) => {
              setForced(undefined);
              onChange(text);
            }}
            selection={forced}
            onSelectionChange={(event) => {
              const next = event.nativeEvent.selection;
              if (
                forced &&
                (next.start !== forced.start || next.end !== forced.end)
              )
                return;
              setForced(undefined);
              setSelection(next);
            }}
            onBlur={onBlur}
            editable={editable}
            multiline
            maxLength={CHAT_TEXT_LIMIT}
            style={{
              fontSize: 15,
              color: palette.text,
              fontFamily: "HostGrotesk_400Regular",
              paddingVertical: 10,
              maxHeight: 128,
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? "Sending" : "Send message"}
          accessibilityState={{ disabled: !hasContent || !!busy, busy: !!busy }}
          disabled={!hasContent || !!busy}
          onPress={onSend}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hasContent ? accent : palette.glassSurface,
            opacity: busy ? 0.6 : 1,
            marginBottom: 1,
          }}
        >
          <ArrowUp
            size={20}
            color={hasContent ? palette.onPrimary : palette.mutedLabel}
          />
        </Pressable>
      </View>
    </View>
  );
}
