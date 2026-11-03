import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import LoaderCircle from "lucide-react-native/icons/loader-circle";
import { useMotionPreferences } from "../../shared/motion";
export function BusyIndicator({
  size = 18,
  color = "#fff",
}: {
  size?: number;
  color?: string;
}) {
  const { reduced, active } = useMotionPreferences(),
    angle = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(angle);
    angle.value = 0;
    if (active && !reduced)
      angle.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );
    return () => cancelAnimation(angle);
  }, [reduced, active]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  return (
    <Animated.View accessible={false} style={style}>
      <LoaderCircle size={size} color={color} />
    </Animated.View>
  );
}
