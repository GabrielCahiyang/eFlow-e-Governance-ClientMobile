import { useEffect, useId, useMemo } from "react";
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
import { SvgXml } from "react-native-svg";
import { useAppearance } from "./Appearance";
import { loadingMotion, useMotionPreferences } from "../../shared/motion";
import { storysetXml, type StorysetKind } from "./storysetIllustrations";

export type EmptyKind =
  | StorysetKind
  | "work"
  | "messages"
  | "workspace"
  | "activity"
  | "finance";

const kindToStoryset: Record<EmptyKind, StorysetKind> = {
  empty: "empty",
  search: "search",
  inbox: "inbox",
  projects: "projects",
  tasks: "tasks",
  work: "tasks",
  activity: "tasks",
  complete: "complete",
  files: "files",
  chat: "chat",
  messages: "chat",
  people: "people",
  workspace: "people",
  budget: "budget",
  finance: "budget",
};

function scopeSvgIds(xml: string, suffix: string) {
  if (!xml.includes('id="')) return xml;
  return xml
    .replaceAll(/id="([^"]+)"/g, (_, id: string) => `id="${id}-${suffix}"`)
    .replaceAll(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${id}-${suffix})`);
}

/** Decorative native Storyset artwork (recolored to eFlow blue): no remote assets or tap targets. */
export function EmptyIllustration({
  kind,
  compact = false,
}: {
  kind: EmptyKind;
  compact?: boolean;
}) {
  const { isDark } = useAppearance();
  const { reduced, active } = useMotionPreferences();
  const rawId = useId();
  const idSuffix = useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, ""), [rawId]);
  const xml = useMemo(
    () => scopeSvgIds(storysetXml[kindToStoryset[kind]], idSuffix),
    [kind, idSuffix],
  );
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
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * drift.value }],
  }));
  const width = compact ? 112 : 176;
  const height = compact ? 80 : 128;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={s.wrap}
    >
      <Animated.View
        testID={`empty-art-${kind}`}
        style={[
          s.frame,
          isDark && {
            backgroundColor: "#eef3ff",
            borderRadius: compact ? 12 : 16,
            paddingHorizontal: compact ? 8 : 12,
            paddingVertical: compact ? 6 : 8,
          },
          floatStyle,
        ]}
      >
        <SvgXml
          xml={xml}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "100%",
    alignSelf: "center",
  },
  frame: {
    alignItems: "center",
    justifyContent: "center",
  },
});
