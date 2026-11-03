import { useEffect } from "react";
import { View } from "../ui/Primitives";
import Svg, { Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  loginMotion,
  motionEase,
  useMotionPreferences,
} from "../../shared/motion";
import { markPaths } from "./markPaths";
import { useAppearance } from "../ui/Appearance";

export type MarkState = "idle" | "submitting" | "success" | "error";
export function EFlowMark({
  state = "idle",
  isHovered = false,
  height = 42,
  variant = "default",
  label = "eFlow",
}: {
  state?: MarkState;
  isHovered?: boolean;
  height?: number;
  variant?: "default" | "white";
  label?: string;
}) {
  const { reduced, active } = useMotionPreferences();
  const { isDark } = useAppearance();
  const angle = useSharedValue(0),
    speed = useSharedValue<number>(loginMotion.idleSpeed),
    phase = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(angle);
    if (reduced) {
      angle.value = 0;
      phase.value = 0;
      return;
    }
    phase.value = 1;
    angle.value = withTiming(
      360,
      {
        duration: loginMotion.mountSpin,
        easing: Easing.bezier(...motionEase.expo),
      },
      (finished) => {
        if (finished) {
          angle.value = 0;
          phase.value = 0;
        }
      },
    );
    return () => cancelAnimation(angle);
  }, [reduced]);
  useEffect(() => {
    speed.value = reduced
      ? 0
      : withSpring(
          state === "submitting"
            ? loginMotion.submittingSpeed
            : isHovered
              ? loginMotion.hoverSpeed
              : loginMotion.idleSpeed,
          loginMotion.speed,
        );
    if (reduced) return;
    if (state === "error") {
      phase.value = 2;
      angle.value = withSpring(angle.value - 25, loginMotion.error, (done) => {
        if (done) phase.value = 0;
      });
    } else if (state === "success") {
      phase.value = 3;
      angle.value = withSpring(
        Math.ceil(angle.value / 360) * 360,
        loginMotion.success,
        (done) => {
          if (done) angle.value = 0;
        },
      );
    } else if (phase.value > 1) {
      cancelAnimation(angle);
      phase.value = 0;
    }
    return () => cancelAnimation(speed);
  }, [state, isHovered, reduced]);
  const frame = useFrameCallback((info) => {
    if (phase.value !== 0 || state === "success") return;
    angle.value =
      (angle.value +
        (speed.value * Math.min(info.timeSincePreviousFrame ?? 0, 64)) / 1000) %
      360;
  }, false);
  useEffect(() => {
    frame.setActive(active && !reduced);
    return () => frame.setActive(false);
  }, [active, reduced, frame]);
  const rotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  const unit = height / 88.6632;
  const ringSize = 72;
  const color = variant === "white" || isDark ? "#ffffff" : "#01006b",
    accent = variant === "white" || isDark ? "#60a5fa" : "#0073ea";
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ height, width: (height * 328) / 88.6632 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 328 88.6632" fill="none">
        {markPaths.slice(0, 4).map((d, index) => (
          <Path key={index} d={d} fill={color} />
        ))}
      </Svg>
      <Animated.View pointerEvents="none" style={[{
        position: "absolute",
        left: (196.964 - ringSize / 2) * unit,
        top: (46.234 - ringSize / 2) * unit,
        width: ringSize * unit,
        height: ringSize * unit,
      }, rotation]}>
        <Svg width="100%" height="100%" viewBox="160.964 10.234 72 72" fill="none">
          <Path d={markPaths[4]} fill={accent} />
          <Path d={markPaths[5]} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
