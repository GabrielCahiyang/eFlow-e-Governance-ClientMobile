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
import ArrowUp from "lucide-react-native/icons/arrow-up";
import ImagePlus from "lucide-react-native/icons/image-plus";
import Info from "lucide-react-native/icons/info";
import Pin from "lucide-react-native/icons/pin";
import X from "lucide-react-native/icons/x";
import { brandColors } from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
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
import type { Channel, Message } from "./services";
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
  channel,
  onInfo,
  shortcut,
}: {
  channel: Channel;
  onInfo: () => void;
  shortcut?: { label: string; onPress: () => void };
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: palette.surface,
        borderBottomWidth: 1,
        borderColor: palette.border,
      }}
    >
      <ChatAvatar name={channel.name} kind={channel.kind} size={40} />
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
          {channel.projectTitle || conversationKindLabel(channel.kind)}
        </Text>
      </View>
      {shortcut && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shortcut.label}
          onPress={shortcut.onPress}
          style={{
            minHeight: 44,
            justifyContent: "center",
            paddingHorizontal: 12,
            borderRadius: 22,
            backgroundColor: palette.primarySoft,
          }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: palette.primary }}
          >
            {shortcut.label}
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Conversation info"
        hitSlop={4}
        onPress={onInfo}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Info size={22} color={palette.primary} />
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
  busy?: boolean;
}) {
  const palette = useTheme();
  const [stamped, setStamped] = useState<string>();
  const [selected, setSelected] = useState<Message>();
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
  const current = selected
    ? messages.find((m) => m.id === selected.id) || selected
    : undefined;
  return (
    <>
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
            showTime={stamped === item.message.id}
            onTap={() =>
              setStamped((id) =>
                id === item.message.id ? undefined : item.message.id,
              )
            }
            onMore={() => setSelected(item.message)}
            onReact={(emoji) => onReact(item.message, emoji)}
          />
        )}
      />
      <Sheet
        open={!!current}
        title="Message"
        busy={busy}
        onClose={() => setSelected(undefined)}
      >
        {current && (
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
                      setSelected(undefined);
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
              onPress={() => {
                onPin(current);
                setSelected(undefined);
              }}
            >
              {current.pinned_at ? "Unpin message" : "Pin message"}
            </Button>
          </View>
        )}
      </Sheet>
    </>
  );
}

function Bubble({
  item,
  actor,
  direct,
  showTime,
  onTap,
  onMore,
  onReact,
}: {
  item: ThreadItem;
  actor: string;
  direct: boolean;
  showTime: boolean;
  onTap: () => void;
  onMore: () => void;
  onReact: (emoji: string) => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { message, mine, first, last, separator } = item;
  const hasText = !!message.content?.trim();
  const reactions = reactionSummary(message, actor);
  const fill = mine
    ? isDark
      ? palette.primary
      : brandColors.blue
    : palette.glassSurface;
  const ink = mine ? (isDark ? palette.onPrimary : "#ffffff") : palette.text;
  const big = 18,
    small = 4;
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
  const label = `${mine ? "You" : message.sender_name}: ${
    message.content || "Image attachment"
  }, ${timeLabel(message.created_at)}`;
  return (
    <View style={{ marginTop: first ? 8 : 2 }}>
      {!!separator && (
        <Text
          style={{
            alignSelf: "center",
            marginVertical: 10,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "500",
            color: palette.mutedLabel,
          }}
        >
          {separator}
        </Text>
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
          {message.sender_name}
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
            {last && <ChatAvatar name={message.sender_name} size={32} />}
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
            accessibilityHint="Double tap to show the time. Hold for reactions and pinning."
            accessibilityActions={[
              { name: "longpress", label: "Reactions and pin" },
            ]}
            onAccessibilityAction={(event: AccessibilityActionEvent) => {
              if (event.nativeEvent.actionName === "longpress") onMore();
            }}
            onPress={onTap}
            onLongPress={onMore}
            delayLongPress={280}
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              borderRadius: big,
              overflow: "hidden",
              backgroundColor: hasText ? fill : "transparent",
              paddingHorizontal: hasText ? 14 : 0,
              paddingVertical: hasText ? 8 : 0,
              gap: 6,
              ...corners,
            })}
          >
            {hasText && (
              <Text
                selectable={false}
                style={{ color: ink, fontSize: 15, lineHeight: 21 }}
              >
                {message.content}
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

export function Composer({
  value,
  onChange,
  onBlur,
  editable,
  imageName,
  onPickImage,
  pickDisabled,
  onSend,
  sendDisabled,
  busy,
  notice,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  onBlur?: () => void;
  editable: boolean;
  imageName?: string;
  onPickImage?: () => void;
  pickDisabled?: boolean;
  onSend: () => void;
  sendDisabled: boolean;
  busy?: boolean;
  notice?: ReactNode;
  error?: ReactNode;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const keyboard = useKeyboardVisible();
  const inset = useSafeAreaInsets();
  const accent = isDark ? palette.primary : brandColors.blue;
  const hasContent = !sendDisabled;
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
      {notice}
      {error}
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
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        {!!onPickImage && !imageName && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach image"
            disabled={pickDisabled}
            onPress={onPickImage}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pickDisabled ? 0.4 : 1,
            }}
          >
            <ImagePlus size={24} color={accent} />
          </Pressable>
        )}
        <View
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 132,
            justifyContent: "center",
            paddingHorizontal: 16,
            borderRadius: 22,
            backgroundColor: palette.glassSurface,
          }}
        >
          <TextInput
            accessibilityLabel="Message"
            placeholder="Write a message…"
            placeholderTextColor={palette.mutedLabel}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={editable}
            multiline
            maxLength={5000}
            style={{
              fontSize: 15,
              color: palette.text,
              fontFamily: "Figtree_400Regular",
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
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hasContent ? accent : palette.glassSurface,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <ArrowUp
            size={22}
            color={
              hasContent
                ? isDark
                  ? palette.onPrimary
                  : "#ffffff"
                : palette.mutedLabel
            }
          />
        </Pressable>
      </View>
    </View>
  );
}
