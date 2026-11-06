import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
        left: 20,
        right: 20,
        bottom: insets.bottom + 96,
        alignItems: "center",
      }}
    >
      <View
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 18,
          padding: 12,
          gap: 8,
          maxWidth: 420,
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: palette.mutedLabel,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          You're viewing your last update. Reconnect and retry before making
          changes.
        </Text>
        {!!error && (
          <Button variant="outline" onPress={retry}>
            Retry
          </Button>
        )}
      </View>
    </View>
  );
}
