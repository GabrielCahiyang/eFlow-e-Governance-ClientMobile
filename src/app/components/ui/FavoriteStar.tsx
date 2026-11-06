import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  cubicBezier,
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import Star from "lucide-react-native/icons/star";
import {
  motionDuration,
  motionEase,
  useMotionPreferences,
} from "../../shared/motion";
import { useTheme } from "./Appearance";

// One short acknowledgement of a tap; never runs on mount or an external update.
const starPop: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 1 }, { rotate: "0deg" }] },
  "40%": { transform: [{ scale: 1.24 }, { rotate: "-14deg" }] },
  "72%": { transform: [{ scale: 1.08 }, { rotate: "8deg" }] },
  "100%": { transform: [{ scale: 1 }, { rotate: "0deg" }] },
};
export function FavoriteStar({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  const palette = useTheme(),
    { reduced, active } = useMotionPreferences();
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (reduced || !active) setPulse(0);
  }, [reduced, active]);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => {
        onToggle();
        setPulse((value) => (!reduced && active ? value + 1 : 0));
      }}
      style={{
        width: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        key={pulse}
        testID="favorite-star-motion"
        style={{
          animationName: pulse && !reduced && active ? starPop : undefined,
          animationDuration: motionDuration.expressiveShort,
          animationTimingFunction: cubicBezier(...motionEase.state),
          animationIterationCount: 1,
        }}
      >
        <Star
          size={24}
          strokeWidth={1.7}
          color={checked ? palette.primary : palette.mutedLabel}
          fill={checked ? palette.primary : "transparent"}
        />
      </Animated.View>
    </Pressable>
  );
}
