import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Bell from "lucide-react-native/icons/bell";
import Briefcase from "lucide-react-native/icons/briefcase-business";
import Folder from "lucide-react-native/icons/folder";
import File from "lucide-react-native/icons/file-text";
import Message from "lucide-react-native/icons/message-circle";
import Building from "lucide-react-native/icons/building-complex";
import Activity from "lucide-react-native/icons/activity";
import Wallet from "lucide-react-native/icons/wallet";
import { useTheme } from "./Appearance";
import { loadingMotion, useMotionPreferences } from "../../shared/motion";

export type EmptyKind =
  | "work"
  | "inbox"
  | "projects"
  | "files"
  | "messages"
  | "workspace"
  | "activity"
  | "finance";
const icons = {
  work: Briefcase,
  inbox: Bell,
  projects: Folder,
  files: File,
  messages: Message,
  workspace: Building,
  activity: Activity,
  finance: Wallet,
};

/** Decorative native artwork: no remote assets, text, status claims or tap targets. */
export function EmptyIllustration({
  kind,
  compact = false,
}: {
  kind: EmptyKind;
  compact?: boolean;
}) {
  const palette = useTheme();
  const { reduced, active } = useMotionPreferences();
  const drift = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(drift);
    drift.value = 0;
    if (!reduced && active) {
      const options = {
        duration: loadingMotion.pulse,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      };
      drift.value = withRepeat(
        withSequence(withTiming(1, options), withTiming(0, options)),
        -1,
        false,
      );
    }
    return () => cancelAnimation(drift);
  }, [reduced, active]);
  const front = useAnimatedStyle(() => ({
    transform: [
      { translateY: -4 * drift.value },
      { rotate: `${-2 + drift.value}deg` },
    ],
  }));
  const back = useAnimatedStyle(() => ({
    transform: [
      { translateY: 3 * drift.value },
      { rotate: `${3 - drift.value}deg` },
    ],
  }));
  const Icon = icons[kind];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={compact ? s.compact : s.stage}
    >
      <View
        testID={`empty-art-${kind}`}
        style={[
          s.stage,
          compact && {
            maxWidth: 240,
            transform: [{ scale: 0.5 }],
            position: "absolute",
            top: -41,
            left: -60,
          },
        ]}
      >
        <View style={[s.halo, { backgroundColor: palette.primarySoft }]} />
        <View
          style={[s.dot, { top: 14, right: 34, backgroundColor: palette.blue }]}
        />
        <View
          style={[
            s.dot,
            {
              bottom: 18,
              left: 28,
              width: 5,
              height: 5,
              backgroundColor: palette.primary,
            },
          ]}
        />
        <Animated.View
          style={[
            s.paper,
            s.back,
            { backgroundColor: palette.blueSoft, borderColor: palette.border },
            back,
          ]}
        >
          <View style={[s.avatar, { backgroundColor: palette.surface }]}>
            <Icon size={18} color={palette.blue} />
          </View>
          <View style={s.lines}>
            <View
              style={[
                s.line,
                { backgroundColor: palette.border, width: "65%" },
              ]}
            />
            <View style={[s.line, { backgroundColor: palette.border }]} />
          </View>
        </Animated.View>
        <Animated.View
          style={[
            s.paper,
            s.front,
            { backgroundColor: palette.surface, borderColor: palette.border },
            front,
          ]}
        >
          <View style={[s.avatar, { backgroundColor: palette.primarySoft }]}>
            <Icon size={22} color={palette.primary} />
          </View>
          <View style={s.lines}>
            <View
              style={[
                s.line,
                { backgroundColor: palette.border, width: "72%" },
              ]}
            />
            <View style={[s.line, { backgroundColor: palette.primarySoft }]} />
          </View>
        </Animated.View>
        <View
          style={[
            s.seal,
            {
              backgroundColor: palette.blueSoft,
              borderColor: palette.background,
            },
          ]}
        >
          <View style={[s.dot, { backgroundColor: palette.blue }]} />
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  stage: { width: 240, height: 164, maxWidth: "100%", alignSelf: "center" },
  compact: { width: 120, height: 82, maxWidth: "100%", alignSelf: "center" },
  halo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 70,
    left: 45,
    top: 7,
  },
  paper: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 190,
    height: 58,
  },
  back: { top: 78, left: 38 },
  front: { top: 34, left: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  lines: { flex: 1, gap: 8 },
  line: { height: 6, width: "100%", borderRadius: 3 },
  dot: { position: "absolute", width: 7, height: 7, borderRadius: 4 },
  seal: {
    position: "absolute",
    top: 102,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
