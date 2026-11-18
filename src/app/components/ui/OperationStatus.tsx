import { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Typography";
import { BusyIndicator } from "./BusyIndicator";
import { useAppearance, useTheme } from "./Appearance";
import { withOpacity } from "./theme";
import { MotionView } from "../../shared/motion";
import { useNavigationHeader } from "../../features/navigation/navigationHeaderContext";
import {
  operationMessage,
  subscribeOperationActivity,
} from "../../shared/operationActivity";

export function SmallProgress({ label }: { label: string }) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={[
        styles.inlinePill,
        {
          backgroundColor: isDark
            ? withOpacity(palette.primary, 0.16)
            : palette.primarySoft,
          borderColor: withOpacity(palette.primary, isDark ? 0.34 : 0.18),
        },
      ]}
    >
      <BusyIndicator size={13} color={palette.primary} />
      <Text
        style={[
          styles.inlineLabel,
          { color: isDark ? palette.text : palette.primaryDark },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function OperationStatus({
  variant = "inline",
  bottom,
}: {
  variant?: "inline" | "floating";
  bottom?: number;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const inset = useSafeAreaInsets();
  const navHeader = useNavigationHeader();
  const label = useSyncExternalStore(
    subscribeOperationActivity,
    operationMessage,
    operationMessage,
  );
  if (!label) return null;
  if (variant === "inline") return <SmallProgress label={label} />;

  const resolvedBottom =
    bottom ??
    (navHeader?.bottomInset
      ? navHeader.bottomInset + 8
      : Math.max(16, inset.bottom + 8));

  const pillBg = isDark ? "#131d3d" : "#ffffff";
  const pillBorder = withOpacity(palette.primary, isDark ? 0.34 : 0.16);
  const gradientColors: [string, string] = isDark
    ? ["rgba(28,42,84,0.96)", "rgba(15,24,52,0.96)"]
    : ["rgba(255,255,255,0.98)", "rgba(238,243,255,0.96)"];
  const chipBg = isDark
    ? withOpacity(palette.primary, 0.22)
    : palette.primarySoft;
  const chipBorder = withOpacity(palette.primary, isDark ? 0.36 : 0.2);

  return (
    <View
      testID="operation-status-floating"
      pointerEvents="none"
      style={[styles.floatingWrap, { bottom: resolvedBottom }]}
    >
      <MotionView kind="toast">
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityState={{ busy: true }}
          accessibilityLiveRegion="polite"
          style={[
            styles.floatingPill,
            {
              backgroundColor: pillBg,
              borderColor: pillBorder,
              shadowColor: isDark ? "#020617" : "#00004f",
              shadowOpacity: isDark ? 0.42 : 0.12,
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.spinnerChip,
              {
                backgroundColor: chipBg,
                borderColor: chipBorder,
              },
            ]}
          >
            <BusyIndicator size={13} color={palette.primary} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.floatingLabel, { color: palette.text }]}
          >
            {label}
          </Text>
        </View>
      </MotionView>
    </View>
  );
}

const styles = StyleSheet.create({
  inlinePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  inlineLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    includeFontPadding: false,
    flexShrink: 1,
  },
  floatingWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 50,
  },
  floatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    maxWidth: "92%",
  },
  spinnerChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  floatingLabel: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
    includeFontPadding: false,
    flexShrink: 1,
  },
});
