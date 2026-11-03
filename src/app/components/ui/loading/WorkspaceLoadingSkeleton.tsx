import { StyleSheet, useWindowDimensions } from "react-native";
import { View } from "../Primitives";
import { SkeletonBlock, SkeletonPulse } from "./Skeleton";

export function WorkspaceLoadingSkeleton({
  label = "Loading workspace…",
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  const { width } = useWindowDimensions();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={s.root}
    >
      <SkeletonPulse style={{ gap: 16 }}>
        <View style={s.header}>
          <View style={{ flex: 1, minWidth: 160, gap: 8 }}>
            <SkeletonBlock
              style={{ height: 16, width: 220, maxWidth: "90%" }}
            />
            <SkeletonBlock
              style={{ height: 12, width: 320, maxWidth: "100%" }}
            />
          </View>
          <SkeletonBlock style={{ height: 34, width: 140 }} />
        </View>
        <View style={[s.cards, width < 640 && { flexDirection: "column" }]}>
          {[0, 1, 2].map((index) => (
            <SkeletonBlock
              key={index}
              style={{ height: 70, flex: width >= 640 ? 1 : undefined }}
            />
          ))}
        </View>
        <View style={{ gap: 8 }}>
          {Array.from({ length: Math.max(0, rows) }, (_, index) => (
            <SkeletonBlock key={index} style={{ height: 48 }} />
          ))}
        </View>
      </SkeletonPulse>
    </View>
  );
}
export function WorkspaceSkeleton({
  label = "Loading workspace…",
  rows = 5,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ padding: 24 }}
    >
      <SkeletonPulse duration={1500} minimum={0.5}>
        <SkeletonBlock
          style={{
            height: 24,
            width: "35%",
            marginBottom: 20,
            borderRadius: 5,
          }}
        />
        {Array.from({ length: Math.max(0, rows) }, (_, index) => (
          <SkeletonBlock
            key={index}
            style={{ height: 40, marginTop: 8, borderRadius: 5 }}
          />
        ))}
      </SkeletonPulse>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cards: { flexDirection: "row", gap: 12 },
});
