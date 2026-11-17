import { Pressable, View } from "react-native";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import X from "lucide-react-native/icons/x";
import { Text } from "./Typography";
import { useAppearance, useTheme } from "./Appearance";
import { withOpacity } from "./theme";

export function FilterChip({
  label,
  onPress,
  selected = false,
  icon = false,
  accessibilityLabel,
  count,
  showZeroCount = false,
  tone = "default",
  removable = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  icon?: boolean;
  accessibilityLabel?: string;
  /** Optional badge, e.g. unread items in this filter. Hidden when 0 unless showZeroCount is true. */
  count?: number;
  showZeroCount?: boolean;
  tone?: "default" | "tinted";
  removable?: boolean;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();

  const tinted = tone === "tinted" && !selected;
  const fg = selected
    ? palette.onPrimary
    : tinted
      ? palette.primaryDark
      : icon
        ? palette.text
        : palette.muted;
  const badgeBg = selected
    ? isDark
      ? "rgba(8, 20, 47, 0.22)"
      : "rgba(255, 255, 255, 0.22)"
    : palette.primarySoft;
  const badgeFg = selected ? palette.onPrimary : palette.primaryDark;
  const hasCount =
    typeof count === "number" && (showZeroCount ? count >= 0 : count > 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        minHeight: 38,
        maxWidth: "100%",
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 7,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: selected
          ? palette.primary
          : tinted
            ? withOpacity(palette.primary, isDark ? 0.34 : 0.16)
            : palette.border,
        backgroundColor: selected
          ? palette.primary
          : tinted
            ? palette.primarySoft
            : pressed
              ? palette.primarySoft
              : palette.surface,
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
        {icon && (
          <SlidersHorizontal
            size={14}
            color={selected ? palette.onPrimary : palette.primary}
          />
        )}
        <Text
          style={{
            fontSize: 12.5,
            fontWeight: "700",
            color: fg,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
        {hasCount && (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: badgeBg,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: badgeFg,
              }}
            >
              {count! > 99 ? "99+" : count}
            </Text>
          </View>
        )}
        {removable && <X size={13} color={fg} />}
      </View>
    </Pressable>
  );
}
