import { useEffect, useState } from "react";
import { AppState } from "react-native";
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
    green: { backgroundColor: palette.successSoft, color: palette.success },
    yellow: { backgroundColor: palette.warningSoft, color: palette.warning },
    red: { backgroundColor: palette.dangerSoft, color: palette.danger },
    neutral: { backgroundColor: palette.background, color: palette.muted },
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
  return (
    <Text
      style={[
        {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 7,
        },
        tones[d.tone],
      ]}
    >
      {d.date ? dateLabel(d.date) + " · " : ""}
      {d.label}
    </Text>
  );
}
