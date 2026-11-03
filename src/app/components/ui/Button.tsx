import { Text } from "./Typography";
import {
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Pressable, View } from "./Primitives";
import type { ReactNode } from "react";
import { colors } from "./theme";
import { BusyIndicator } from "./BusyIndicator";
export function Button({
  children,
  onPress,
  onLongPress,
  disabled,
  busy,
  variant = "primary",
  icon,
  style,
  accessibilityLabel,
  textStyle,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "outline" | "ghost" | "danger";
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  textStyle?: StyleProp<TextStyle>;
}) {
  const foreground =
    variant === "primary" || variant === "danger"
      ? "#fff"
      : variant === "ghost"
        ? colors.primary
        : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        s.button,
        variant === "primary"
          ? s.primary
          : variant === "danger"
            ? s.danger
            : variant === "outline"
              ? s.outline
              : s.ghost,
        (disabled || busy) && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      {busy ? <BusyIndicator color={foreground} /> : icon}
      <Text style={[s.text, { color: foreground }, textStyle]}>{children}</Text>
    </Pressable>
  );
}
export const Row = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[s.row, style]}>{children}</View>;
const s = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ghost: { backgroundColor: "transparent" },
  text: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
});
