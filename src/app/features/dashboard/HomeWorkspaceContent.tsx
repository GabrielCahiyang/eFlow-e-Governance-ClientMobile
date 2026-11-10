import { Pressable, View } from "react-native";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Grid from "lucide-react-native/icons/layout-grid";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { Screen, ErrorState } from "../../components/ui";
import { GlassCard } from "../../components/ui/GlassCard";
import { HomeAttentionCard, type HomeAttention } from "./HomeAttentionCard";
import type { Navigate } from "../../shared/routes";
import { FavoritesCard } from "./FavoritesCard";

export function HomeWorkspaceContent({
  attention,
  attentionLoading,
  navigate,
  loading,
  pinned,
  error,
  onRefresh,
  onWorkspaces,
  onFavorites,
  onOpenWorkspace,
}: {
  attention: HomeAttention;
  attentionLoading: boolean;
  navigate: Navigate;
  loading: boolean;
  pinned: { id: string; name: string }[];
  error?: Error;
  onRefresh: () => Promise<unknown>;
  onWorkspaces: () => void;
  onFavorites: () => void;
  onOpenWorkspace: (id: string) => void;
}) {
  const palette = useTheme();
  return (
    <Screen compact onRefresh={onRefresh} style={{ gap: 18 }}>
      <FavoritesCard
        pinned={pinned}
        loading={loading}
        onFavorites={onFavorites}
        onOpenWorkspace={onOpenWorkspace}
      />
      <HomeAttentionCard
        attention={attention}
        loading={attentionLoading}
        navigate={navigate}
      />
      <GlassCard testID="workspaces-card" style={{ padding: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse workspaces"
          onPress={onWorkspaces}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            minHeight: 72,
            padding: 16,
            gap: 14,
            borderRadius: 22,
            backgroundColor: pressed ? palette.primarySoft : "transparent",
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: palette.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Grid size={21} color={palette.primary} />
          </View>
          <Text
            style={{
              flex: 1,
              color: palette.text,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Workspaces
          </Text>
          <ArrowRight size={18} color={palette.text} />
        </Pressable>
      </GlassCard>
      {!!error && <ErrorState error={error} retry={() => void onRefresh()} />}
    </Screen>
  );
}
