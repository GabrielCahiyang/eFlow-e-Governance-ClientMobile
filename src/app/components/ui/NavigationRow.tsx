import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Check from "lucide-react-native/icons/check";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
export function NavigationRow({
  title,
  description,
  icon,
  selected,
  onPress,
  disabled = false,
  accessibilityHint,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled,
        ...(selected === undefined ? {} : { checked: selected }),
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        padding: 16,
        gap: 12,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 0.5,
        borderBottomColor: palette.border,
        backgroundColor:
          pressed || selected ? palette.primarySoft : palette.surface,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {icon}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: palette.text, fontWeight: "600" }}>{title}</Text>
        {!!description && (
          <Text
            style={{ color: palette.mutedLabel, fontSize: 13, lineHeight: 18 }}
          >
            {description}
          </Text>
        )}
      </View>
      {selected === undefined ? (
        <ChevronRight size={18} color={palette.mutedLabel} />
      ) : selected ? (
        <Check size={20} color={palette.primary} />
      ) : null}
    </Pressable>
  );
}
