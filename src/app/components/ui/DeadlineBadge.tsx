import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Text } from "./Typography";
import { deadlinePresentation } from "../../../core/web/app/shared/deadlinePresentation";
import { dateLabel } from "./theme";
const tones = {
  green: { backgroundColor: "#dcfce7", color: "#166534" },
  yellow: { backgroundColor: "#fef3c7", color: "#92400e" },
  red: { backgroundColor: "#fee2e2", color: "#991b1b" },
  neutral: { backgroundColor: "#e2e8f0", color: "#334155" },
};
export function DeadlineBadge({
  value,
  status,
}: {
  value?: string | null;
  status?: string;
}) {
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
