import { View } from "react-native";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { type ThemeColors } from "./theme";
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
    ].includes(value)
  )
    return { background: palette.successSoft, foreground: palette.success };
  if (["rejected", "overdue", "denied", "changes_requested"].includes(value))
    return { background: palette.dangerSoft, foreground: palette.danger };
  if (["for_review", "submitted", "pending_review"].includes(value))
    return { background: palette.reviewSoft, foreground: palette.review };
  if (["in_progress", "pending", "on_hold"].includes(value))
    return { background: palette.warningSoft, foreground: palette.warning };
  if (value === "todo")
    return { background: palette.blueSoft, foreground: palette.blue };
  return { background: palette.background, foreground: palette.muted };
}

export function statusIndicatorColor(value: string, palette: ThemeColors) {
  return statusColors(value, palette).foreground;
}

export function Status({
  value,
  variant = "editorial",
  domain,
  work = false,
  customId,
}: {
  value: string;
  variant?: "default" | "monday" | "editorial";
  domain?: "finance";
  work?: boolean;
  customId?: string | null;
}) {
  const resolve = useWorkStatus();
  const presentation = work ? resolve(value, customId) : undefined;
  const label = presentation?.label ?? statusLabel(value, domain);
  const palette = useTheme(),
    tone = workStatusTone(value, palette, presentation?.color),
    accent = tone.accent;

  if (variant === "monday") {
    return (
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: tone.background,
          borderLeftWidth: 3,
          borderLeftColor: accent,
        }}
      >
        <View
          accessible={false}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: accent,
          }}
        />
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
