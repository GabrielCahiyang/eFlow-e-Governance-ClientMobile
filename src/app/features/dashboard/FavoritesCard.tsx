import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Plus from "lucide-react-native/icons/plus";
import Grid from "lucide-react-native/icons/layout-grid";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { SkeletonBlock } from "../../components/ui/loading/Skeleton";
import { useMotionPreferences } from "../../shared/motion";

export function FavoritesCard({
  pinned,
  loading,
  onFavorites,
  onOpenWorkspace,
}: {
  pinned: { id: string; name: string }[];
  loading: boolean;
  onFavorites: () => void;
  onOpenWorkspace: (id: string) => void;
}) {
  const palette = useTheme(),
    { reduced } = useMotionPreferences(),
    window = useWindowDimensions();
  const [width, setWidth] = useState(Math.max(240, window.width - 32)),
    [page, setPage] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const gap = 14,
    tileWidth = Math.min(280, width * 0.66),
    step = tileWidth + gap,
    count = pinned.length + 1;
  const current = Math.min(page, count - 1),
    firstDot = Math.max(0, Math.min(current - 2, count - 5));
  useEffect(() => {
    if (page >= count) setPage(count - 1);
    scroll.current?.scrollTo({ x: current * step, animated: false });
  }, [count, step]);
  return (
    <LinearGradient
      colors={[palette.heroStart, palette.heroMiddle, palette.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 28,
        paddingVertical: 12,
        gap: 8,
        overflow: "hidden",
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View
        style={{
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ flex: 1, fontSize: 19, fontWeight: "700", color: "#ffffff" }}
        >
          My favorites
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open favorite workspaces"
          onPress={onFavorites}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed
              ? "rgba(255,255,255,0.26)"
              : "rgba(255,255,255,0.16)",
          })}
        >
          <ArrowRight size={21} color="#ffffff" />
        </Pressable>
      </View>
      <View style={{ minHeight: 120 }}>
        {count === 1 && !loading && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              top: 14,
              left: 0,
              right: 0,
              bottom: 14,
            }}
          >
            <View
              style={{
                position: "absolute",
                left: -28,
                width: width * 0.23,
                top: 0,
                bottom: 0,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.12)",
                transform: [{ rotate: "-6deg" }],
              }}
            />
            <View
              style={{
                position: "absolute",
                right: -28,
                width: width * 0.23,
                top: 0,
                bottom: 0,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.12)",
                transform: [{ rotate: "6deg" }],
              }}
            />
          </View>
        )}
        {loading && !pinned.length ? (
          <View style={{ alignSelf: "center", width: tileWidth }}>
            <SkeletonBlock style={{ height: 120, borderRadius: 24 }} />
          </View>
        ) : (
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={{
              paddingHorizontal: (width - tileWidth) / 2,
              gap,
            }}
            onMomentumScrollEnd={(event) =>
              setPage(
                Math.max(
                  0,
                  Math.min(
                    count - 1,
                    Math.round(event.nativeEvent.contentOffset.x / step),
                  ),
                ),
              )
            }
          >
            {pinned.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Open favorite workspace ${item.name}`}
                onPress={() => onOpenWorkspace(item.id)}
                style={({ pressed }) => ({
                  width: tileWidth,
                  minHeight: 120,
                  padding: 18,
                  borderRadius: 24,
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.28)"
                    : "rgba(255,255,255,0.18)",
                })}
              >
                <Grid size={27} color="#ffffff" />
                <Text
                  style={{
                    textAlign: "center",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add favorite workspaces"
              onPress={onFavorites}
              style={({ pressed }) => ({
                width: tileWidth,
                minHeight: 120,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.28)"
                  : "rgba(255,255,255,0.18)",
              })}
            >
              <Plus size={34} color="#ffffff" />
            </Pressable>
          </ScrollView>
        )}
      </View>
      {!loading && (
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 2 }}
        >
          {Array.from(
            { length: Math.min(5, count) },
            (_, i) => firstDot + i,
          ).map((index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Favorite page ${index + 1} of ${count}`}
              accessibilityState={{ selected: index === current }}
              onPress={() => {
                setPage(index);
                scroll.current?.scrollTo({
                  x: index * step,
                  animated: !reduced,
                });
              }}
              style={{
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: index === current ? 8 : 6,
                  height: index === current ? 8 : 6,
                  borderRadius: 5,
                  backgroundColor:
                    index === current ? "#ffffff" : "rgba(255,255,255,0.38)",
                }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}
