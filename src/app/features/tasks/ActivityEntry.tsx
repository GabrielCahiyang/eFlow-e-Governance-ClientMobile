import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { space } from "../../components/ui/theme";
import { activityTime, type ActivityField } from "./activityPresentation";

export type TimelineEntry = {
  id: string;
  title: string;
  time: number;
  actor?: string;
  subject?: string;
  fields?: ActivityField[];
  body?: ReactNode;
};

export function ActivityEntry({ entry }: { entry: TimelineEntry }) {
  const palette = useTheme();
  return (
    <View
      style={{
        paddingVertical: space.md,
        gap: space.xs,
        borderBottomWidth: 0.5,
        borderColor: palette.border,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{entry.title}</Text>
      <Text style={{ color: palette.mutedLabel, fontSize: 13 }}>
        {entry.actor || "Actor unavailable"} · {activityTime(entry.time)}
      </Text>
      {!!entry.subject && (
        <Text style={{ fontWeight: "600" }}>{entry.subject}</Text>
      )}
      {entry.fields?.map(({ label, value }) => (
        <Text key={label} selectable>
          <Text style={{ fontWeight: "600" }}>{label}:</Text> {value}
        </Text>
      ))}
      {entry.body}
    </View>
  );
}
