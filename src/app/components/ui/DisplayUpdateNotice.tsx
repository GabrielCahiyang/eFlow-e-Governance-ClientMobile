import { Text } from "./Typography";
import { useTheme } from "./Appearance";

export function DisplayUpdateNotice({
  visible,
  loading,
}: {
  visible: boolean;
  loading: boolean;
}) {
  const palette = useTheme();
  return visible ? (
    <Text
      accessibilityLiveRegion="polite"
      style={{
        color: palette.mutedLabel,
        fontSize: 13,
        lineHeight: 20,
        paddingVertical: 8,
      }}
    >
      {loading
        ? "Showing your last update while we check for changes."
        : "Showing your last update. Refresh when you're connected."}
    </Text>
  ) : null;
}
