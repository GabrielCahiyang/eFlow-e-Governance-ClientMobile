import { View } from "react-native";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { type ThemeColors } from "./theme";
import { statusLabel } from "../../shared/statusLabels";

export function statusIndicatorColor(
  value: string,
  palette: ThemeColors,
): string {
  return statusColors(value, palette).foreground;
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

export function Status({
  value,
  variant = "monday",
  domain,
}: {
  value: string;
  variant?: "default" | "monday";
  domain?: "finance";
}) {
  const palette = useTheme(),
    tone = statusColors(value, palette),
    accent = tone.foreground;

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
          {statusLabel(value, domain)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: tone.background,
      }}
    >
      {accent !== palette.muted && (
        <View
          accessible={false}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: accent,
          }}
        />
      )}
      <Text
        style={{
          fontSize: 12,
          lineHeight: 16,
          fontWeight: "500",
          color: tone.foreground,
        }}
      >
        {statusLabel(value, domain)}
      </Text>
    </View>
  );
}
