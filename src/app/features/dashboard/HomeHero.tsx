import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { NavigationContext } from "@react-navigation/native";
import { createContext, useContext, useEffect, useState } from "react";
import FolderKanban from "lucide-react-native/icons/folder-kanban";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import Clock from "lucide-react-native/icons/clock";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useScrollOffset } from "../../components/ui/FolderRefresh";
import { useMotionPreferences } from "../../shared/motion";
import { HomeHeader } from "./HomeGreeting";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import type { Navigate } from "../../shared/routes";

// Screen pads its content by 16 (10 on top when compact); the hero and the
// body cancel that so the colours run edge to edge.
const edge = 16;
// Distance over which the hero fades as the white section covers it.
const collapseDistance = 260;

/**
 * Focus state without requiring a NavigationContainer (Home is also rendered
 * in isolation by tests and previews). Falls back to "focused" when there is
 * no navigator, so the hero still uses light status-bar content.
 */
const NoNavigationContext = createContext<undefined>(undefined);

function useScreenFocused() {
  // Tests can mock @react-navigation/native without NavigationContext.
  const navigation = useContext(NavigationContext ?? NoNavigationContext);
  const [focused, setFocused] = useState(!navigation || navigation.isFocused());
  useEffect(() => {
    if (!navigation) {
      setFocused(true);
      return;
    }
    setFocused(navigation.isFocused());
    const unsubscribeBlur = navigation.addListener("blur", () => setFocused(false));
    const unsubscribeFocus = navigation.addListener("focus", () =>
      setFocused(true),
    );
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [navigation]);
  return focused;
}

export type HeroAction = {
  key: string;
  label: string;
  Icon: typeof FolderKanban;
  onPress: () => void;
};

/**
 * eFlow-blue gradient top half of Home. While scrolling, its content drifts
 * up at half speed and fades so the white section slides over and takes over.
 */
export function HomeHero({
  navigate,
  subtitle,
  actions = [],
  children,
}: {
  navigate: Navigate;
  subtitle?: string;
  actions?: HeroAction[];
  children?: ReactNode;
}) {
  const palette = useTheme(),
    focused = useScreenFocused(),
    scrollY = useScrollOffset(),
    { reduced } = useMotionPreferences();
  const collapse = useAnimatedStyle(() => {
    const y = scrollY ? scrollY.get() : 0;
    return {
      opacity: interpolate(y, [0, collapseDistance], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: reduced ? 0 : y * 0.5 }],
    };
  });
  return (
    <View
      style={{
        marginHorizontal: -edge,
        marginTop: -10,
        paddingHorizontal: edge,
        paddingBottom: 44,
        backgroundColor: palette.heroMiddle,
        overflow: "hidden",
      }}
    >
      {focused && <StatusBar style="light" />}
      <LinearGradient
        pointerEvents="none"
        // Vertical: darkest behind the status bar and greeting, lighter
        // toward the white section.
        colors={[palette.heroStart, palette.heroMiddle, palette.heroEnd]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <HeroRings />
      <Animated.View style={collapse}>
        <HomeHeader navigate={navigate} onDark subtitle={subtitle} />
        {children}
        {actions.length > 0 && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {actions.map(({ key, label, Icon, onPress }) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={onPress}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 48,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.22)",
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.12)",
                })}
              >
                <Icon size={18} color="#ffffff" />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: "#ffffff", fontSize: 14, fontWeight: "700" }}
                >
                  {label}
                </Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.8)" />
              </Pressable>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Faint rings echoing the round "o" of the eFlow mark, placed partly off the
 * edges so they read as texture behind the content.
 */
function HeroRings() {
  const rings: [cx: number, cy: number, r: number, stroke: number, opacity: number][] = [
    [360, 30, 92, 22, 0.07],
    [360, 30, 46, 10, 0.06],
    [-10, 250, 70, 16, 0.06],
    [250, 300, 34, 8, 0.05],
  ];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 390 320" preserveAspectRatio="xMidYMid slice">
        {rings.map(([cx, cy, r, stroke, opacity]) => (
          <Circle
            key={`${cx}:${cy}:${r}`}
            cx={cx}
            cy={cy}
            r={r}
            stroke="#ffffff"
            strokeWidth={stroke}
            strokeOpacity={opacity}
            fill="none"
          />
        ))}
        <Circle cx={300} cy={150} r={4} fill="#ffffff" fillOpacity={0.12} />
        <Circle cx={80} cy={60} r={3} fill="#ffffff" fillOpacity={0.1} />
      </Svg>
    </View>
  );
}

/** White rounded section that slides over the bottom of the hero. */
export function HomeBody({
  children,
  gap = 12,
}: {
  children: ReactNode;
  gap?: number;
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        zIndex: 1,
        marginHorizontal: -edge,
        marginTop: -24,
        marginBottom: -24,
        paddingHorizontal: edge,
        paddingTop: 20,
        paddingBottom: 32,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        backgroundColor: palette.surface,
        gap,
      }}
    >
      {children}
    </View>
  );
}

type Stat = {
  key:
    | "projects"
    | "decisions"
    | "risk"
    | "overdue"
    | "today"
    | "awaiting";
  label: string;
  value: number;
  onPress?: () => void;
  accessibilityLabel: string;
};

const statIcons = {
  projects: FolderKanban,
  decisions: ClipboardCheck,
  risk: TriangleAlert,
  overdue: TriangleAlert,
  today: Clock,
  awaiting: ClipboardCheck,
};

/** The three numbers a Head checks first, on the hero. */
export function HomeHeroStats({ stats }: { stats: Stat[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
      {stats.map((stat) => {
        const Icon = statIcons[stat.key];
        return (
          <Pressable
            key={stat.key}
            accessibilityRole={stat.onPress ? "button" : undefined}
            accessibilityLabel={stat.accessibilityLabel}
            disabled={!stat.onPress}
            onPress={stat.onPress}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 120,
              padding: 12,
              gap: 4,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
              backgroundColor: pressed
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.12)",
            })}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                marginBottom: 4,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Icon size={20} color="#ffffff" />
            </View>
            <Text
              style={{ color: "#ffffff", fontSize: 26, lineHeight: 30, fontWeight: "800" }}
            >
              {stat.value}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 12,
                lineHeight: 15,
                fontWeight: "600",
              }}
            >
              {stat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
