import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import Activity from "lucide-react-native/icons/activity";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Clock from "lucide-react-native/icons/clock";
import MessageSquare from "lucide-react-native/icons/message-square";
import Pencil from "lucide-react-native/icons/pencil";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Users from "lucide-react-native/icons/users";
import { Button, ErrorState } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { space, withOpacity, type ThemeColors } from "../../components/ui/theme";
import {
  activityClockTime,
  activityDateHeading,
  activityDateKey,
  activityTime,
  type ActivityField,
} from "./activityPresentation";

export type TimelineEntry = {
  id: string;
  title: string;
  time: number;
  actor?: string;
  subject?: string;
  fields?: ActivityField[];
  body?: ReactNode;
};

type EntryTone = {
  bg: string;
  accent: string;
  neutral?: boolean;
  Icon: typeof Activity;
};

function resolveEntryTone(title: string, palette: ThemeColors): EntryTone {
  if (/approv|complet/i.test(title)) {
    return { bg: palette.successSoft, accent: palette.success, Icon: CircleCheck };
  }
  if (/changes|reject|block|remov|delet/i.test(title)) {
    return { bg: palette.dangerSoft, accent: palette.danger, Icon: CircleAlert };
  }
  if (/review|submit/i.test(title)) {
    return { bg: palette.reviewSoft, accent: palette.review, Icon: ShieldCheck };
  }
  if (/note|comment/i.test(title)) {
    return { bg: palette.primarySoft, accent: palette.primary, Icon: MessageSquare };
  }
  if (/progress|work update|start|resum/i.test(title)) {
    return { bg: palette.blueSoft, accent: palette.blue, Icon: Activity };
  }
  if (/staff|lead|contributor|people|assign/i.test(title)) {
    return {
      bg: palette.surface,
      accent: palette.primary,
      neutral: true,
      Icon: Users,
    };
  }
  if (/edit|updat/i.test(title)) {
    return {
      bg: palette.surface,
      accent: palette.primary,
      neutral: true,
      Icon: Pencil,
    };
  }
  return {
    bg: palette.surface,
    accent: palette.primary,
    neutral: true,
    Icon: Clock,
  };
}

function DashedRule({ color }: { color: string }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 1, overflow: "hidden", flex: 1 }}
    >
      <View
        style={{
          height: 4,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: color,
        }}
      />
    </View>
  );
}

/**
 * Renders a single timeline event card anchored to its timestamp and dashed guide line.
 */
export function ActivityEntry({
  entry,
  last = false,
  showDate = true,
}: {
  entry: TimelineEntry;
  last?: boolean;
  showDate?: boolean;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const tone = resolveEntryTone(entry.title, palette);
  const { Icon } = tone;
  const clockLabel = activityClockTime(entry.time);
  const visibleClock = clockLabel === "Time unavailable" ? "—" : clockLabel;
  const timeDisplay = showDate ? activityTime(entry.time) : visibleClock;
  const stacked = showDate || fontScale > 1.35;
  const hasDetails = Boolean(
    entry.subject || entry.fields?.length || entry.body,
  );
  const borderColor = tone.neutral
    ? palette.border
    : withOpacity(tone.accent, isDark ? 0.34 : 0.2);
  const ruleColor = withOpacity(palette.border, isDark ? 0.65 : 0.95);

  const pillCard = (
    <View
      style={{
        flex: stacked ? undefined : 1,
        backgroundColor: tone.bg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: space.sm,
        shadowColor: palette.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.06,
        shadowRadius: 10,
        elevation: isDark ? 0 : 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: withOpacity(tone.accent, isDark ? 0.22 : 0.14),
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: tone.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={16} color={palette.onPrimary} strokeWidth={2.2} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "700",
              color: palette.text,
            }}
          >
            {entry.title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "500",
              color: palette.muted,
            }}
          >
            {entry.actor || "Actor unavailable"}
          </Text>
        </View>
      </View>

      {hasDetails && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: withOpacity(tone.accent, isDark ? 0.22 : 0.12),
            paddingTop: space.sm,
            gap: space.xs,
          }}
        >
          {!!entry.subject && (
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                fontWeight: "600",
                color: palette.text,
              }}
            >
              {entry.subject}
            </Text>
          )}
          {entry.fields?.map(({ label, value }) => (
            <Text
              key={label}
              selectable
              style={{ fontSize: 13, lineHeight: 19, color: palette.text }}
            >
              <Text style={{ fontWeight: "700", color: palette.muted }}>
                {label}:{" "}
              </Text>
              {value}
            </Text>
          ))}
          {!!entry.body && (
            <View style={{ gap: 6 }}>{entry.body}</View>
          )}
        </View>
      )}
    </View>
  );

  if (stacked) {
    return (
      <View
        style={{
          gap: 6,
          paddingTop: 4,
          paddingBottom: last ? 4 : space.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text
            accessibilityLabel={showDate ? undefined : clockLabel}
            style={{
              fontSize: 12,
              lineHeight: 16,
              fontWeight: "600",
              color: palette.mutedLabel,
              fontVariant: ["tabular-nums"],
            }}
          >
            {timeDisplay}
          </Text>
          <DashedRule color={ruleColor} />
        </View>
        {pillCard}
      </View>
    );
  }

  return (
    <View
      style={{
        position: "relative",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingTop: 4,
        paddingBottom: last ? 4 : space.md,
      }}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          top: 22,
          left: 72,
          right: 0,
          height: 1,
        }}
      >
        <DashedRule color={ruleColor} />
      </View>
      <View style={{ width: 66, paddingTop: 11, alignItems: "flex-start" }}>
        <Text
          accessibilityLabel={clockLabel}
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "600",
            color: palette.mutedLabel,
            fontVariant: ["tabular-nums"],
          }}
        >
          {visibleClock}
        </Text>
      </View>
      {pillCard}
    </View>
  );
}

/**
 * Groups activity entries by Philippine calendar day with bold date headings,
 * left timestamps, dashed horizontal guides, and capsule event cards.
 */
export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  const palette = useTheme();
  if (!entries.length) return null;

  const groups: { key: string; heading: string; items: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const key = activityDateKey(entry.time);
    const previous = groups[groups.length - 1];
    if (previous && previous.key === key) {
      previous.items.push(entry);
    } else {
      groups.push({
        key,
        heading: activityDateHeading(entry.time),
        items: [entry],
      });
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      {groups.map((group) => (
        <View key={group.key} style={{ gap: space.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: space.sm,
              paddingTop: space.xs,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 18,
                lineHeight: 24,
                fontWeight: "700",
                color: palette.text,
              }}
            >
              {group.heading}
            </Text>
            <View
              style={{
                backgroundColor: palette.primarySoft,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "700",
                  color: palette.primaryDark,
                }}
              >
                {group.items.length}{" "}
                {group.items.length === 1 ? "update" : "updates"}
              </Text>
            </View>
          </View>
          <View style={{ gap: 2 }}>
            {group.items.map((entry, index) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                showDate={false}
                last={index === group.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Shared pagination control for loading older activity events.
 */
export function ActivityLoadMore({
  more,
  busy,
  disabled,
  error,
  onPress,
}: {
  more: boolean;
  busy: boolean;
  disabled: boolean;
  error?: unknown;
  onPress: () => void;
}) {
  const palette = useTheme();
  return (
    <>
      {!!error && <ErrorState error={error} />}
      {more && (
        <Button
          variant="outline"
          disabled={disabled}
          busy={busy}
          icon={<ChevronDown size={16} color={palette.primary} />}
          onPress={onPress}
        >
          {error ? "Retry older activity" : "Load older activity"}
        </Button>
      )}
    </>
  );
}
