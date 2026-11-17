import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "./Primitives";
import { Text } from "./Typography";
import { useAppearance, useTheme } from "./Appearance";
import { withOpacity } from "./theme";

export type MetricTone = "neutral" | "success" | "warning" | "info" | "danger";

export interface MetricItem {
  key?: string;
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: MetricTone;
  accessibilityLabel?: string;
}

const TONE_TILE_DARK_NEUTRAL = "#1a274d";

/** Frosted-glass headline KPI tiles rendered 2-up (or stacked under large text). */
export function MetricPair({
  items,
  stackAt = 1.35,
}: {
  items: MetricItem[];
  stackAt?: number;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > stackAt || width < 340;

  if (!items.length) return null;

  const rows: MetricItem[][] = [];
  if (stacked) {
    for (const item of items) rows.push([item]);
  } else {
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }
  }

  return (
    <View style={s.grid}>
      {rows.map((row, rowIndex) => (
        <View
          key={row.map((it, idx) => it.key ?? `${rowIndex}-${idx}-${it.label}`).join("|")}
          style={[s.row, stacked && s.rowStacked]}
        >
          {row.map((item, idx) => {
            const tone = item.tone ?? "neutral";
            const accent =
              tone === "success"
                ? palette.success
                : tone === "warning"
                  ? palette.warning
                  : tone === "info"
                    ? palette.blue
                    : tone === "danger"
                      ? palette.danger
                      : palette.primary;

            const surfaceColor =
              tone === "success"
                ? palette.successSoft
                : tone === "warning"
                  ? palette.warningSoft
                  : tone === "info"
                    ? palette.blueSoft
                    : tone === "danger"
                      ? palette.dangerSoft
                      : isDark
                        ? TONE_TILE_DARK_NEUTRAL
                        : palette.glassSurface;

            const labelColor = tone === "neutral" ? palette.mutedLabel : accent;
            const valueColor =
              tone === "success" || tone === "danger" ? accent : palette.text;

            const gradientTop = isDark
              ? withOpacity(palette.primary, 0.1)
              : palette.glassTop;

            const gradientBottom = isDark
              ? "rgba(10,16,40,0.22)"
              : tone === "success"
                ? withOpacity(palette.successSoft, 0.78)
                : tone === "warning"
                  ? withOpacity(palette.warningSoft, 0.78)
                  : tone === "info"
                    ? withOpacity(palette.blueSoft, 0.78)
                    : tone === "danger"
                      ? withOpacity(palette.dangerSoft, 0.78)
                      : palette.glassBottom;

            const borderColor = isDark ? palette.border : palette.glassEdge;
            const badgeBg = isDark ? withOpacity(accent, 0.18) : "#ffffff";
            const badgeBorder = withOpacity(accent, isDark ? 0.3 : 0.18);

            return (
              <View
                key={item.key ?? `${item.label}-${idx}`}
                accessible={Boolean(item.accessibilityLabel)}
                accessibilityLabel={item.accessibilityLabel}
                style={[
                  s.tile,
                  !stacked && s.tileFlex,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                  !isDark && s.tileShadowLight,
                ]}
              >
                <LinearGradient
                  colors={[gradientTop, gradientBottom]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                />
                {!!item.icon && (
                  <View
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      s.iconChip,
                      {
                        backgroundColor: badgeBg,
                        borderColor: badgeBorder,
                      },
                      !isDark && s.iconChipShadowLight,
                    ]}
                  >
                    {item.icon}
                  </View>
                )}
                <View style={s.copy}>
                  <Text style={[s.label, { color: labelColor }]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      s.value,
                      { color: valueColor },
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Compact progress bar paired with label + percentage/amount summary. */
export function AllocationBar({
  label,
  summary,
  percent,
  tone = "neutral",
}: {
  label: string;
  summary: string;
  percent: number;
  tone?: MetricTone;
}) {
  const palette = useTheme();
  const clamped = Math.max(
    0,
    Math.min(100, Number.isFinite(percent) ? percent : 0),
  );

  const trackColor =
    tone === "success"
      ? palette.successSoft
      : tone === "warning"
        ? palette.warningSoft
        : tone === "info"
          ? palette.blueSoft
          : tone === "danger"
            ? palette.dangerSoft
            : palette.primarySoft;

  const fillColor =
    tone === "success"
      ? palette.success
      : tone === "warning"
        ? palette.warning
        : tone === "info"
          ? palette.blue
          : tone === "danger"
            ? palette.danger
            : palette.primary;

  return (
    <View style={s.barWrap}>
      <View style={s.barHeader}>
        <Text style={[s.barLabel, { color: palette.mutedLabel }]}>{label}</Text>
        <Text style={[s.barSummary, { color: palette.text }]}>{summary}</Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
        style={[s.barTrack, { backgroundColor: trackColor }]}
      >
        <View
          style={[
            s.barFill,
            {
              width: `${clamped}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  rowStacked: {
    flexDirection: "column",
  },
  tile: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: "space-between",
    gap: 12,
    overflow: "hidden",
  },
  tileFlex: {
    flex: 1,
    minWidth: 0,
  },
  tileShadowLight: {
    shadowColor: "#00004f",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  iconChipShadowLight: {
    shadowColor: "#00004f",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  copy: {
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  barWrap: {
    gap: 6,
    paddingHorizontal: 2,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    flexShrink: 1,
  },
  barSummary: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
});
