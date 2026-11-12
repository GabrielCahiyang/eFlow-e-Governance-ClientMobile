import type { ReactNode } from "react";
import { View } from "react-native";
import Circle from "lucide-react-native/icons/circle";
import CircleCheck from "lucide-react-native/icons/circle-check";
import MessageSquare from "lucide-react-native/icons/message-square";
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

export function ActivityEntry({
  entry,
  last = false,
}: {
  entry: TimelineEntry;
  last?: boolean;
}) {
  const palette = useTheme();
  const positive = /approv|complet/i.test(entry.title);
  const note = /note|comment/i.test(entry.title);
  const Icon = positive ? CircleCheck : note ? MessageSquare : Circle;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.sm,
      }}
    >
      <View style={{ width: 20, alignItems: "center" }}>
        <Icon size={16} color={positive ? palette.success : palette.primary} />
        {!last && (
          <View
            style={{
              width: 1,
              flex: 1,
              backgroundColor: palette.border,
              marginTop: 4,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: space.lg, gap: space.xs }}>
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
    </View>
  );
}
