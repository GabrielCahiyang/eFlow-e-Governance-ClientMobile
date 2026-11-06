import { Pressable, View } from "react-native";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Building from "lucide-react-native/icons/building-complex";
import FolderKanban from "lucide-react-native/icons/folder-kanban";
import { GlassCard } from "../../components/ui/GlassCard";
import { Loading } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";

export function RecentProjectsCard({
  workspaceName,
  projects,
  loading,
  onBrowse,
  onWorkspace,
  onProject,
}: {
  workspaceName?: string;
  projects: { id: string; title: string; status: string }[];
  loading?: boolean;
  onBrowse: () => void;
  onWorkspace: () => void;
  onProject: (id: string) => void;
}) {
  const palette = useTheme();
  return (
    <GlassCard
      testID="recent-projects-card"
      borderRadius={28}
      style={{ padding: 18, gap: 4 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "700",
            color: palette.text,
          }}
        >
          Recently visited
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all projects"
          onPress={onBrowse}
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
      {loading ? (
        <Loading label="Loading workspace projects" layout="recent" rows={2} />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Workspace: ${workspaceName || "Active workspace"}`}
            onPress={onWorkspace}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: pressed ? palette.primarySoft : "transparent",
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.primarySoft,
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              <Building size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: palette.text }}
              >
                {workspaceName || "Choose a workspace"}
              </Text>
              <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
                {workspaceName
                  ? "Active workspace"
                  : "Browse your available workspaces"}
              </Text>
            </View>
          </Pressable>
          {projects.map((project) => (
            <View key={project.id}>
              <View style={{ height: 0.5, backgroundColor: palette.border }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Project: ${project.title}`}
                onPress={() => onProject(project.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: pressed
                    ? palette.primarySoft
                    : "transparent",
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.blueSoft,
                    borderWidth: 1,
                    borderColor: palette.border,
                  }}
                >
                  <FolderKanban size={20} color={palette.blue} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: palette.text,
                    }}
                    numberOfLines={2}
                  >
                    {project.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
                    {project.status.replaceAll("_", " ")}
                  </Text>
                </View>
                <ArrowRight size={16} color={palette.mutedLabel} />
              </Pressable>
            </View>
          ))}
        </>
      )}
    </GlassCard>
  );
}
