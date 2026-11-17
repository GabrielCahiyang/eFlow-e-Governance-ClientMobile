import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { HomeCard } from "./HomeSections";

/**
 * "Needs your decision" on Home. Decisions are a single vertical list so the
 * first one is always the most obvious next action; the Office, project and
 * risk numbers live in the hero. `children` shows when there are no decision
 * cards (loading, empty or error states).
 */
export function HeadTodayCard({
  attentionCount,
  decisions = [],
  children,
}: {
  attentionCount: number;
  decisions?: ReactNode[];
  children?: ReactNode;
}) {
  const palette = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 18, fontWeight: "800", color: palette.text }}
        >
          Needs your decision
        </Text>
        {attentionCount > 0 && (
          <View
            style={{
              minWidth: 24,
              height: 24,
              borderRadius: 12,
              paddingHorizontal: 7,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.dangerSoft,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "800", color: palette.danger }}>
              {attentionCount}
            </Text>
          </View>
        )}
      </View>
      {decisions.length > 0 ? (
        <HomeCard>{decisions}</HomeCard>
      ) : (
        <HomeCard>
          <View style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {children}
          </View>
        </HomeCard>
      )}
    </View>
  );
}
