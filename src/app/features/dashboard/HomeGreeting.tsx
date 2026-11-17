import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Bell from "lucide-react-native/icons/bell";
import MessageCircle from "lucide-react-native/icons/message-circle";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { useConversationDirectory } from "../communication";
import { useInboxCounts } from "../notifications/inboxCountsContext";
import type { Navigate } from "../../shared/routes";

export function greetingFor(hour: number) {
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

/** "Wednesday, 14 October": weekday, then day before month. */
export function todayLabel(date: Date) {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return `${weekday}, ${date.getDate()} ${month}`;
}

function CountBadge({
  count,
  testID,
  ring,
}: {
  count: number;
  testID: string;
  ring?: string;
}) {
  const palette = useTheme();
  if (count <= 0) return null;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 2,
        right: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.danger,
        borderColor: ring ?? palette.background,
        borderWidth: 1,
      }}
    >
      <Text
        style={{
          color: palette.onDanger,
          fontSize: 10,
          fontWeight: "700",
          lineHeight: 12,
        }}
      >
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

function HeaderAction({
  label,
  hint,
  onPress,
  onDark,
  children,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  onDark?: boolean;
  children: React.ReactNode;
}) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: onDark ? "rgba(255,255,255,0.24)" : palette.border,
        backgroundColor: onDark
          ? pressed
            ? "rgba(255,255,255,0.24)"
            : "rgba(255,255,255,0.12)"
          : pressed
            ? palette.primarySoft
            : palette.surface,
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * Home header that scrolls with the page: today's date, "Hello <name>,",
 * the time-of-day greeting, and Messages + Inbox shortcuts with counts.
 */
export function HomeHeader({
  navigate,
  onDark = false,
  subtitle,
}: {
  navigate: Navigate;
  /** White text and glass buttons for the navy Home hero. */
  onDark?: boolean;
  subtitle?: string;
}) {
  const { profile } = useAuth(),
    palette = useTheme(),
    inset = useSafeAreaInsets(),
    chats = useConversationDirectory(profile?.id || ""),
    inbox = useInboxCounts();
  const now = new Date();
  const names = profile?.full_name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = names[0];
  // First and last initials, e.g. "Cheryl Gallo" -> "CG".
  const initials =
    names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : (first?.[0]?.toUpperCase() ?? "?");
  // The server reports unread per conversation, so this counts
  // conversations with new messages.
  const unreadChats = chats.error
    ? 0
    : (chats.data ?? []).filter((chat) => chat.unread && !chat.archived)
        .length;
  const unreadUpdates = inbox.data?.all ?? 0;
  const ink = onDark ? "#ffffff" : palette.text,
    muted = onDark ? "rgba(255,255,255,0.72)" : palette.mutedLabel,
    icon = onDark ? "#ffffff" : palette.primary,
    ring = onDark ? palette.heroStart : undefined;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingTop: inset.top + 8,
        paddingBottom: 18,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: muted,
            fontSize: 14,
            fontWeight: "500",
          }}
        >
          {todayLabel(now)}
        </Text>
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={{
            color: ink,
            fontSize: 28,
            lineHeight: 34,
            fontWeight: "800",
            letterSpacing: -0.6,
          }}
        >
          {first ? `Hello ${first},` : "Hello,"}
        </Text>
        {!!subtitle && (
          <Text
            numberOfLines={1}
            style={{ color: muted, fontSize: 15, fontWeight: "600" }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 8, paddingTop: 4 }}>
        <HeaderAction
          label="Messages"
          hint={
            unreadChats
              ? `${unreadChats > 99 ? "99+" : unreadChats} conversation${unreadChats === 1 ? "" : "s"} with new messages`
              : undefined
          }
          onPress={() => navigate({ name: "messages", originTab: "home" })}
          onDark={onDark}
        >
          <MessageCircle size={21} color={icon} />
          <CountBadge
            count={unreadChats}
            testID="home-messages-unread"
            ring={ring}
          />
        </HeaderAction>
        <HeaderAction
          label="Inbox"
          hint={
            unreadUpdates
              ? `${unreadUpdates > 99 ? "99+" : unreadUpdates} unread update${unreadUpdates === 1 ? "" : "s"}`
              : undefined
          }
          onPress={() => navigate({ name: "inbox", originTab: "home" })}
          onDark={onDark}
        >
          <Bell size={21} color={icon} />
          <CountBadge
            count={unreadUpdates}
            testID="home-inbox-unread"
            ring={ring}
          />
        </HeaderAction>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Profile, ${profile?.full_name || "your account"}`}
          onPress={() => navigate({ name: "profile", originTab: "home" })}
          hitSlop={4}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            // Same glass as the hero cards; plain surface off the hero.
            borderColor: onDark ? "rgba(255,255,255,0.22)" : palette.border,
            backgroundColor: onDark
              ? pressed
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.12)"
              : pressed
                ? palette.primarySoft
                : palette.surface,
          })}
        >
          <Text
            style={{
              color: onDark ? "#ffffff" : palette.primary,
              fontSize: 15,
              fontWeight: "800",
              letterSpacing: 0.5,
            }}
          >
            {initials}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
