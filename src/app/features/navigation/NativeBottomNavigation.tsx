import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import House from "lucide-react-native/icons/house";
import CalendarCheck2 from "lucide-react-native/icons/calendar-check-2";
import Bell from "lucide-react-native/icons/bell";
import Wallet from "lucide-react-native/icons/wallet";
import FolderKanban from "lucide-react-native/icons/folder-kanban";
import More from "lucide-react-native/icons/ellipsis";
import { useTheme } from "../../components/ui/Appearance";
import { useMotionPreferences } from "../../shared/motion";
import type { PrimaryTab } from "../../shared/routes";
import { primaryTabs, tabLabels } from "./mobileScope";

const icons = {
  home: House,
  work: CalendarCheck2,
  inbox: Bell,
  accounting: Wallet,
  projects: FolderKanban,
  more: More,
};

const highlightEasing = cubicBezier(0.23, 1, 0.32, 1);

export function NativeBottomNavigation({
  role,
  selected,
  onSelect,
}: {
  role: string;
  selected: PrimaryTab;
  onSelect: (tab: PrimaryTab) => void;
}) {
  const palette = useTheme(),
    inset = useSafeAreaInsets(),
    tabs = primaryTabs(role);
  const { reduced } = useMotionPreferences();
  const [hoveredTab, setHoveredTab] = useState<PrimaryTab>();
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
        {tabs.map((tab) => {
          const Icon = icons[tab],
            active = selected === tab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={tabLabels[tab]}
              aria-selected={active}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(tab)}
              onHoverIn={() => setHoveredTab(tab)}
              onHoverOut={() =>
                setHoveredTab((previous) =>
                  previous === tab ? undefined : previous,
                )
              }
              style={styles.tab}
            >
              {({ pressed }) => (
                <View style={styles.iconSlot}>
                  <Animated.View
                    testID={`tab-highlight-${tab}`}
                    pointerEvents="none"
                    style={[
                      styles.highlight,
                      {
                        backgroundColor: palette.primarySoft,
                        opacity:
                          active || pressed ? 1 : hoveredTab === tab ? 0.55 : 0,
                      },
                      !reduced && {
                        transitionProperty: "opacity",
                        transitionDuration: 120,
                        transitionTimingFunction: highlightEasing,
                      },
                    ]}
                  />
                  <Icon
                    size={22}
                    color={
                      active || pressed ? palette.primary : palette.mutedLabel
                    }
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
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
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  iconSlot: {
    width: 48,
    maxWidth: "100%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  highlight: {
    ...StyleSheet.absoluteFill,
    borderRadius: 15,
  },
});
