import { Pressable, View } from "react-native";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import { GlassCard } from "../../components/ui/GlassCard";
import { Loading } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { NavigationRow } from "../../components/ui/NavigationRow";
import type { AppRoute, Navigate } from "../../shared/routes";

export type HomeAttention = {
  title: string;
  empty: string;
  error?: string;
  browseLabel: string;
  browse: AppRoute;
  rows: { key: string; title: string; description: string; route: AppRoute }[];
};

export function HomeAttentionCard({
  attention,
  loading,
  navigate,
}: {
  attention: HomeAttention;
  loading: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  return (
    <GlassCard
      testID="home-attention-card"
      borderRadius={28}
      style={{ padding: 18, gap: 4 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          accessibilityRole="header"
          style={{ flex: 1, fontSize: 18, fontWeight: "700" }}
        >
          {attention.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={attention.browseLabel}
          onPress={() => navigate(attention.browse)}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? palette.primarySoft : "transparent",
          })}
        >
          <ArrowRight size={18} color={palette.text} />
        </Pressable>
      </View>
      {loading && !attention.rows.length ? (
        <Loading
          label={`Loading ${attention.title.toLowerCase()}`}
          layout="recent"
          rows={2}
        />
      ) : !attention.rows.length && !attention.error ? (
        <Text style={{ color: palette.mutedLabel }}>{attention.empty}</Text>
      ) : null}
      {attention.rows.map((row) => (
        <NavigationRow
          key={row.key}
          title={row.title}
          description={row.description}
          accessibilityHint={row.description}
          onPress={() => navigate(row.route)}
        />
      ))}
      {!!attention.error && (
        <Text style={{ color: palette.mutedLabel }}>{attention.error}</Text>
      )}
    </GlassCard>
  );
}
