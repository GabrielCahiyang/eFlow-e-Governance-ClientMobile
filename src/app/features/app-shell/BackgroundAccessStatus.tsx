import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import WifiOff from "lucide-react-native/icons/wifi-off";
import { Button } from "../../components/ui/Button";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";

export function BackgroundAccessStatus({
  error,
  retry,
}: {
  error?: Error;
  retry: () => void;
}) {
  const palette = useTheme(),
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
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: palette.warningSoft,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <WifiOff size={16} color={palette.warning} />
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
          accessibilityLabel="Retry"
          onPress={retry}
          icon={<RotateCcw size={13} color={palette.text} />}
          style={{
            minHeight: 36,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
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
