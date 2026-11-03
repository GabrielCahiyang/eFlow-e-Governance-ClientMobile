import { Text } from "./Typography";
import { StyleSheet } from "react-native";
import { Pressable, ScrollView } from "./Primitives";
import { colors } from "./theme";
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      style={{ flexGrow: 0, flexShrink: 0 }}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.tabs}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          aria-selected={item.id === value}
          accessibilityState={{ selected: item.id === value }}
          onPress={() => onChange(item.id)}
          style={[s.tab, value === item.id && s.selected]}
        >
          <Text style={[s.text, value === item.id && s.active]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  tabs: { gap: 8, paddingBottom: 4, alignItems: "center" },
  tab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  text: { fontSize: 13, color: colors.muted },
  active: { color: colors.primary, fontWeight: "600" },
});
