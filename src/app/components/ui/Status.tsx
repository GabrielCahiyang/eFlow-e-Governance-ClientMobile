import { Text } from "./Typography";
import { StyleSheet } from "react-native";
import { View } from "./Primitives";
import { colors, words } from "./theme";
export function Status({ value }: { value: string }) {
  const green = /completed|approved|active|settled|joined|accepted|locked/.test(
      value,
    ),
    red = /rejected|cancelled|overdue|denied/.test(value);
  return (
    <View
      style={[
        s.pill,
        {
          backgroundColor: red
            ? colors.dangerSoft
            : green
              ? colors.successSoft
              : colors.primarySoft,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          color: red ? colors.danger : green ? colors.success : colors.primary,
          fontWeight: "500",
        }}
      >
        {words(value)}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
});
