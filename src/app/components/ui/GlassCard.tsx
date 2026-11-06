import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppearance, useTheme } from "./Appearance";
import { LinearGradient } from "expo-linear-gradient";

export function GlassCard({
  children,
  style,
  borderRadius = 28,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  testID?: string;
}) {
  const { isDark } = useAppearance();
  const palette = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          borderRadius,
          // A uniform base with a clipped sheen avoids the former Android white
          // center patch. This is a frosted material, not an expensive live blur.
          backgroundColor: palette.glassSurface,
          borderColor: isDark ? palette.border : palette.glassEdge,
          shadowOpacity: isDark ? 0.3 : 0.06,
        },
        style,
      ]}
    >
      {!isDark && (
        <LinearGradient
          testID="glass-card-sheen"
          pointerEvents="none"
          colors={[palette.glassTop, palette.glassBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    padding: 18,
  },
});
