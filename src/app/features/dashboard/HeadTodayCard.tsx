import type { ReactNode } from "react";
import { View } from "react-native";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import { useTheme } from "../../components/ui/Appearance";
import { HomeCard, HomeSection } from "./HomeSections";

/**
 * "Needs your decision" on Home. Decisions are a single vertical list inside a
 * Card v2 container so the first one is always the most obvious next action.
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
    <HomeSection
      title="Needs your decision"
      tone={attentionCount > 0 ? "danger" : "primary"}
      badge={attentionCount > 0 ? attentionCount : undefined}
      icon={
        <AlertCircle
          size={15}
          color={attentionCount > 0 ? palette.danger : palette.primary}
        />
      }
    >
      {decisions.length > 0 ? (
        <HomeCard>{decisions}</HomeCard>
      ) : (
        <HomeCard>
          <View style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {children}
          </View>
        </HomeCard>
      )}
    </HomeSection>
  );
}
