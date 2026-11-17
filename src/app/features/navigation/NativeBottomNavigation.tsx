import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  cubicBezier,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type CSSAnimationKeyframes,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import House from "lucide-react-native/icons/house";
import CalendarCheck2 from "lucide-react-native/icons/calendar-check-2";
import Bell from "lucide-react-native/icons/bell";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Wallet from "lucide-react-native/icons/wallet";
import FolderKanban from "lucide-react-native/icons/folder-kanban";
import More from "lucide-react-native/icons/circle-ellipsis";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import {
  motionDuration,
  motionEase,
  useMotionPreferences,
} from "../../shared/motion";
import type { PrimaryTab } from "../../shared/routes";
import { hiddenBarTabs, primaryTabs, tabLabels } from "./mobileScope";
import { SelectedTabIcon } from "./SelectedTabIcon";

const icons = {
  home: House,
  reviews: ClipboardCheck,
  work: CalendarCheck2,
  inbox: Bell,
  accounting: Wallet,
  projects: FolderKanban,
  more: More,
};

const pressEasing = cubicBezier(0.23, 1, 0.32, 1);
const selectionEasing = Easing.bezier(...motionEase.state);
const iconSettle: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateY: 1 }, { scale: 0.93 }] },
  "48%": { transform: [{ translateY: -1 }, { scale: 1.12 }] },
  "100%": { transform: [{ translateY: 0 }, { scale: 1 }] },
};
const bellRing: CSSAnimationKeyframes = {
  "0%": { transform: [{ rotate: "0deg" }] },
  "30%": { transform: [{ rotate: "-13deg" }] },
  "65%": { transform: [{ rotate: "8deg" }] },
  "100%": { transform: [{ rotate: "0deg" }] },
};
const tabHeight = 52;

type IconType = typeof House;
/** A destination pinned from the More sheet into its own bar slot. */
export type PinnedTab = { label: string; Icon: IconType };

function TabGlyph({
  tab,
  index,
  selection,
  pressed,
  play,
  icon,
}: {
  tab: PrimaryTab;
  index: number;
  selection: SharedValue<number>;
  pressed: boolean;
  play: boolean;
  icon?: IconType;
}) {
  const palette = useTheme();
  const Icon = icon ?? icons[tab];
  const outline = useAnimatedStyle(() => ({
    opacity: selection.get() === index ? 0 : 1,
  }));
  const solid = useAnimatedStyle(() => ({
    opacity: selection.get() === index ? 1 : 0,
  }));
  return (
    <>
      <Animated.View style={[styles.glyph, outline]}>
        <Icon
          size={22}
          color={pressed ? palette.primary : palette.mutedLabel}
        />
      </Animated.View>
      <Animated.View
        testID={`tab-selected-icon-${tab}`}
        style={[
          styles.glyph,
          solid,
          play && {
            animationName: tab === "inbox" ? bellRing : iconSettle,
            animationDuration: motionDuration.expressiveShort,
            animationTimingFunction: pressEasing,
            animationIterationCount: 1,
          },
        ]}
      >
        {icon ? (
          <Icon size={22} color={palette.primary} strokeWidth={2.4} />
        ) : (
          <SelectedTabIcon tab={tab} color={palette.primary} />
        )}
      </Animated.View>
    </>
  );
}

export function NativeBottomNavigation({
  role,
  selected,
  onSelect,
  inboxUnread = false,
  pinned,
  onMore,
  moreOpen = false,
}: {
  role: string;
  selected: PrimaryTab;
  /** Destination shown in the slot before More; it lives in the More stack. */
  pinned?: PinnedTab;
  /** Opens the More sheet. Without it, More selects the More tab. */
  onMore?: () => void;
  moreOpen?: boolean;
  /** Unread Inbox updates; `true` shows a dot when the count is unknown. */
  inboxUnread?: boolean | number;
  onSelect: (tab: PrimaryTab) => void;
}) {
  const palette = useTheme(),
    inset = useSafeAreaInsets(),
    tabs = primaryTabs(role);
  type BarItem = {
    key: string;
    tab: PrimaryTab;
    label: string;
    Icon?: IconType;
    sheet?: boolean;
  };
  const items: BarItem[] = tabs.length
    ? [
        ...tabs
          .filter((tab) => tab !== "more" && !hiddenBarTabs.includes(tab))
          .map((tab) => ({ key: tab, tab, label: tabLabels[tab] })),
        ...(pinned
          ? [
              {
                key: "pinned",
                tab: "more" as const,
                label: pinned.label,
                Icon: pinned.Icon,
              },
            ]
          : []),
        { key: "more-sheet", tab: "more", label: tabLabels.more, sheet: true },
      ]
    : [];
  const { reduced, active: foreground } = useMotionPreferences();
  const animate = !reduced && foreground;
  const [hoveredTab, setHoveredTab] = useState<string>();
  const [trackWidth, setTrackWidth] = useState(0);
  const [motionTab, setMotionTab] = useState<PrimaryTab>();
  const previousSelection = useRef(selected);
  const pinnedIndex = items.findIndex(
    (item) => !item.sheet && item.tab === selected,
  );
  const selectedIndex =
    pinnedIndex >= 0
      ? pinnedIndex
      : selected === "more"
        ? items.length - 1
        : -1;
  const selection = useSharedValue(selectedIndex);
  const discPosition = useSharedValue(selectedIndex);
  const slot = trackWidth / Math.max(1, items.length);
  const size = Math.min(tabHeight, Math.max(0, slot - 4));
  // Layout updates the disc's size and pixel position without starting a tab transition.
  const indicatorMotion = useAnimatedStyle(() => ({
    transform: [
      { translateX: (Math.max(0, discPosition.get()) + 0.5) * slot - size / 2 },
    ],
  }));
  useEffect(() => {
    const changed = previousSelection.current !== selected;
    previousSelection.current = selected;
    const transition = animate && changed;
    selection.set(selectedIndex);
    discPosition.set(
      transition
        ? withTiming(selectedIndex, {
            duration: motionDuration.expressiveShort,
            easing: selectionEasing,
          })
        : selectedIndex,
    );
    setMotionTab(transition ? selected : undefined);
  }, [animate, selected, selectedIndex, selection, discPosition]);
  if (!tabs.length) return null;
  return (
    <View
      testID="native-bottom-navigation"
      style={{
        alignItems: "center",
        flexShrink: 0,
        backgroundColor: palette.background,
        paddingTop: 8,
        paddingBottom: Math.max(12, inset.bottom),
        paddingHorizontal: 16,
      }}
    >
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            shadowColor: "#000",
          },
        ]}
      >
        <View
          testID="tab-track"
          onLayout={({ nativeEvent }) =>
            setTrackWidth(nativeEvent.layout.width)
          }
          style={styles.track}
        >
          {size > 0 && selectedIndex >= 0 && (
            <Animated.View
              testID="tab-selection-indicator"
              pointerEvents="none"
              importantForAccessibility="no"
              style={[
                styles.indicator,
                {
                  top: (tabHeight - size) / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: palette.primarySoft,
                },
                indicatorMotion,
              ]}
            />
          )}
          {items.map((item, index) => {
            const tab = item.tab;
            const active = index === selectedIndex;
            return (
              <Pressable
                key={item.key}
                accessibilityRole={item.sheet && onMore ? "button" : "tab"}
                accessibilityLabel={item.label}
                accessibilityHint={
                  tab === "inbox" && inboxUnread
                    ? typeof inboxUnread === "number"
                      ? `${inboxUnread >= 100 ? "99+" : inboxUnread} unread update${inboxUnread === 1 ? "" : "s"}`
                      : "Unread updates"
                    : undefined
                }
                aria-selected={active}
                accessibilityState={
                  item.sheet && onMore
                    ? { selected: active, expanded: moreOpen }
                    : { selected: active }
                }
                onPress={() =>
                  item.sheet && onMore ? onMore() : onSelect(tab)
                }
                onHoverIn={() => setHoveredTab(item.key)}
                onHoverOut={() =>
                  setHoveredTab((previous) =>
                    previous === item.key ? undefined : previous,
                  )
                }
                style={styles.tab}
              >
                {({ pressed }) => (
                  <View style={styles.iconSlot}>
                    <Animated.View
                      testID={`tab-preview-${item.key}`}
                      pointerEvents="none"
                      style={[
                        styles.preview,
                        {
                          backgroundColor: palette.primarySoft,
                          opacity: !active && hoveredTab === item.key ? 0.55 : 0,
                        },
                        animate && {
                          transitionProperty: "opacity",
                          transitionDuration: motionDuration.productiveMedium,
                          transitionTimingFunction: pressEasing,
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.icon,
                        animate && {
                          transform: [{ scale: pressed ? 0.94 : 1 }],
                          transitionProperty: "transform",
                          transitionDuration: pressed
                            ? motionDuration.productiveMedium
                            : motionDuration.productiveLong,
                          transitionTimingFunction: pressEasing,
                        },
                      ]}
                    >
                      <TabGlyph
                        tab={tab}
                        index={index}
                        selection={selection}
                        pressed={pressed}
                        play={animate && active && motionTab === tab}
                        icon={item.Icon}
                      />
                    </Animated.View>
                    {tab === "inbox" && !!inboxUnread && (
                      <View
                        testID="inbox-unread-indicator"
                        importantForAccessibility="no"
                        pointerEvents="none"
                        style={
                          typeof inboxUnread === "number"
                            ? {
                                position: "absolute",
                                top: 4,
                                right: 2,
                                minWidth: 18,
                                height: 18,
                                borderRadius: 9,
                                paddingHorizontal: 4,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: palette.danger,
                                borderColor: palette.surface,
                                borderWidth: 1,
                              }
                            : {
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: palette.danger,
                                borderColor: palette.surface,
                                borderWidth: 1,
                              }
                        }
                      >
                        {typeof inboxUnread === "number" && (
                          <Text
                            testID="inbox-unread-count"
                            style={{
                              color: palette.onDanger,
                              fontSize: 10,
                              fontWeight: "700",
                              lineHeight: 12,
                            }}
                          >
                            {inboxUnread >= 100 ? "99+" : inboxUnread}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    maxWidth: 440,
    width: "100%",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: tabHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  iconSlot: {
    width: 44,
    maxWidth: "100%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: { position: "absolute", left: 0 },
  preview: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  icon: { width: 24, height: 24, transform: [{ scale: 1 }] },
  glyph: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
