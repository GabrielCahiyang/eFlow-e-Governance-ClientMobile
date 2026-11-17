import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import Calendar from "lucide-react-native/icons/calendar";
import UserPlus from "lucide-react-native/icons/user-plus";
import Users from "lucide-react-native/icons/users";
import Trash2 from "lucide-react-native/icons/trash";
import { Button } from "../../components/ui/Button";
import { BusyIndicator } from "../../components/ui/BusyIndicator";
import { Empty, Notice } from "../../components/ui/Screen";
import { SmallProgress } from "../../components/ui/OperationStatus";
import Activity from "lucide-react-native/icons/activity";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Wallet from "lucide-react-native/icons/wallet";
import Files from "lucide-react-native/icons/files";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Plus from "lucide-react-native/icons/plus";
import Pencil from "lucide-react-native/icons/pencil";
import Check from "lucide-react-native/icons/check";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Clock from "lucide-react-native/icons/clock";
import Flag from "lucide-react-native/icons/flag";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import ListIcon from "lucide-react-native/icons/list";
import Link2 from "lucide-react-native/icons/link-2";
import CircleIcon from "lucide-react-native/icons/circle";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Sheet } from "../../components/ui/Sheet";
import { statusIndicatorColor } from "../../components/ui/Status";
import { useWorkStatus } from "../../shared/workStatusPresentation";
import { isRawEntityId } from "../../shared/entityId";
import { dateLabel, withOpacity } from "../../components/ui/theme";
import { workDay } from "../../../core/web/app/shared/workCalendar";
import type { WorkPerson } from "../../../core/web/app/features/nested-work/types";

export function priorityLabel(priority?: string): string {
  if (!priority || priority === "normal" || priority === "medium")
    return "Medium";
  if (priority === "high") return "High";
  if (priority === "urgent") return "Urgent";
  if (priority === "low") return "Low";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarPalette = [
  { bg: "#16213E", text: "#93C5FD" },
  { bg: "#132E27", text: "#86EFAC" },
  { bg: "#261E38", text: "#D8B4FE" },
  { bg: "#2E2015", text: "#FDBA74" },
  { bg: "#1A2B4C", text: "#7DD3FC" },
  { bg: "#2C1A2E", text: "#F472B6" },
];

export function AvatarBadge({
  name,
  size = 36,
  fontSize,
}: {
  name: string;
  size?: number;
  fontSize?: number;
}) {
  const initials = getInitials(name);
  const colorIndex =
    Math.abs(
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    ) % avatarPalette.length;
  const tone = avatarPalette[colorIndex];
  const fs = fontSize || Math.max(10, Math.round(size * 0.38));

  return (
    <View
      accessible
      accessibilityLabel={`Avatar for ${name}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: fs,
          fontWeight: "700",
          color: tone.text,
          lineHeight: fs + 2,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function CircularProgressRing({
  percent,
  size = 50,
  strokeWidth = 4,
  onHero = false,
  accessibilityLabel,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  onHero?: boolean;
  accessibilityLabel?: string;
}) {
  const palette = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const trackColor = onHero ? "rgba(255,255,255,0.22)" : palette.border;
  const fillColor = onHero ? "#94baff" : palette.primary;
  const textColor = onHero ? "#ffffff" : palette.text;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      accessibilityLabel={accessibilityLabel || `Task completion: ${clamped}%`}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={onHero ? 1 : 0.4}
        />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : (
          <Circle
            cx={size / 2}
            cy={strokeWidth / 2 + 1}
            r={strokeWidth / 2 + 1}
            fill={fillColor}
          />
        )}
      </Svg>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
          color: textColor,
        }}
      >
        {clamped}%
      </Text>
    </View>
  );
}

function heroStatusTone(statusCode: string) {
  const code = statusCode.trim().toLowerCase();
  if (
    ["completed", "approved", "active", "done"].includes(code)
  ) {
    return {
      color: "#a2e8c6",
      bg: "rgba(162,232,198,0.18)",
      border: "rgba(162,232,198,0.38)",
      Icon: CircleCheck,
    };
  }
  if (["for_review", "pending_review", "submitted"].includes(code)) {
    return {
      color: "#dbcaff",
      bg: "rgba(219,202,255,0.2)",
      border: "rgba(219,202,255,0.38)",
      Icon: ShieldCheck,
    };
  }
  if (["stuck", "blocked", "overdue", "rejected", "denied"].includes(code)) {
    return {
      color: "#ffc2b8",
      bg: "rgba(255,194,184,0.2)",
      border: "rgba(255,194,184,0.38)",
      Icon: AlertCircle,
    };
  }
  if (code === "changes_requested") {
    return {
      color: "#f6d58b",
      bg: "rgba(246,213,139,0.2)",
      border: "rgba(246,213,139,0.38)",
      Icon: TriangleAlert,
    };
  }
  if (["in_progress", "pending", "on_hold"].includes(code)) {
    return {
      color: "#f6d58b",
      bg: "rgba(246,213,139,0.2)",
      border: "rgba(246,213,139,0.38)",
      Icon: Clock,
    };
  }
  return {
    color: "#94baff",
    bg: "rgba(148,186,255,0.2)",
    border: "rgba(148,186,255,0.38)",
    Icon: Clock,
  };
}

function heroPriorityTone(priorityRaw?: string | null) {
  const code = (priorityRaw || "").trim().toLowerCase();
  if (code === "high" || code === "urgent") {
    return {
      color: "#ffc2b8",
      bg: "rgba(255,194,184,0.2)",
      border: "rgba(255,194,184,0.38)",
    };
  }
  if (code === "medium" || code === "normal") {
    return {
      color: "#f6d58b",
      bg: "rgba(246,213,139,0.2)",
      border: "rgba(246,213,139,0.38)",
    };
  }
  return {
    color: "#94baff",
    bg: "rgba(148,186,255,0.2)",
    border: "rgba(148,186,255,0.38)",
  };
}

/** Deep-navy hero summary card displaying progress ring, status, and priority pods with circular Lucide icon chips. */
export function BentoOverviewHeroCard({
  title,
  subtitle,
  percent,
  completionAccessibilityLabel,
  statusLabel,
  statusCode,
  priorityLabel: priorityText,
  priorityRaw,
  statusAccessibilityLabel,
  priorityAccessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  percent?: number;
  completionAccessibilityLabel?: string;
  statusLabel: string;
  statusCode: string;
  priorityLabel: string;
  priorityRaw?: string | null;
  statusAccessibilityLabel?: string;
  priorityAccessibilityLabel?: string;
}) {
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.35 || width < 340;
  const statusSpec = heroStatusTone(statusCode);
  const prioritySpec = heroPriorityTone(priorityRaw);
  const StatusIcon = statusSpec.Icon;
  const gradientColors: readonly [string, string] = isDark
    ? ["#162452", "#223570"]
    : ["#00004f", "#0a1f7a"];

  return (
    <View
      style={{
        borderRadius: 22,
        padding: 16,
        gap: 14,
        overflow: "hidden",
        backgroundColor: gradientColors[0],
        borderWidth: 1,
        borderColor: "rgba(148,186,255,0.24)",
        marginBottom: 12,
      }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text
            style={{
              fontSize: 11,
              lineHeight: 15,
              fontWeight: "700",
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.78)",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 17,
              lineHeight: 22,
              fontWeight: "800",
              color: "#ffffff",
            }}
          >
            {subtitle || statusLabel}
          </Text>
        </View>
        {typeof percent === "number" && (
          <CircularProgressRing
            percent={percent}
            size={52}
            onHero
            accessibilityLabel={completionAccessibilityLabel}
          />
        )}
      </View>

      <View
        style={{
          flexDirection: stacked ? "column" : "row",
          gap: 10,
        }}
      >
        <View
          accessible
          accessibilityLabel={statusAccessibilityLabel ?? `Status: ${statusLabel}`}
          style={{
            flex: stacked ? undefined : 1,
            minWidth: 0,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: statusSpec.bg,
              borderWidth: 1,
              borderColor: statusSpec.border,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <StatusIcon size={18} color={statusSpec.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text
              style={{
                fontSize: 10,
                lineHeight: 14,
                fontWeight: "700",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              STATUS
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "700",
                color: "#ffffff",
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel={
            priorityAccessibilityLabel ?? `Priority: ${priorityText}`
          }
          style={{
            flex: stacked ? undefined : 1,
            minWidth: 0,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: prioritySpec.bg,
              borderWidth: 1,
              borderColor: prioritySpec.border,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Flag size={18} color={prioritySpec.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text
              style={{
                fontSize: 10,
                lineHeight: 14,
                fontWeight: "700",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              PRIORITY
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "700",
                color: "#ffffff",
              }}
            >
              {priorityText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export interface BentoAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  icon?: "pencil" | "check" | "plus" | "sliders";
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
}

export function BentoActionButtons({
  actions,
  style,
}: {
  actions: (BentoAction | null | undefined | false)[];
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  const validActions = actions.filter((action): action is BentoAction =>
    Boolean(action && typeof action === "object"),
  );

  if (validActions.length === 0) return null;

  return (
    <View
      style={[
        {
          flexDirection: fontScale > 1.8 ? "column" : "row",
          flexWrap: "wrap",
          gap: 10,
          marginVertical: 10,
        },
        style,
      ]}
    >
      {validActions.map((action, index) => {
        const isPrimary = action.variant === "primary";
        const iconColor = isPrimary ? palette.onPrimary : palette.primary;
        const icon =
          action.icon === "pencil" ? (
            <Pencil size={16} color={iconColor} strokeWidth={2.2} />
          ) : action.icon === "check" ? (
            <Check size={16} color={iconColor} strokeWidth={2.4} />
          ) : action.icon === "plus" ? (
            <Plus size={16} color={iconColor} strokeWidth={2.2} />
          ) : action.icon === "sliders" ? (
            <SlidersHorizontal size={16} color={iconColor} strokeWidth={2.2} />
          ) : undefined;

        return (
          <Button
            key={`${action.label}-${index}`}
            variant={isPrimary ? "primary" : "outline"}
            accessibilityLabel={action.accessibilityLabel || action.label}
            disabled={action.disabled}
            busy={action.busy}
            icon={icon}
            onPress={action.onPress}
            style={{
              flexGrow: 1,
              flexBasis: fontScale > 1.45 ? undefined : 155,
              paddingHorizontal: 14,
            }}
          >
            {action.label}
          </Button>
        );
      })}
    </View>
  );
}

/**
 * Compact outlined "Edit" button placed beside Task and Subtask detail titles.
 */
export function BentoEditButton({
  onPress,
  accessibilityLabel = "Edit",
  disabled = false,
  busy = false,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  const palette = useTheme();
  return (
    <Button
      variant="outline"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      busy={busy}
      icon={<Pencil size={16} color={palette.primary} strokeWidth={2.2} />}
      style={{ paddingHorizontal: 12, gap: 8 }}
      textStyle={{ fontSize: 13 }}
    >
      Edit
    </Button>
  );
}

export function BentoDeleteButton({ onPress, accessibilityLabel, disabled, busy }: {
  onPress: () => void; accessibilityLabel: string; disabled?: boolean; busy?: boolean;
}) {
  const palette = useTheme();
  return (
    <Button
      variant="outline"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      busy={busy}
      icon={<Trash2 size={16} color={palette.danger} />}
      iconBadgeColor={palette.dangerSoft}
      style={{ paddingHorizontal: 12, gap: 8 }}
      textStyle={{ fontSize: 13, color: palette.danger }}
    >
      Delete
    </Button>
  );
}

export interface DependencyItemData {
  id: string;
  title: string;
  status: string;
  completed?: boolean;
  projectId?: string;
}

/**
 * Conditional prerequisite dependencies card positioned directly below the date cards.
 */
export function BentoDependenciesCard({
  items,
  missingCount = 0,
  pendingCount,
  onPressItem,
}: {
  items: DependencyItemData[];
  missingCount?: number;
  pendingCount?: number;
  onPressItem?: (item: DependencyItemData) => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const total = items.length + missingCount;
  if (total === 0) return null;

  const completedCount = items.filter(
    (item) => item.completed || item.status === "completed",
  ).length;
  const allComplete = pendingCount === undefined
    ? completedCount === total && missingCount === 0
    : pendingCount === 0;
  const insetSurface = isDark ? "#0f1733" : palette.background;

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: palette.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Link2 size={16} color={palette.primary} />
          </View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: 0.4,
            }}
          >
            DEPENDENCIES
          </Text>
        </View>
        <View
          style={{
            backgroundColor: allComplete
              ? palette.successSoft
              : palette.warningSoft,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: allComplete ? palette.success : palette.warning,
            }}
          >
            {pendingCount === undefined
              ? `${completedCount} of ${total} complete`
              : `${pendingCount} pending`}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: insetSurface,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 2,
        }}
      >
        {items.map((item, idx) => {
          const isDone = Boolean(item.completed || item.status === "completed");
          const rowContent = (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: palette.border,
              }}
            >
              {isDone ? (
                <CircleCheck size={16} color={palette.success} strokeWidth={2.2} />
              ) : (
                <CircleIcon size={16} color={palette.mutedLabel} strokeWidth={2} />
              )}
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 13.5,
                  fontWeight: isDone ? "500" : "600",
                  color: isDone ? palette.muted : palette.text,
                  textDecorationLine: isDone ? "line-through" : "none",
                }}
              >
                {item.title}
              </Text>
              {onPressItem && (
                <ChevronRight size={15} color={palette.mutedLabel} />
              )}
            </View>
          );

          if (!onPressItem) {
            return <View key={item.id}>{rowContent}</View>;
          }

          return (
            <Pressable
              key={item.id}
              onPress={() => onPressItem(item)}
              accessibilityRole="button"
              accessibilityLabel={`Open dependency ${item.title}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              {rowContent}
            </Pressable>
          );
        })}

        {missingCount > 0 && (
          <Text
            style={{
              fontSize: 12,
              color: palette.muted,
              paddingVertical: 8,
              borderTopWidth: items.length > 0 ? StyleSheet.hairlineWidth : 0,
              borderTopColor: palette.border,
            }}
          >
            +{missingCount} restricted or unavailable prerequisite
            {missingCount === 1 ? "" : "s"}
          </Text>
        )}
      </View>
    </View>
  );
}

export function BentoBlockerCard({
  blocker,
  reporter,
  reportedAt,
  note,
  nextStep,
  onPressActivity,
}: {
  blocker?: string | null;
  reporter?: string | null;
  reportedAt?: string | number | null;
  note?: string | null;
  nextStep?: string | null;
  onPressActivity?: () => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  if (!blocker) return null;

  const metaParts = [
    reporter?.trim(),
    reportedAt ? dateLabel(reportedAt) || String(reportedAt) : null,
  ].filter(Boolean);

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: palette.dangerSoft,
        borderWidth: 1,
        borderColor: withOpacity(palette.danger, isDark ? 0.3 : 0.2),
        borderRadius: 18,
        padding: 14,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          {
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1,
            backgroundColor: isDark
              ? withOpacity(palette.danger, 0.18)
              : "#ffffff",
            borderColor: withOpacity(palette.danger, isDark ? 0.32 : 0.22),
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          },
          !isDark && {
            shadowColor: "#101849",
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          },
        ]}
      >
        <AlertCircle size={18} color={palette.danger} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: palette.danger,
            letterSpacing: 0.5,
          }}
        >
          WORK BLOCKED
        </Text>
      <Text
        selectable
        style={{
          fontSize: 14,
          color: palette.text,
          lineHeight: 20,
        }}
      >
        {blocker}
      </Text>
      {metaParts.length > 0 && (
        <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
          {metaParts.join(" · ")}
        </Text>
      )}
      {!!note?.trim() && (
        <Text selectable style={{ fontSize: 13, color: palette.muted }}>
          Note: {note.trim()}
        </Text>
      )}
      {!!nextStep?.trim() && (
        <Text selectable style={{ fontSize: 13, color: palette.muted }}>
          Next step: {nextStep.trim()}
        </Text>
      )}
      {onPressActivity && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View blocker activity"
          onPress={onPressActivity}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 4,
            paddingTop: 2,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: palette.danger,
            }}
          >
            Activity & evidence
          </Text>
          <ChevronRight size={14} color={palette.danger} />
        </Pressable>
      )}
      </View>
    </View>
  );
}

export function BentoProjectOnHoldCard({
  projectId,
  onNavigateReadiness,
  onNavigateParentTask,
  style,
  waitingForTask = false,
  isTaskLead = false,
}: {
  projectId?: string;
  onNavigateReadiness?: () => void;
  onNavigateParentTask?: () => void;
  style?: StyleProp<ViewStyle>;
  waitingForTask?: boolean;
  isTaskLead?: boolean;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();

  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          backgroundColor: palette.warningSoft,
          borderWidth: 1,
          borderColor: withOpacity(palette.warning, isDark ? 0.3 : 0.2),
          borderRadius: 18,
          padding: 14,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginTop: 8,
          marginBottom: 8,
        },
        style,
      ]}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          {
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1,
            backgroundColor: isDark
              ? withOpacity(palette.warning, 0.18)
              : "#ffffff",
            borderColor: withOpacity(palette.warning, isDark ? 0.32 : 0.22),
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          },
          !isDark && {
            shadowColor: "#101849",
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          },
        ]}
      >
        <TriangleAlert size={18} color={palette.warning} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: palette.text,
              flexShrink: 1,
            }}
          >
            {waitingForTask ? "Waiting for the parent task" : "Project on hold"}
          </Text>
        <View
          style={{
            backgroundColor: isDark
              ? withOpacity(palette.warning, 0.16)
              : "#ffffff",
            borderWidth: 1,
            borderColor: withOpacity(palette.warning, isDark ? 0.3 : 0.22),
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: palette.warning,
              letterSpacing: 0.3,
            }}
          >
            Work actions unavailable
          </Text>
        </View>
      </View>
      <Text
        selectable
        style={{
          fontSize: 13,
          color: palette.muted,
          lineHeight: 18,
        }}
      >
        {waitingForTask
          ? isTaskLead
            ? "You're the Task Lead. Start the parent task first before you can update or complete this subtask."
            : "The Task Lead must start the parent task before you can update or complete this subtask."
          : "Work updates are paused while the project is under review."}
      </Text>
      {waitingForTask && onNavigateParentTask && (
        <Pressable
          onPress={onNavigateParentTask}
          accessibilityRole="button"
          accessibilityLabel="Go to Task details"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            alignSelf: "flex-start",
            marginTop: 4,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: palette.primary,
            }}
          >
            Go to Task details
          </Text>
          <ChevronRight size={14} color={palette.primary} />
        </Pressable>
      )}
      {onNavigateReadiness && (
        <Pressable
          onPress={onNavigateReadiness}
          accessibilityRole="button"
          accessibilityLabel="Review project readiness"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            alignSelf: "flex-start",
            marginTop: 4,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: palette.primary,
            }}
          >
            Review project readiness
          </Text>
          <ChevronRight size={14} color={palette.primary} />
        </Pressable>
      )}
      </View>
    </View>
  );
}

export function BentoScheduleCards({
  startDate,
  dueDate,
  workTimezone,
}: {
  startDate?: string | null;
  dueDate?: string | null;
  workTimezone?: string;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.35 || width < 340;
  const format = (value?: string | null) => {
    if (!value) return "—";
    if (!workTimezone)
      return dateLabel(value.includes("T") ? value : value + "T12:00:00");
    const day = workDay(value, workTimezone);
    return day === null ? "—" : new Intl.DateTimeFormat("en-PH", {
      timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
    }).format(day * 86400000);
  };

  const tileSurface = isDark ? "#1a274d" : palette.glassSurface;
  const gradTop = isDark ? withOpacity(palette.primary, 0.1) : palette.glassTop;
  const gradBottom = isDark ? "rgba(10,16,40,0.22)" : palette.glassBottom;
  const tileEdge = isDark ? palette.border : palette.glassEdge;
  const badgeBg = isDark ? withOpacity(palette.primary, 0.18) : "#ffffff";
  const badgeBorder = withOpacity(palette.primary, isDark ? 0.3 : 0.18);

  const renderDateTile = (label: string, formatted: string) => (
    <View
      style={[
        {
          flex: stacked ? undefined : 1,
          minWidth: 0,
          backgroundColor: tileSurface,
          borderWidth: 1.5,
          borderColor: tileEdge,
          borderRadius: 20,
          padding: 14,
          justifyContent: "space-between",
          gap: 12,
          overflow: "hidden",
        },
        !isDark && {
          shadowColor: "#00004f",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
      ]}
    >
      <LinearGradient
        colors={[gradTop, gradBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          {
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            backgroundColor: badgeBg,
            borderColor: badgeBorder,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-start",
          },
          !isDark && {
            shadowColor: "#00004f",
            shadowOpacity: 0.07,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          },
        ]}
      >
        <Calendar size={18} color={palette.primary} />
      </View>
      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontSize: 11,
            lineHeight: 15,
            color: palette.mutedLabel,
            fontWeight: "700",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            lineHeight: 21,
            fontWeight: "800",
            fontVariant: ["tabular-nums"],
            color: palette.text,
          }}
        >
          {formatted}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={{
        flexDirection: stacked ? "column" : "row",
        gap: 10,
        marginBottom: 12,
      }}
    >
      {renderDateTile("Start date", format(startDate))}
      {renderDateTile("Due date", format(dueDate))}
    </View>
  );
}

export function ContributorsSheet({
  open,
  onClose,
  contributors,
}: {
  open: boolean;
  onClose: () => void;
  contributors: readonly { id?: string; name: string; office?: string }[];
}) {
  const palette = useTheme();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Contributors"
      description={`${contributors.length} assigned ${contributors.length === 1 ? "contributor" : "contributors"}`}
    >
      <ScrollView
        style={{ maxHeight: 380 }}
        contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
      >
        {contributors.length > 0 ? (
          contributors.map((person, index) => (
            <View
              key={person.id || person.name || index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 6,
                borderBottomWidth: index === contributors.length - 1 ? 0 : 0.5,
                borderColor: palette.border,
              }}
            >
              <AvatarBadge name={person.name} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: palette.text,
                  }}
                >
                  {person.name}
                </Text>
                <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
                  Contributor
                  {person.office && !isRawEntityId(person.office) && person.office !== person.id
                    ? ` · ${person.office}`
                    : ""}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Empty
            compact
            kind="people"
            title="No contributors assigned to this task"
          />
        )}
      </ScrollView>
    </Sheet>
  );
}

export function BentoAssignedTeamCard({
  leadName,
  leadRoleLabel = "Task Lead",
  contributors,
  onChoosePeople,
  peoplePending = false,
}: {
  leadName?: string | null;
  leadRoleLabel?: string;
  contributors: readonly { id?: string; name: string; office?: string }[];
  onChoosePeople?: () => void;
  peoplePending?: boolean;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const [sheetOpen, setSheetOpen] = useState(false);
  const visibleContributors = contributors.slice(0, 3);
  const extraCount = Math.max(0, contributors.length - 3);
  const insetSurface = isDark ? "#0f1733" : palette.background;

  let previewText = "No contributors assigned";
  if (contributors.length > 0) {
    if (contributors.length <= 3) {
      previewText = contributors.map((p) => p.name).join(", ");
    } else {
      const firstNames = contributors
        .slice(0, 3)
        .map((p) => p.name.split(" ")[0])
        .join(", ");
      previewText = `${firstNames} +${extraCount} others`;
    }
  }

  return (
    <>
      <View
        style={{
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 20,
          padding: 16,
          gap: 14,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: palette.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={16} color={palette.primary} />
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: palette.text }}
            >
              Assigned team
            </Text>
          </View>
          {!!onChoosePeople && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose people for this task"
              disabled={peoplePending}
              accessibilityState={{ disabled: peoplePending, busy: peoplePending }}
              onPress={onChoosePeople}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                minHeight: 38,
                paddingLeft: 8,
                paddingRight: 12,
                paddingVertical: 6,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.surface,
                opacity: peoplePending ? 0.6 : pressed ? 0.78 : 1,
              })}
            >
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: palette.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {peoplePending ? (
                  <BusyIndicator size={12} color={palette.primary} />
                ) : (
                  <UserPlus size={12} color={palette.primary} />
                )}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: palette.primary,
                }}
              >
                Choose people
              </Text>
            </Pressable>
          )}
          {!onChoosePeople && peoplePending && <SmallProgress label="Checking actions…" />}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AvatarBadge name={leadName || "Needs assignment"} size={40} />
          <View style={{ gap: 2, flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: palette.text }}
            >
              {leadName || "Needs assignment"}
            </Text>
            <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
              {leadRoleLabel}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Contributors: ${previewText}, view all ${contributors.length} contributors`}
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 52,
            backgroundColor: insetSurface,
            borderColor: palette.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ gap: 3, flex: 1, paddingRight: 8 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: palette.text }}
              >
                Contributors
              </Text>
              {contributors.length > 0 && (
                <View
                  style={{
                    backgroundColor: palette.primarySoft,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: palette.primary,
                    }}
                  >
                    {contributors.length}
                  </Text>
                </View>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{ fontSize: 12, color: palette.mutedLabel }}
            >
              {previewText}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {contributors.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {visibleContributors.map((person, index) => (
                  <View
                    key={person.id || person.name || index}
                    style={{
                      marginLeft: index === 0 ? 0 : -8,
                      borderWidth: 2,
                      borderColor: insetSurface,
                      borderRadius: 999,
                      zIndex: visibleContributors.length - index,
                    }}
                  >
                    <AvatarBadge name={person.name} size={28} />
                  </View>
                ))}
                {extraCount > 0 && (
                  <View
                    style={{
                      marginLeft: -8,
                      borderWidth: 2,
                      borderColor: insetSurface,
                      borderRadius: 999,
                      backgroundColor: palette.primarySoft,
                      minWidth: 28,
                      height: 28,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: palette.primary,
                      }}
                    >
                      +{extraCount}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <ChevronRight size={16} color={palette.mutedLabel} />
          </View>
        </Pressable>
      </View>

      <ContributorsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        contributors={contributors}
      />
    </>
  );
}

export interface SubtaskItemData {
  id: string;
  title: string;
  status: string;
  customStatusId?: string | null;
  percent?: number;
  members: readonly WorkPerson[];
}

export function BentoSubtasksCard({
  title = "Subtasks",
  subtasks,
  canAdd,
  onAddSubtask,
  onPressSubtask,
  actionsPending = false,
}: {
  title?: string;
  subtasks: readonly SubtaskItemData[];
  canAdd?: boolean;
  onAddSubtask?: () => void;
  onPressSubtask: (subtask: SubtaskItemData) => void;
  actionsPending?: boolean;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const resolveStatus = useWorkStatus();
  const [allOpen, setAllOpen] = useState(false);
  const insetSurface = isDark ? "#0f1733" : palette.background;

  const rows = (items: readonly SubtaskItemData[]) => (
    <View>
      {items.map((item, index) => {
        const label = resolveStatus(item.status, item.customStatusId).label;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Subtask: ${item.title}, ${label}`}
            onPress={() => {
              setAllOpen(false);
              onPressSubtask(item);
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 11,
              gap: 8,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderColor: palette.border,
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <View style={{ gap: 2, flex: 1 }}>
              <Text numberOfLines={2} style={{ fontSize: 14.5, fontWeight: "600", color: palette.text }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: statusIndicatorColor(item.status, palette) }}>
                {label}
              </Text>
            </View>
            {item.members.slice(0, 3).map((person) => (
              <AvatarBadge key={person.id} name={person.name} size={24} />
            ))}
            <ChevronRight size={16} color={palette.mutedLabel} />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: palette.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ListIcon size={16} color={palette.primary} />
          </View>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: palette.text }}
          >
            {title}
          </Text>
          <View
            style={{
              backgroundColor: palette.primarySoft,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                color: palette.primary,
              }}
            >
              {subtasks.length}
            </Text>
          </View>
        </View>

        {canAdd && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${title === "Child subtasks" ? "child subtask" : "subtask"}`}
            disabled={actionsPending}
            accessibilityState={{ disabled: actionsPending, busy: actionsPending }}
            onPress={onAddSubtask}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 38,
              paddingLeft: 8,
              paddingRight: 12,
              paddingVertical: 6,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
              opacity: actionsPending ? 0.6 : pressed ? 0.78 : 1,
            })}
          >
            <View
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: palette.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {actionsPending ? (
                <BusyIndicator size={12} color={palette.primary} />
              ) : (
                <Plus size={12} color={palette.primary} strokeWidth={2.4} />
              )}
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: palette.primary,
              }}
            >
              Add
            </Text>
          </Pressable>
        )}
      </View>

      {subtasks.length > 0 ? (
        <View
          style={{
            backgroundColor: insetSurface,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 2,
          }}
        >
          {rows(subtasks.slice(0, 3))}
          {subtasks.length > 3 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`See all ${subtasks.length} subtasks`}
              onPress={() => setAllOpen(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 44,
                paddingVertical: 10,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: palette.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: "600",
                  color: palette.primary,
                }}
              >
                See all {subtasks.length} subtasks
              </Text>
              <ChevronRight size={16} color={palette.primary} />
            </Pressable>
          )}
        </View>
      ) : (
        <Empty
          compact
          kind="tasks"
          title={
            title === "Child subtasks"
              ? "No child subtasks yet"
              : "No subtasks yet"
          }
        />
      )}
      {allOpen && (
        <Sheet open title={title} onClose={() => setAllOpen(false)}>
          {rows(subtasks)}
        </Sheet>
      )}
    </View>
  );
}

function SupportingTile({
  icon,
  accent,
  soft,
  title,
  subtitle,
  onPress,
  fullWidth = false,
  minHeight = 104,
}: {
  icon: ReactNode;
  accent: string;
  soft: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  fullWidth?: boolean;
  minHeight?: number;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const chipBg = isDark ? withOpacity(accent, 0.18) : "#ffffff";
  const chipBorder = withOpacity(accent, isDark ? 0.3 : 0.18);
  const gradTop = isDark ? withOpacity(palette.primary, 0.08) : palette.glassTop;
  const gradBottom = isDark
    ? "rgba(10,16,40,0.22)"
    : withOpacity(soft, 0.85);
  const surfaceBg = isDark ? "#172344" : palette.surface;

  if (fullWidth) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${subtitle}`}
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: surfaceBg,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 20,
          padding: 14,
          minHeight: 60,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          overflow: "hidden",
          opacity: pressed ? 0.82 : 1,
        })}
      >
        <LinearGradient
          colors={[gradTop, gradBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            {
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              backgroundColor: chipBg,
              borderColor: chipBorder,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            },
            !isDark && {
              shadowColor: "#00004f",
              shadowOpacity: 0.06,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            },
          ]}
        >
          {icon}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: palette.text }}>
            {title}
          </Text>
          <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
            {subtitle}
          </Text>
        </View>
        <ChevronRight size={16} color={palette.mutedLabel} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        backgroundColor: surfaceBg,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 20,
        padding: 14,
        minHeight,
        justifyContent: "space-between",
        gap: 12,
        overflow: "hidden",
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <LinearGradient
        colors={[gradTop, gradBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            {
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              backgroundColor: chipBg,
              borderColor: chipBorder,
              alignItems: "center",
              justifyContent: "center",
            },
            !isDark && {
              shadowColor: "#00004f",
              shadowOpacity: 0.06,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            },
          ]}
        >
          {icon}
        </View>
        <ChevronRight size={15} color={palette.mutedLabel} />
      </View>
      <View style={{ gap: 2 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: palette.text }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export function BentoSupportingGrid({
  onPressActivity,
  onPressReview,
  onPressFunding,
  onPressFiles,
}: {
  onPressActivity: () => void;
  onPressReview: () => void;
  onPressFunding: () => void;
  onPressFiles: () => void;
}) {
  const palette = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.8 || width < 340;
  const minHeight = fontScale > 1.5 ? 112 : 104;

  return (
    <View style={{ gap: 10, marginBottom: 16 }}>
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
        <SupportingTile
          icon={<Activity size={18} color={palette.blue} />}
          accent={palette.blue}
          soft={palette.blueSoft}
          title="Activity"
          subtitle="Updates & history"
          onPress={onPressActivity}
          minHeight={minHeight}
        />
        <SupportingTile
          icon={<ShieldCheck size={18} color={palette.review} />}
          accent={palette.review}
          soft={palette.reviewSoft}
          title="Evidence & review"
          subtitle="Submissions"
          onPress={onPressReview}
          minHeight={minHeight}
        />
      </View>

      <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
        <SupportingTile
          icon={<Wallet size={18} color={palette.success} />}
          accent={palette.success}
          soft={palette.successSoft}
          title="Funding"
          subtitle="Financial records"
          onPress={onPressFunding}
          minHeight={minHeight}
        />
        <SupportingTile
          icon={<Files size={18} color={palette.primary} />}
          accent={palette.primary}
          soft={palette.glassSurface}
          title="Files"
          subtitle="Attachments"
          onPress={onPressFiles}
          minHeight={minHeight}
        />
      </View>
    </View>
  );
}

export function BentoSubtaskSupportingGrid({
  onPressActivity,
  onPressReview,
  onPressFunding,
  onPressFiles,
  showFunding = true,
}: {
  onPressActivity?: () => void;
  onPressReview: () => void;
  onPressFunding?: () => void;
  onPressFiles: () => void;
  showFunding?: boolean;
}) {
  const palette = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.8 || width < 340;
  const minHeight = fontScale > 1.5 ? 112 : 104;

  const hasFunding = showFunding && !!onPressFunding;
  const activityTile = onPressActivity ? (
    <SupportingTile
      icon={<Activity size={18} color={palette.blue} />}
      accent={palette.blue}
      soft={palette.blueSoft}
      title="Activity"
      subtitle="Updates & history"
      onPress={onPressActivity}
      minHeight={minHeight}
    />
  ) : null;
  const reviewTile = (
    <SupportingTile
      icon={<ShieldCheck size={18} color={palette.review} />}
      accent={palette.review}
      soft={palette.reviewSoft}
      title="Evidence & review"
      subtitle="Submissions"
      onPress={onPressReview}
      minHeight={minHeight}
    />
  );
  const fundingTile = hasFunding ? (
    <SupportingTile
      icon={<Wallet size={18} color={palette.success} />}
      accent={palette.success}
      soft={palette.successSoft}
      title="Funding"
      subtitle="Financial records"
      onPress={onPressFunding!}
      minHeight={minHeight}
    />
  ) : null;
  const filesTile = (
    <SupportingTile
      icon={<Files size={18} color={palette.primary} />}
      accent={palette.primary}
      soft={palette.glassSurface}
      title="Files"
      subtitle="Attachments"
      onPress={onPressFiles}
      minHeight={minHeight}
    />
  );

  if (activityTile && hasFunding) {
    return (
      <View style={{ gap: 10, marginBottom: 16 }}>
        <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
          {activityTile}
          {reviewTile}
        </View>

        <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
          {fundingTile}
          {filesTile}
        </View>
      </View>
    );
  }

  if (activityTile) {
    return (
      <View style={{ gap: 10, marginBottom: 16 }}>
        <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
          {activityTile}
          {reviewTile}
        </View>
        <SupportingTile
          fullWidth
          icon={<Files size={18} color={palette.primary} />}
          accent={palette.primary}
          soft={palette.glassSurface}
          title="Files"
          subtitle="Attachments"
          onPress={onPressFiles}
        />
      </View>
    );
  }

  if (hasFunding) {
    return (
      <View style={{ gap: 10, marginBottom: 16 }}>
        <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
          {reviewTile}
          {fundingTile}
        </View>
        <SupportingTile
          fullWidth
          icon={<Files size={18} color={palette.primary} />}
          accent={palette.primary}
          soft={palette.glassSurface}
          title="Files"
          subtitle="Attachments"
          onPress={onPressFiles}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 10, marginBottom: 16 }}>
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
        {reviewTile}
        {filesTile}
      </View>
    </View>
  );
}

export function PlanningDetailsView({
  description,
  definitionOfDone,
  acceptanceCriteria,
}: {
  description?: string | null;
  definitionOfDone?: string | null;
  acceptanceCriteria?: readonly string[] | null;
}) {
  const palette = useTheme();

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: palette.mutedLabel,
            letterSpacing: 0.5,
          }}
        >
          DESCRIPTION
        </Text>
        <Text
          selectable
          style={{
            fontSize: 14,
            color: description ? palette.text : palette.mutedLabel,
            lineHeight: 20,
          }}
        >
          {description || "No description provided."}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: palette.mutedLabel,
            letterSpacing: 0.5,
          }}
        >
          DEFINITION OF DONE
        </Text>
        <Text
          selectable
          style={{
            fontSize: 14,
            color: definitionOfDone ? palette.text : palette.mutedLabel,
            lineHeight: 20,
          }}
        >
          {definitionOfDone || "No definition of done specified."}
        </Text>
      </View>

      {!!acceptanceCriteria?.length && (
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: palette.mutedLabel,
              letterSpacing: 0.5,
            }}
          >
            ACCEPTANCE CRITERIA
          </Text>
          {acceptanceCriteria.map((criterion, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <CircleCheck
                size={16}
                color={palette.success}
                style={{ marginTop: 2 }}
              />
              <Text
                selectable
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: palette.text,
                  lineHeight: 20,
                }}
              >
                {criterion}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Notice tone="info">
        Advanced planning, custom fields, dependencies, and branch configuration
        are managed on eFlow Web.
      </Notice>
    </View>
  );
}

export function PlanningDetailsSheet({
  open,
  onClose,
  description,
  definitionOfDone,
  acceptanceCriteria,
}: {
  open: boolean;
  onClose: () => void;
  description?: string | null;
  definitionOfDone?: string | null;
  acceptanceCriteria?: readonly string[] | null;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Planning details"
      description="Additional scope, criteria, and web configuration"
    >
      <ScrollView
        style={{ maxHeight: 420 }}
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        <PlanningDetailsView
          description={description}
          definitionOfDone={definitionOfDone}
          acceptanceCriteria={acceptanceCriteria}
        />
      </ScrollView>
    </Sheet>
  );
}
