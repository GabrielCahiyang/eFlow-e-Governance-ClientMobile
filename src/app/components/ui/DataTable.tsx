import { Text } from "./Typography";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { ScrollView, View } from "./Primitives";
import { colors } from "./theme";
export interface Column<T> {
  id: string;
  title: string;
  width: number;
  render: (row: T) => ReactNode;
}
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty = "No records",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  empty?: string;
}) {
  return (
    <ScrollView horizontal contentContainerStyle={{ minWidth: "100%" }}>
      <View style={s.table}>
        <View style={s.header}>
          {columns.map((c) => (
            <View key={c.id} style={[s.cell, { width: c.width }]}>
              <Text style={s.heading}>{c.title}</Text>
            </View>
          ))}
        </View>
        {rows.length ? (
          rows.map((row) => (
            <View key={rowKey(row)} style={s.row}>
              {columns.map((c) => (
                <View key={c.id} style={[s.cell, { width: c.width }]}>
                  {c.render(row)}
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={{ padding: 20, color: colors.muted }}>{empty}</Text>
        )}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  header: { flexDirection: "row", backgroundColor: colors.background },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cell: {
    padding: 12,
    minHeight: 48,
    justifyContent: "center",
    gap: 5,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  heading: { fontSize: 12, fontWeight: "600", color: colors.muted },
});
