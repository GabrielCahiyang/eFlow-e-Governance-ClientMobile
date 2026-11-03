import { useEffect, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  loginMotion,
  motionDuration,
  motionEase,
  loadingMotion,
} from "./tokens";
import { useMotionPreferences } from "./MotionProvider";
import { useAppearance, themedStyle } from "../../components/ui/Appearance";

export function MotionView({
  children,
  index = 0,
  style,
  kind = "enter",
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  kind?: "enter" | "login" | "hero" | "toast" | "startup";
}) {
  const { reduced } = useMotionPreferences();
  const { isDark } = useAppearance();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    progress.value = reduced ? 1 : 0;
    if (!reduced) {
      const enter =
        kind === "login" || kind === "hero"
          ? withSpring(1, loginMotion.enter)
          : withTiming(1, {
              duration:
                kind === "startup"
                  ? loadingMotion.enter
                  : kind === "toast"
                    ? 180
                    : motionDuration.expressiveShort,
              easing:
                kind === "startup"
                  ? Easing.bezier(0, 0, 0.58, 1)
                  : Easing.bezier(...motionEase.enter),
            });
      progress.value = withDelay(
        kind === "login" ? loginMotion.delay + index * loginMotion.stagger : 0,
        enter,
      );
    }
    return () => cancelAnimation(progress);
  }, [reduced, kind, index]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform:
      kind === "hero"
        ? [
            { translateX: (1 - progress.value) * 40 },
            { scale: 0.97 + progress.value * 0.03 },
          ]
        : kind === "toast"
          ? [{ translateX: (1 - progress.value) * 100 }]
          : [
              {
                translateY: (1 - progress.value) * (kind === "login" ? 16 : 5),
              },
            ],
  }));
  return (
    <Animated.View style={[themedStyle(style, isDark), animated]}>
      {children}
    </Animated.View>
  );
}

export function ErrorShake({
  children,
  trigger,
}: {
  children: ReactNode;
  trigger: number;
}) {
  const { reduced } = useMotionPreferences();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!trigger || reduced) {
      x.value = 0;
      return;
    }
    // The source sequence is 0, -6, 5, -3, 0 over 320ms.
    let alive = true;
    const frames = [-6, 5, -3, 0];
    const timers = frames.map((value, index) =>
      setTimeout(() => {
        if (alive)
          x.value = withTiming(value, {
            duration: 80,
            easing: Easing.inOut(Easing.ease),
          });
      }, index * 80),
    );
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      cancelAnimation(x);
    };
  }, [trigger, reduced]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
