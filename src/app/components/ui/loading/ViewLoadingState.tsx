import { Text } from "../Typography";
import { StyleSheet, useWindowDimensions } from "react-native";
import { View } from "../Primitives";
import { EFlowMark } from "../../brand/EFlowMark";
import { SkeletonBlock, SkeletonPulse } from "./Skeleton";

export function ViewLoadingState({
  label = "Getting things done",
}: {
  label?: string;
}) {
  const { width } = useWindowDimensions();
  const small = width <= 640;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={s.root}
    >
      <View
        style={[
          s.brand,
          small && {
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 12,
          },
        ]}
      >
        <EFlowMark height={28} state="submitting" />
        <Text style={s.label}>{label}</Text>
      </View>
      <SkeletonPulse>
        <SkeletonBlock style={s.title} />
        <SkeletonBlock style={s.subtitle} />
        <View style={[s.cards, small && { gap: 10 }]}>
          {[0, 1, 2, 3].map((index) => (
            <SkeletonBlock
              key={index}
              style={[s.card, { width: small ? "48%" : "23%" }]}
            />
          ))}
        </View>
        <View style={s.panel}>
          {[0, 1, 2, 3].map((index) => (
            <SkeletonBlock key={index} style={s.row} />
          ))}
        </View>
      </SkeletonPulse>
    </View>
  );
}
const s = StyleSheet.create({
  root: { width: "100%", minHeight: 360, padding: 24 },
  brand: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 30,
  },
  label: { fontSize: 13, color: "#526161" },
  title: { height: 26, width: "42%", maxWidth: 300, marginBottom: 12 },
  subtitle: { height: 12, width: "64%", maxWidth: 450 },
  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    marginVertical: 28,
  },
  card: { height: 105 },
  panel: {
    backgroundColor: "#e9eeee",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  row: {
    height: 36,
    marginVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#d7dfdf",
    backgroundColor: "#e9eeee",
  },
});
