import { View } from "react-native";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { words, type ThemeColors } from "./theme";

const indicator: Record<string, string> = {
  pending_assignment: "#7b8495",
  todo: "#579bfc",
  in_progress: "#f4ae36",
  for_review: "#8b6be8",
  changes_requested: "#df526d",
  completed: "#00b97d",
  cancelled: "#76808c",
};

export function statusIndicatorColor(value: string): string {
  return indicator[value] || "#7b8495";
}

export function mondayStatusLabel(value: string): string {
  if (value === "in_progress") return "Working on it";
  if (value === "completed" || value === "done") return "Done";
  if (value === "changes_requested") return "Stuck";
  if (value === "for_review" || value === "pending_review") return "Review";
  if (value === "todo") return "To Do";
  return words(value);
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
}: {
  value: string;
  variant?: "default" | "monday";
}) {
  const palette = useTheme(),
    tone = statusColors(value, palette),
    accent = indicator[value] || tone.foreground;

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
          {mondayStatusLabel(value)}
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
      {!!indicator[value] && (
        <View
          accessible={false}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: indicator[value],
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
        {words(value)}
      </Text>
    </View>
  );
}

