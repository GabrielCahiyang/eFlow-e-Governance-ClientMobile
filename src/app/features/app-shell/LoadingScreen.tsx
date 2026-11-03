import { Text } from "../../components/ui/Typography";
import { useEffect } from "react";
import {StyleSheet} from "react-native";
import {View} from '../../components/ui/Primitives';
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { EFlowMark } from "../../components/brand/EFlowMark";
import {
  MotionView,
  loadingMotion,
  useMotionPreferences,
} from "../../shared/motion";

export function LoadingScreen({
  label = "Getting things done",
}: {
  label?: string;
}) {
  const { reduced, active } = useMotionPreferences();
  const progress = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (!reduced && active)
      progress.value = withRepeat(
        withTiming(1, {
          duration: loadingMotion.sweep,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false,
      );
    return () => cancelAnimation(progress);
  }, [reduced, active]);
  const sweep = useAnimatedStyle(() => ({
    width: reduced ? 168 : 75.6,
    opacity: reduced ? 0.6 : 1,
    transform: [{ translateX: reduced ? 0 : -79.38 + progress.value * 328.86 }],
  }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading eFlow"
      accessibilityState={{ busy: true }}
      style={s.root}
    >
      <MotionView kind="startup" style={s.content}>
        <View style={s.logo}>
          <EFlowMark height={58} state="submitting" />
        </View>
        <Text style={s.title}>{label}</Text>
        <View style={s.track}>
          <Animated.View style={[{ height: 3 }, sweep]}>
            <LinearGradient
              colors={["#0073ea", "#0c8c88"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 8 }}
            />
          </Animated.View>
        </View>
      </MotionView>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: { width: "100%", maxWidth: 360, alignItems: "center" },
  logo: { height: 58, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.6,
    lineHeight: 31.2,
    color: "#182b35",
    marginTop: 18,
    marginBottom: 24,
    textAlign: "center",
  },
  track: {
    width: 168,
    height: 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#dce7ee",
  },
});
