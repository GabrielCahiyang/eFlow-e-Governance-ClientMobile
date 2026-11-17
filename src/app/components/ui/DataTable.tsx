import { Text } from "./Typography";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { ScrollView, View } from "./Primitives";
import { useAppearance, useTheme } from "./Appearance";
import type { EmptyKind } from "./EmptyIllustration";
import { Empty } from "./Screen";

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
  emptyKind = "empty",
  hint,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  empty?: string;
  emptyKind?: EmptyKind;
  hint?: string;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const headerSurface = isDark ? "#0f1733" : palette.background;

  return (
    <View
      style={[
        s.table,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {!!hint && rows.length > 0 && (
        <View
          style={[
            s.hintBar,
            {
              backgroundColor: headerSurface,
              borderBottomColor: palette.border,
            },
          ]}
        >
          <Text style={[s.hintText, { color: palette.mutedLabel }]}>{hint}</Text>
        </View>
      )}
      <ScrollView horizontal contentContainerStyle={{ minWidth: "100%" }}>
        <View style={{ minWidth: "100%" }}>
          <View style={[s.header, { backgroundColor: headerSurface }]}>
            {columns.map((c, idx) => (
              <View
                key={c.id}
                style={[
                  s.cell,
                  {
                    width: c.width,
                    borderRightWidth:
                      idx < columns.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderRightColor: palette.border,
                  },
                ]}
              >
                <Text style={[s.heading, { color: palette.mutedLabel }]}>
                  {c.title}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row) => (
            <View
              key={rowKey(row)}
              style={[s.row, { borderTopColor: palette.border }]}
            >
              {columns.map((c, idx) => (
                <View
                  key={c.id}
                  style={[
                    s.cell,
                    {
                      width: c.width,
                      borderRightWidth:
                        idx < columns.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderRightColor: palette.border,
                    },
                  ]}
                >
                  {c.render(row)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {!rows.length && (
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
            paddingVertical: 8,
          }}
        >
          <Empty compact kind={emptyKind} title={empty} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  hintBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hintText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  header: {
    flexDirection: "row",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 48,
    justifyContent: "center",
    gap: 5,
  },
  heading: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
