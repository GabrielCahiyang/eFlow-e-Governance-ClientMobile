import { Pressable, View } from "react-native";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";

export function ProfileToolbarTitle({
  name,
  onPress,
}: {
  name: string;
  onPress: () => void;
}) {
  const palette = useTheme();
  const hour = new Date().getHours(),
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open profile for ${name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        minHeight: 48,
        maxWidth: 200,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: palette.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ fontWeight: "700", color: palette.primary, fontSize: 12 }}
        >
          {initials}
        </Text>
      </View>
      <View style={{ flexShrink: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <EFlowMark height={11} />
          <Text
            numberOfLines={1}
            style={{ color: palette.mutedLabel, fontSize: 10, flexShrink: 1 }}
          >
            {greeting}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: palette.text,
            fontSize: 14,
            lineHeight: 19,
            fontWeight: "700",
          }}
        >
          {name}
        </Text>
      </View>
    </Pressable>
  );
}
