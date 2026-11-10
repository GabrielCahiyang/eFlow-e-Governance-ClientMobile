import {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactElement,
} from "react";
import {
  SectionList,
  FlatList,
  StyleSheet,
  View,
  type ScrollViewProps,
} from "react-native";
import LottieView from "lottie-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useMotionPreferences } from "../../shared/motion/MotionProvider";
import { useAppearance } from "./Appearance";

const lightFolder = require("../../../../assets/animations/open-folder-light.json");
const darkFolder = require("../../../../assets/animations/open-folder-dark.json");

const slotHeight = 56;
const commitDistance = 46;
const settle = { duration: 400, dampingRatio: 1, overshootClamping: true };
const refreshActions = [{ name: "refresh", label: "Refresh" }];

type FolderScrollProps = Pick<
  ScrollViewProps,
  | "onScroll"
  | "scrollEventThrottle"
  | "bounces"
  | "overScrollMode"
  | "accessibilityActions"
  | "onAccessibilityAction"
>;

export const RefreshSectionList = Animated.createAnimatedComponent(
  SectionList,
) as unknown as typeof SectionList; // Reanimated erases the list's item and section generics.

export const RefreshFlatList = Animated.createAnimatedComponent(
  FlatList,
) as unknown as typeof FlatList;

export function FolderPullArea({
  pull: { refresh, refreshing },
  children,
  frame,
}: {
  pull: { refresh: () => Promise<unknown>; refreshing: boolean };
  children: ReactElement<FolderScrollProps>;
  frame?: (scroll: ReactElement) => ReactElement;
}) {
  const { reduced } = useMotionPreferences();
  const scrollY = useSharedValue(0);
  const distance = useSharedValue(0);
  const pendingGesture = useSharedValue(false);
  const busy = useSharedValue(refreshing);
  const horizontalScroll = useMemo(() => Gesture.Native(), []);
  const nativeScroll = useMemo(
    () => Gesture.Native().simultaneousWithExternalGesture(horizontalScroll),
    [horizontalScroll],
  );

  useEffect(() => busy.set(refreshing), [busy, refreshing]);

  const release = useCallback(async () => {
    try {
      await refresh();
    } finally {
      pendingGesture.set(false);
    }
  }, [refresh, pendingGesture]);

  useAnimatedReaction(
    () => busy.get() || pendingGesture.get(),
    (held, previous) => {
      if (held === previous) return;
      const target = held ? slotHeight : 0;
      distance.set(reduced ? target : withSpring(target, settle));
    },
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(
      Math.max(0, event.contentOffset.y + (event.contentInset?.top ?? 0)),
    );
  });
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(9)
        .failOffsetY(-9)
        .failOffsetX([-16, 16])
        .maxPointers(1)
        .simultaneousWithExternalGesture(nativeScroll, horizontalScroll)
        .onTouchesDown((_event, state) => {
          if (scrollY.get() > 1 || busy.get() || pendingGesture.get())
            state.fail();
        })
        .onUpdate(({ translationY }) => {
          distance.set(Math.max(0, Math.min(slotHeight, translationY * 0.55)));
        })
        .onEnd((_event, success) => {
          if (success && distance.get() >= commitDistance && !busy.get()) {
            pendingGesture.set(true);
            scheduleOnRN(release);
          }
        })
        .onFinalize(() => {
          if (!busy.get() && !pendingGesture.get() && distance.get() > 0) {
            distance.set(reduced ? 0 : withSpring(0, settle));
          }
        }),
    [
      nativeScroll,
      horizontalScroll,
      scrollY,
      busy,
      distance,
      pendingGesture,
      reduced,
      release,
    ],
  );
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: distance.get() }],
  }));
  const slotStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, distance.get() / 18),
    transform: [{ translateY: distance.get() - slotHeight }],
  }));

  const scroll = (
    <GestureDetector gesture={nativeScroll}>
      {cloneElement(children, {
        onScroll,
        scrollEventThrottle: 16,
        bounces: false,
        overScrollMode: "never",
        accessibilityActions: refreshActions,
        onAccessibilityAction: ({ nativeEvent }) => {
          if (nativeEvent.actionName === "refresh") void refresh();
        },
      })}
    </GestureDetector>
  );

  return (
    <GestureDetector gesture={pan} touchAction="pan-y">
      <View style={styles.viewport}>
        <Animated.View pointerEvents="none" style={[styles.slot, slotStyle]}>
          <FolderRefreshIndicator refreshing={refreshing} />
        </Animated.View>
        <Animated.View style={[styles.body, bodyStyle]}>
          {frame ? (
            <GestureDetector gesture={horizontalScroll}>
              {frame(scroll)}
            </GestureDetector>
          ) : (
            scroll
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function FolderRefreshIndicator({ refreshing }: { refreshing: boolean }) {
  const { isDark } = useAppearance();
  const { reduced, active } = useMotionPreferences();
  const animation = useRef<LottieView>(null);
  const play = refreshing && !reduced && active;
  useEffect(() => {
    if (!play) animation.current?.reset();
  }, [play]);

  return (
    <View
      accessible={refreshing}
      importantForAccessibility={refreshing ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!refreshing}
      accessibilityRole={refreshing ? "progressbar" : undefined}
      accessibilityLabel={refreshing ? "Refreshing" : undefined}
      accessibilityState={{ busy: refreshing }}
    >
      <LottieView
        ref={animation}
        source={isDark ? darkFolder : lightFolder}
        style={styles.folder}
        autoPlay={play}
        loop={play}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: "hidden" },
  body: { flex: 1 },
  slot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: slotHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  folder: { width: 52, height: 52 },
});
