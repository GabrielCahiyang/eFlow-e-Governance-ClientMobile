import { Text } from "./Typography";
import {
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  Pressable as NativePressable,
} from "react-native";
import { View } from "./Primitives";
import type { ReactNode } from "react";
import { radius } from "./theme";
import { BusyIndicator } from "./BusyIndicator";
import { useTheme } from "./Appearance";
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
  const palette = useTheme();
  const foreground =
    variant === "primary"
      ? palette.onPrimary
      : variant === "danger"
        ? palette.onDanger
        : variant === "ghost"
          ? palette.primary
          : palette.text;
  return (
    <NativePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            variant === "primary"
              ? palette.primary
              : variant === "danger"
                ? palette.danger
                : variant === "outline"
                  ? palette.surface
                  : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: palette.border,
        },
        (disabled || busy) && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      {busy ? <BusyIndicator color={foreground} /> : icon}
      <Text style={[s.text, { color: foreground }, textStyle]}>{children}</Text>
    </NativePressable>
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
    minHeight: 48,
    borderRadius: radius.control,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  text: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
});
