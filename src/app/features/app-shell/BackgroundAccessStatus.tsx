import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import WifiOff from "lucide-react-native/icons/wifi-off";
import { Button } from "../../components/ui/Button";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { withOpacity } from "../../components/ui/theme";

export function BackgroundAccessStatus({
  error,
  retry,
}: {
  error?: Error;
  retry: () => void;
}) {
  const palette = useTheme(),
    { isDark } = useAppearance(),
    insets = useSafeAreaInsets();
  if (!error) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: insets.bottom + 96,
        alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          gap: 10,
          maxWidth: 420,
          width: "100%",
        }}
      >
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            {
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 1,
              backgroundColor: isDark
                ? withOpacity(palette.warning, 0.18)
                : "#ffffff",
              borderColor: withOpacity(palette.warning, isDark ? 0.32 : 0.22),
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            },
            !isDark && {
              shadowColor: "#101849",
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            },
          ]}
        >
          <WifiOff size={18} color={palette.warning} />
        </View>
        <Text
          accessibilityLiveRegion="polite"
          style={{
            flex: 1,
            color: palette.muted,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          You're viewing your last update. Reconnect and retry before making
          changes.
        </Text>
        <Button
          variant="outline"
          compact
          accessibilityLabel="Retry"
          onPress={retry}
          icon={<RotateCcw size={12} color={palette.text} />}
          style={{
            minHeight: 36,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 18,
            backgroundColor: palette.background,
            borderColor: palette.border,
            flexShrink: 0,
          }}
          textStyle={{ fontSize: 12, fontWeight: "600", color: palette.text }}
        >
          Retry
        </Button>
      </View>
    </View>
  );
}
