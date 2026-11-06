import { Pressable, View } from "react-native";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Grid from "lucide-react-native/icons/layout-grid";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { Screen, ErrorState } from "../../components/ui";
import { RecentProjectsCard } from "./RecentProjectsCard";
import { FavoritesCard } from "./FavoritesCard";

export function HomeWorkspaceContent({
  workspaceName,
  projects,
  loading,
  pinned,
  error,
  onRefresh,
  onWorkspaces,
  onFavorites,
  onOpenWorkspace,
  onProject,
  onProjects,
}: {
  workspaceName?: string;
  projects: { id: string; title: string; status: string }[];
  loading: boolean;
  pinned: { id: string; name: string }[];
  error?: Error;
  onRefresh: () => Promise<unknown>;
  onWorkspaces: () => void;
  onFavorites: () => void;
  onOpenWorkspace: (id: string) => void;
  onProject: (id: string) => void;
  onProjects: () => void;
}) {
  const palette = useTheme();
  return (
    <Screen
      compact
      onRefresh={onRefresh}
      style={{ gap: 18 }}
    >
      <FavoritesCard
        pinned={pinned}
        loading={loading}
        onFavorites={onFavorites}
        onOpenWorkspace={onOpenWorkspace}
      />
      <RecentProjectsCard
        workspaceName={workspaceName}
        projects={projects}
        loading={loading}
        onBrowse={onProjects}
        onWorkspace={onWorkspaces}
        onProject={onProject}
      />
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
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: pressed ? palette.primarySoft : palette.surface,
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
      {!!error && <ErrorState error={error} retry={() => void onRefresh()} />}
    </Screen>
  );
}
