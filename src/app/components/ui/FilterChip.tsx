import { Pressable, View } from "react-native";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";

export function FilterChip({
  label,
  onPress,
  selected = false,
  icon = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  icon?: boolean;
  accessibilityLabel?: string;
}) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        minHeight: 44,
        maxWidth: "100%",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: selected ? palette.primary : palette.border,
        backgroundColor:
          selected || pressed ? palette.primarySoft : palette.surface,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 1,
        }}
      >
        {icon && <SlidersHorizontal size={16} color={palette.primary} />}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: selected ? palette.primary : palette.text,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
