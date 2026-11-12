import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Calendar from "lucide-react-native/icons/calendar";
import User from "lucide-react-native/icons/user";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { Status, statusIndicatorColor } from "./Status";

export function MondayTableSection({
  title,
  count,
  accentColor,
  children,
}: {
  title: string;
  count?: number;
  accentColor?: string;
  children: ReactNode;
}) {
  const palette = useTheme();
  const barColor = accentColor || palette.primary;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.accentBar, { backgroundColor: barColor }]} />
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: palette.text }]}
        >
          {title}
        </Text>
        {typeof count === "number" && (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: palette.primarySoft },
            ]}
          >
            <Text style={[styles.countText, { color: palette.primary }]}>
              {count}
            </Text>
          </View>
        )}
      </View>
      <View
        style={[
          styles.tableCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function MondayTableRow({
  title,
  status,
  context,
  due,
  scheduleLabel,
  assignee,
  tag,
  blocker,
  onPress,
  isLast = false,
}: {
  title: string;
  status: string;
  context?: string | null;
  due?: string | null;
  scheduleLabel?: string;
  assignee?: string | null;
  tag?: string | null;
  blocker?: string | null;
  onPress: () => void;
  isLast?: boolean;
}) {
  const palette = useTheme();
  const accent = statusIndicatorColor(status, palette);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, scheduleLabel].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? palette.primarySoft : palette.surface,
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          {!!tag && (
            <View
              style={[
                styles.tagBadge,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.tagText, { color: palette.mutedLabel }]}>
                {tag}
              </Text>
            </View>
          )}
        </View>

        {!!context && (
          <Text style={[styles.context, { color: palette.mutedLabel }]}>
            {context}
          </Text>
        )}

        <View style={styles.columnsRow}>
          <Status value={status} variant="monday" />

          {!!due && (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                },
              ]}
            >
              <Calendar size={12} color={palette.mutedLabel} />
              <Text style={[styles.chipText, { color: palette.mutedLabel }]}>
                {due}
              </Text>
            </View>
          )}

          {!!assignee && (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                },
              ]}
            >
              <User size={12} color={palette.mutedLabel} />
              <Text
                style={[styles.chipText, { color: palette.text }]}
                numberOfLines={1}
              >
                {assignee}
              </Text>
            </View>
          )}
        </View>

        {!!blocker && (
          <Text style={[styles.blocker, { color: palette.warning }]}>
            {blocker}
          </Text>
        )}
      </View>

      <View style={styles.chevronSlot}>
        <ChevronRight size={18} color={palette.mutedLabel} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    gap: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  accentBar: {
    width: 6,
    height: 18,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
  },
  stripe: {
    width: 5,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  titleRow: {
    alignItems: "flex-start",
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  tagBadge: {
    maxWidth: "100%",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  context: {
    fontSize: 12,
    lineHeight: 16,
  },
  columnsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  chip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  blocker: {
    fontSize: 12,
    fontWeight: "500",
  },
  chevronSlot: {
    paddingRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
