import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Typography";
import { BusyIndicator } from "./BusyIndicator";
import { useAppearance, useTheme } from "./Appearance";
import { useNavigationHeader } from "../../features/navigation/navigationHeaderContext";
import {
  operationMessage,
  subscribeOperationActivity,
} from "../../shared/operationActivity";

export function SmallProgress({ label }: { label: string }) {
  const palette = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
        flexShrink: 1,
      }}
    >
      <BusyIndicator size={14} color={palette.primary} />
      <Text style={{ fontSize: 12, color: palette.mutedLabel, flexShrink: 1 }}>
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
    bottom ?? (navHeader?.bottomInset || Math.max(14, inset.bottom));

  return (
    <View
      testID="operation-status-floating"
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: resolvedBottom,
        alignItems: "center",
      }}
    >
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          paddingHorizontal: 13,
          paddingVertical: 7,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          shadowColor: isDark ? "#020617" : palette.primaryDark,
          shadowOpacity: isDark ? 0.36 : 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <BusyIndicator size={13} color={palette.primary} />
        <Text
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "600",
            color: palette.mutedLabel,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
