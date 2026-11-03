import {StyleSheet} from "react-native";
import {Pressable,ScrollView,View} from '../../components/ui/Primitives';
import Star from "lucide-react-native/icons/star";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Folder from "lucide-react-native/icons/folder";
import { Choice, colors } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import type { AppRoute, Navigate } from "../../shared/routes";
import type {
  Workspace,
  WorkspaceProject,
} from "../../../core/web/app/features/workspaces/types";
import {
  useNavigationFavorites,
  useNavigationDisclosure,
} from "../../../core/web/app/shared/navigationPreferences";
import {
  nativeDestinations,
  nativeImplementedSections,
} from "./nativeNavigation";
import { NativeDestinationIcon } from "./NativeDestinationIcon";
import { sidebarProjectGroups } from "./sidebarProjects";
import { isMobileRole } from "../../shared/mobileRoles";
export function NativeSidebar({
  actorId,
  role,
  can,
  leading,
  current,
  navigate,
  workspaceId,
  workspaces,
  projects,
  loaded,
  selectWorkspace,
}: {
  actorId: string;
  role: string;
  can: (key: string) => boolean;
  leading: boolean;
  current: AppRoute;
  navigate: Navigate;
  workspaceId: string;
  workspaces: Workspace[];
  projects: WorkspaceProject[];
  loaded: boolean;
  selectWorkspace: (id: string) => void;
}) {
  const preferences = useNavigationFavorites(
      actorId,
      workspaceId,
      projects.map((project) => project.id),
      loaded,
    ),
    disclosures = useNavigationDisclosure(actorId, workspaceId),
    groups = sidebarProjectGroups(projects, preferences.favorites);
  const destinations = nativeDestinations(role, can, leading).filter(
    (item) => nativeImplementedSections.has(item.id) && item.id !== "projects",
  );
  const sections = [...new Set(destinations.map((item) => item.group))];
  const row = (project: WorkspaceProject) => (
    <View key={project.id} style={s.projectRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${project.title}`}
        onPress={() =>
          navigate({
            name: project.kind === "personal" ? "personal_project" : "project",
            id: project.id,
          })
        }
        style={[s.projectLink, current.id === project.id && s.selected]}
      >
        <Folder
          size={18}
          color={current.id === project.id ? colors.primary : colors.muted}
        />
        <Text
          numberOfLines={2}
          style={[
            s.label,
            current.id === project.id && { color: colors.primary },
          ]}
        >
          {project.title}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${preferences.favorites.has(project.id) ? "Remove" : "Add"} ${project.title} ${preferences.favorites.has(project.id) ? "from" : "to"} favorites`}
        onPress={() => preferences.toggle(project.id)}
        style={s.star}
      >
        <Star
          size={17}
          color={
            preferences.favorites.has(project.id)
              ? colors.primary
              : colors.muted
          }
          fill={
            preferences.favorites.has(project.id)
              ? colors.primary
              : "transparent"
          }
        />
      </Pressable>
    </View>
  );
  if (!isMobileRole(role)) return null;
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        {!!(role !== "admin") && (
          <Choice
            label="Workspace"
            value={workspaceId}
            onChange={selectWorkspace}
            options={workspaces.map((workspace) => ({
              value: workspace.id,
              label: workspace.name,
            }))}
          />
        )}
        {sections.map((group) => (
          <View key={group} style={s.group}>
            <Text style={s.heading}>{group}</Text>
            {destinations
              .filter((item) => item.group === group)
              .map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: current.name === item.id }}
                  onPress={() => navigate({ name: item.id })}
                  style={[s.link, current.name === item.id && s.selected]}
                >
                  <NativeDestinationIcon
                    name={item.id}
                    color={
                      current.name === item.id ? colors.primary : colors.muted
                    }
                  />
                  <Text
                    style={[
                      s.label,
                      current.name === item.id && { color: colors.primary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
          </View>
        ))}
        {!!(role !== "admin" && can("navigation.projects")) &&
          (
            [
              ["favorites", "Favorites"],
              ["projects", "Projects"],
              ["archived", "Archived projects"],
            ] as const
          ).map(([id, title]) => (
            <View key={id} style={s.group}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${disclosures.isOpen(id) ? "Collapse" : "Expand"} ${title}`}
                accessibilityState={{ expanded: disclosures.isOpen(id) }}
                onPress={() => disclosures.setOpen(id, !disclosures.isOpen(id))}
                style={s.link}
              >
                {disclosures.isOpen(id) ? (
                  <ChevronDown size={17} color={colors.text} />
                ) : (
                  <ChevronRight size={17} color={colors.text} />
                )}
                <Text style={s.section}>{title}</Text>
              </Pressable>
              {!!disclosures.isOpen(id) && (
                <>
                  {!!(id === "projects") && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => navigate({ name: "projects" })}
                      style={s.link}
                    >
                      <Folder size={18} color={colors.muted} />
                      <Text style={s.label}>All projects</Text>
                    </Pressable>
                  )}
                  {groups[id].length ? (
                    groups[id].map(row)
                  ) : (
                    <Text style={s.empty}>
                      {id === "favorites"
                        ? "Star a project for quick access."
                        : id === "archived"
                          ? "No archived projects."
                          : "No other projects."}
                    </Text>
                  )}
                </>
              )}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    width: 280,
    borderRightWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: { padding: 12, gap: 14 },
  group: {
    gap: 4,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
  },
  heading: {
    color: colors.muted,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  section: { color: colors.text, fontSize: 13, fontWeight: "600" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 7,
    minHeight: 44,
  },
  label: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  selected: { backgroundColor: colors.primarySoft },
  projectRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  projectLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 7,
    padding: 10,
    minHeight: 44,
  },
  star: { padding: 8 },
  empty: { padding: 10, color: colors.muted, fontSize: 12, lineHeight: 20 },
});
