import { Pressable, ScrollView, TextInput, View } from "react-native";
import Search from "lucide-react-native/icons/search";
import SquarePen from "lucide-react-native/icons/square-pen";
import X from "lucide-react-native/icons/x";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { Empty } from "../../components/ui";
import Pin from "lucide-react-native/icons/pin";
import { parseMessage } from "../../../core/web/app/features/chat-calls/services/chatMessageCodec";
import { ChatAvatar } from "./ChatAvatar";
import {
  conversationFilters,
  conversationKindLabel,
  pinnedConversation,
  type ConversationFilter,
} from "./chatPresentation";
import type { Channel } from "./services";

export function ConversationList({
  actor,
  channels,
  total,
  query,
  onQuery,
  filter,
  onFilter,
  onOpen,
  onCompose,
  composeDisabled,
  searchable = true,
}: {
  actor: string;
  channels: Channel[];
  total: number;
  query: string;
  onQuery: (value: string) => void;
  filter: ConversationFilter;
  onFilter: (value: ConversationFilter) => void;
  onOpen: (channel: Channel) => void;
  onCompose?: () => void;
  composeDisabled?: boolean;
  searchable?: boolean;
}) {
  const palette = useTheme();
  const pinned = channels
    .filter(pinnedConversation)
    .sort(
      (a, b) =>
        Number(b.kind === "project") - Number(a.kind === "project") ||
        (b.personalPin ?? "").localeCompare(a.personalPin ?? ""),
    );
  const regular = channels.filter((item) => !pinnedConversation(item));
  return (
    <View style={{ gap: 12 }}>
      {onCompose && (
        <ComposeButton onPress={onCompose} disabled={composeDisabled} />
      )}
      {searchable && (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: 22,
              backgroundColor: palette.glassSurface,
            }}
          >
            <Search size={18} color={palette.muted} />
            <TextInput
              accessibilityLabel="Search conversations"
              placeholder="Search conversations"
              placeholderTextColor={palette.mutedLabel}
              value={query}
              onChangeText={onQuery}
              returnKeyType="search"
              style={{
                flex: 1,
                minHeight: 44,
                fontSize: 15,
                color: palette.text,
                fontFamily: "Figtree_400Regular",
              }}
            />
            {!!query && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
                onPress={() => onQuery("")}
              >
                <X size={18} color={palette.muted} />
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          >
            {conversationFilters.map((item) => {
              const selected = filter === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.label} conversations`}
                  onPress={() => onFilter(item.value)}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 16,
                    borderRadius: 22,
                    backgroundColor: selected
                      ? palette.primarySoft
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selected ? "700" : "500",
                      color: selected ? palette.primary : palette.muted,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
      {!channels.length ? (
        <Empty
          kind="messages"
          title={
            filter === "archive" && !query.trim()
              ? "No archived chats yet"
              : query.trim() || filter !== "all"
                ? "No matching conversations"
                : "No conversations yet"
          }
          description={
            filter === "archive" && !query.trim()
              ? "Completed projects and their task chats appear here."
              : total
                ? "Try another search or filter."
                : "Your authorized direct, Office and task conversations appear here."
          }
        />
      ) : (
        <View>
          {[...pinned, ...regular].map((item, index) => (
            <View key={item.id}>
              {index === 0 && pinned.length > 0 && (
                <Text
                  accessibilityRole="header"
                  style={{
                    color: palette.mutedLabel,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                >
                  Pinned
                </Text>
              )}
              {index === pinned.length && index > 0 && (
                <Text
                  accessibilityRole="header"
                  style={{
                    color: palette.mutedLabel,
                    fontWeight: "700",
                    marginVertical: 4,
                  }}
                >
                  Conversations
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}. ${
                  item.unread && !item.archived ? "Unread. " : ""
                }${conversationKindLabel(item.kind)}${item.kind === "task" && item.projectTitle ? " in " + item.projectTitle : ""}`}
                onPress={() => onOpen(item)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 68,
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  marginHorizontal: -8,
                  borderRadius: 14,
                  backgroundColor: pressed
                    ? palette.glassSurface
                    : "transparent",
                })}
              >
                <ChatAvatar
                  name={item.name}
                  kind={item.kind}
                  size={52}
                  actor={actor}
                  path={item.avatarPath}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 16,
                      fontWeight: item.unread ? "700" : "600",
                      color: palette.text,
                    }}
                  >
                    {item.name}
                  </Text>
                  {(item.kind === "task" || item.kind === "project") && (
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        lineHeight: 16,
                        color: palette.mutedLabel,
                      }}
                    >
                      {item.kind === "task"
                        ? `Task chat${item.projectTitle ? " · " + item.projectTitle : ""}`
                        : `Project chat${item.defaultName && item.defaultName !== item.name ? " · " + item.defaultName : ""}`}
                    </Text>
                  )}
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: item.unread ? "600" : "400",
                      color: item.unread ? palette.text : palette.muted,
                    }}
                  >
                    {item.lastMessage
                      ? parseMessage(item.lastMessage).text
                      : "No messages yet"}
                  </Text>
                </View>
                {pinnedConversation(item) && (
                  <Pin
                    size={14}
                    color={palette.mutedLabel}
                    accessibilityLabel="Pinned conversation"
                  />
                )}
                {item.unread && !item.archived && (
                  <View
                    accessibilityLabel="Unread"
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: palette.primary,
                    }}
                  />
                )}
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ComposeButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New conversation"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 20,
        borderRadius: 24,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        backgroundColor: palette.primary,
      })}
    >
      <SquarePen size={18} color={palette.onPrimary} />
      <Text
        style={{ color: palette.onPrimary, fontWeight: "600", fontSize: 15 }}
      >
        New conversation
      </Text>
    </Pressable>
  );
}
