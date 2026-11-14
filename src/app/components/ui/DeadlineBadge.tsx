import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import Clock from "lucide-react-native/icons/clock";
import { Text } from "./Typography";
import { deadlinePresentation } from "../../../core/web/app/shared/deadlinePresentation";
import { dateLabel } from "./theme";
import { useTheme } from "./Appearance";

export function DeadlineBadge({
  value,
  status,
}: {
  value?: string | null;
  status?: string;
}) {
  const palette = useTheme();
  const tones = {
    green: { color: palette.success },
    yellow: { color: palette.warning },
    red: { color: palette.danger },
    neutral: { color: palette.mutedLabel },
  };
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 60000);
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(id);
      app.remove();
    };
  }, []);
  const d = deadlinePresentation(value, status, now);
  const tone = tones[d.tone] || tones.neutral;
  const labelText = (d.date ? dateLabel(d.date) + " · " : "") + d.label;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
      }}
      accessibilityLabel={`Deadline: ${labelText}`}
    >
      <Clock size={12} color={tone.color} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: tone.color,
        }}
      >
        {labelText}
      </Text>
    </View>
  );
}
