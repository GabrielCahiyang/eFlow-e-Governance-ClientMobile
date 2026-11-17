import { Pressable, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { BusyIndicator } from "../../components/ui/BusyIndicator";
import { EditorialMetadataInline } from "../../components/ui/EditorialMetadata";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { dateLabel, space, type ThemeColors } from "../../components/ui/theme";
import {
  inboxCategoryLabels,
  notificationCategory,
} from "./inboxCategories";
import type { InboxNotification } from "./inboxUpdates";

type Category = ReturnType<typeof notificationCategory>;

/** One accent per Inbox category, used for the same leading stripe as My Work. */
function categoryAccent(category: Category, palette: ThemeColors) {
  switch (category) {
    case "work":
      return palette.blue;
    case "messages":
      return palette.review;
    case "finance":
      return palette.success;
    case "collaboration":
      return palette.warning;
    default:
      return palette.mutedLabel;
  }
}

/**
 * One Inbox update, laid out with the same row language as My Work: a leading
 * status stripe, a title, a one-line context and inline metadata inside a
 * single bounded row. The whole row opens the exact record when one exists;
 * unread rows keep a separate "Mark as read" control so reading never
 * requires opening.
 */
export function InboxUpdateCard({
  update,
  title,
  message,
  destinationLabel,
  onOpen,
  onMarkRead,
  marking,
  markDisabled,
}: {
  update: InboxNotification;
  title: string;
  message?: string;
  destinationLabel?: string;
  onOpen?: () => void;
  onMarkRead: () => void;
  marking: boolean;
  markDisabled: boolean;
}) {
  const palette = useTheme();
  const category = notificationCategory(update);
  const accent = categoryAccent(category, palette);
  const unread = !update.read;
  const time = dateLabel(update.createdAt);
  const kind = category ? inboxCategoryLabels[category] : "Update";
  const spoken = [unread ? "Unread" : "Read", kind, title, message, time]
    .filter(Boolean)
    .join(". ");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "stretch",
        borderRadius: 14,
        borderWidth: 1,
        // Unread rows are tinted and edged so state reads before the text.
        borderColor: unread ? palette.primary : palette.border,
        backgroundColor: unread ? palette.primarySoft : palette.surface,
        overflow: "hidden",
      }}
    >
      <View style={{ width: 5, backgroundColor: accent }} />
      <Pressable
        accessibilityRole={onOpen ? "button" : undefined}
        accessible
        accessibilityLabel={spoken}
        accessibilityHint={onOpen ? destinationLabel : undefined}
        disabled={!onOpen}
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingVertical: 12,
          paddingHorizontal: 12,
          backgroundColor: pressed ? palette.primarySoft : "transparent",
        })}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 4 }}
          >
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{
                flex: 1,
                color: palette.text,
                fontSize: 15,
                fontWeight: unread ? "700" : "600",
              }}
            >
              {title}
            </Text>
            {unread && (
              <View
                accessibilityLabel="Unread"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginTop: 6,
                  backgroundColor: palette.primary,
                }}
              />
            )}
          </View>
          {!!message && (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ color: palette.mutedLabel, fontSize: 12, lineHeight: 16 }}
            >
              {message}
            </Text>
          )}
          <EditorialMetadataInline
            items={[
              {
                value: unread ? "Unread" : "Read",
                accent: unread ? palette.primary : palette.mutedLabel,
              },
              { value: kind, accent },
              { value: time },
            ]}
            style={{ marginTop: 2 }}
          />
        </View>
        {!!onOpen && <ChevronRight size={18} color={palette.mutedLabel} />}
      </Pressable>
      {unread && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark as read"
          accessibilityHint={title}
          accessibilityState={{ disabled: markDisabled, busy: marking }}
          disabled={markDisabled}
          onPress={onMarkRead}
          hitSlop={4}
          style={({ pressed }) => ({
            width: 48,
            alignItems: "center",
            justifyContent: "center",
            borderLeftWidth: 1,
            borderColor: palette.border,
            backgroundColor: pressed ? palette.surface : "transparent",
            opacity: markDisabled && !marking ? 0.5 : 1,
          })}
        >
          {marking ? (
            <BusyIndicator size={18} color={palette.primary} />
          ) : (
            <Check size={20} color={palette.primary} />
          )}
        </Pressable>
      )}
    </View>
  );
}
