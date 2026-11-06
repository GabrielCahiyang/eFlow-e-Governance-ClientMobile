import { useEffect, type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { View } from "../Primitives";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { loadingMotion, useMotionPreferences } from "../../../shared/motion";
import { useTheme } from "../Appearance";

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const palette = useTheme();
  return (
    <View
      style={[
        { height: 36, borderRadius: 8, backgroundColor: palette.border },
        style,
      ]}
    />
  );
}
export function SkeletonPulse({
  children,
  duration = loadingMotion.pulse,
  minimum = loadingMotion.pulseMinimum,
  style,
}: {
  children: ReactNode;
  duration?: number;
  minimum?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduced, active } = useMotionPreferences();
  const opacity = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(opacity);
    opacity.value = 1;
    if (!reduced && active)
      opacity.value = withRepeat(
        withSequence(
          withTiming(minimum, {
            duration: duration / 2,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(1, {
            duration: duration / 2,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
        ),
        -1,
        false,
      );
    return () => cancelAnimation(opacity);
  }, [reduced, active, duration, minimum]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[style, animated]}
    >
      {children}
    </Animated.View>
  );
}
