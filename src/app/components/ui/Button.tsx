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
import { withOpacity } from "./theme";
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
  trailing,
  iconBadgeColor,
  align = "center",
  compact = false,
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
  trailing?: ReactNode;
  iconBadgeColor?: string;
  align?: "center" | "start";
  compact?: boolean;
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
  const filled = variant === "primary" || variant === "danger";
  const flatStyle = style ? StyleSheet.flatten(style) : undefined;
  const isCompact =
    compact ||
    (typeof flatStyle?.minHeight === "number" && flatStyle.minHeight < 44);
  const badgeSize = isCompact ? 22 : 28;
  const badgeBg =
    iconBadgeColor ??
    (filled ? withOpacity(foreground, 0.18) : palette.primarySoft);
  const alignStart = align === "start" || Boolean(trailing);

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
        isCompact && s.compactButton,
        {
          backgroundColor:
            variant === "primary"
              ? palette.primary
              : variant === "danger"
                ? palette.danger
                : variant === "outline"
                  ? pressed
                    ? palette.primarySoft
                    : palette.surface
                  : pressed
                    ? palette.primarySoft
                    : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: palette.border,
        },
        (disabled || busy) && s.disabled,
        pressed && variant !== "outline" && variant !== "ghost" && s.pressed,
        style,
      ]}
    >
      {(busy || icon) && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: badgeBg,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {busy ? (
            <BusyIndicator size={isCompact ? 12 : 16} color={foreground} />
          ) : (
            icon
          )}
        </View>
      )}
      <Text
        textBreakStrategy="simple"
        style={[
          s.text,
          { color: foreground },
          alignStart && s.startText,
          textStyle,
        ]}
      >
        {children}
      </Text>
      {trailing}
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
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  compactButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  startText: {
    flex: 1,
    textAlign: "left",
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
});
