import { View } from "react-native";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CircleDashed from "lucide-react-native/icons/circle-dashed";
import Clock from "lucide-react-native/icons/clock";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { withOpacity, type ThemeColors } from "./theme";
import { statusLabel } from "../../shared/statusLabels";
import { useWorkStatus } from "../../shared/workStatusPresentation";

export function workStatusTone(
  value: string,
  palette: ThemeColors,
  color?: string,
) {
  const tone = statusColors(value, palette);
  if (!color || !/^#[0-9a-f]{6}$/i.test(color))
    return { ...tone, accent: tone.foreground };
  return { background: color + "26", foreground: palette.text, accent: color };
}

export function statusColors(value: string, palette: ThemeColors) {
  if (
    [
      "completed",
      "approved",
      "active",
      "settled",
      "joined",
      "accepted",
      "done",
      "receipt_approved",
    ].includes(value)
  )
    return { background: palette.successSoft, foreground: palette.success };
  if (
    [
      "rejected",
      "overdue",
      "overdue_liquidation",
      "denied",
      "changes_requested",
      "leader_changes_requested",
      "department_changes_requested",
      "stuck",
    ].includes(value)
  )
    return { background: palette.dangerSoft, foreground: palette.danger };
  if (
    [
      "for_review",
      "submitted",
      "pending_review",
      "receipt_review",
      "liquidation_submitted",
      "pending_leader_review",
      "pending_department_approval",
      "pending_leader_liquidation_review",
      "pending_department_settlement",
      "released",
    ].includes(value)
  )
    return { background: palette.reviewSoft, foreground: palette.review };
  if (
    [
      "in_progress",
      "pending",
      "on_hold",
      "partially_released",
      "stalled",
    ].includes(value)
  )
    return { background: palette.warningSoft, foreground: palette.warning };
  if (["todo", "scheduled_for_release"].includes(value))
    return { background: palette.blueSoft, foreground: palette.blue };
  return { background: palette.background, foreground: palette.muted };
}

export function statusIndicatorColor(value: string, palette: ThemeColors) {
  return statusColors(value, palette).foreground;
}

function statusIconFor(value: string) {
  if (value === "receipt_approved") return ShieldCheck;
  if (
    [
      "completed",
      "approved",
      "active",
      "settled",
      "joined",
      "accepted",
      "done",
      "todo",
      "scheduled_for_release",
    ].includes(value)
  )
    return CircleCheck;
  if (
    [
      "rejected",
      "overdue",
      "overdue_liquidation",
      "denied",
      "changes_requested",
      "leader_changes_requested",
      "department_changes_requested",
      "stuck",
    ].includes(value)
  )
    return CircleAlert;
  if (
    [
      "for_review",
      "submitted",
      "pending_review",
      "receipt_review",
      "liquidation_submitted",
      "pending_leader_review",
      "pending_department_approval",
      "pending_leader_liquidation_review",
      "pending_department_settlement",
      "released",
      "in_progress",
      "pending",
      "on_hold",
      "partially_released",
      "stalled",
    ].includes(value)
  )
    return Clock;
  return CircleDashed;
}

export function Status({
  value,
  label: labelOverride,
  variant = "editorial",
  domain,
  work = false,
  customId,
}: {
  value: string;
  label?: string;
  variant?: "default" | "monday" | "editorial" | "pill";
  domain?: "finance";
  work?: boolean;
  customId?: string | null;
}) {
  const resolve = useWorkStatus();
  const presentation = work ? resolve(value, customId) : undefined;
  const label =
    labelOverride ?? presentation?.label ?? statusLabel(value, domain);
  const palette = useTheme(),
    tone = workStatusTone(value, palette, presentation?.color),
    accent = tone.accent;

  if (variant === "pill" || variant === "monday") {
    const Icon = statusIconFor(value);
    return (
      <View
        accessibilityLabel={`Status: ${label}`}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: withOpacity(accent, 0.24),
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          backgroundColor: tone.background,
        }}
      >
        <Icon aria-hidden size={12.5} color={tone.foreground} />
        <Text
          style={{
            fontSize: 11.5,
            lineHeight: 16,
            fontWeight: "700",
            color: tone.foreground,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
      }}
      accessibilityLabel={`Status: ${label}`}
    >
      <Text
        style={{
          fontSize: 12,
          lineHeight: 16,
          fontWeight: "600",
          color: tone.foreground,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
