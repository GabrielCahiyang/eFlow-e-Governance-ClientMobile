import { FilterChip } from "../../components/ui/FilterChip";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useTheme } from "../../components/ui/Appearance";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useState } from "react";
import { SectionList, Pressable, View } from "react-native";
import Folder from "lucide-react-native/icons/folder";
import Star from "lucide-react-native/icons/star";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { usePullRefresh } from "../../shared/usePullRefresh";
import type { Navigate } from "../../shared/routes";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  SearchField,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { projectSections } from "./mobileProjects";
import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { nativeWindow } from "../../../platform/webRuntime";

function recentProjects(key: string): string[] {
  try {
    const value: unknown = JSON.parse(
      nativeWindow.localStorage.getItem(key) || "[]",
    );
    if (Array.isArray(value))
      return value
        .filter((id): id is string => typeof id === "string")
        .slice(0, 5);
  } catch {
    /* Preferences are optional. */
  }
  return [];
}

export function ProjectsScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const pull = usePullRefresh(workspace.refresh);
  const palette = useTheme();
  const current = workspace.selected;
  const projects = current?.projects ?? [];
  const key = `eflow:navigation:v1:${profile?.id}:${current?.workspace.id}:recent-projects`;
  const preferences = useNavigationFavorites(
    profile?.id || "",
    current?.workspace.id || "",
    projects.map((p) => p.id),
    !!current,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("current");
  const [filterOpen, setFilterOpen] = useState(false);
  const statuses = [
    { id: "current", title: "Current projects" },
    { id: "all", title: "All statuses" },
    ...["planning", "active", "on_hold", "completed", "archived"].map((id) => ({
      id,
      title: id.charAt(0).toUpperCase() + id.slice(1).replaceAll("_", " "),
    })),
  ];
  const [opened, setOpened] = useState<{ key: string; ids: string[] }>();
  const recent = opened?.key === key ? opened.ids : recentProjects(key);
  const sections =
    current && !workspace.error
      ? projectSections(projects, preferences.favorites, recent, search, status)
      : [];
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(project) => project.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16 }}
        stickySectionHeadersEnabled={false}
        refreshing={pull.refreshing}
        onRefresh={pull.refresh}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            {!!pull.error && (
              <ErrorState
                error={pull.error}
                retry={() => void pull.refresh()}
              />
            )}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search projects"
                />
              </View>
              <FilterChip
                label="Filter"
                icon
                onPress={() => setFilterOpen(true)}
                selected={status !== "current"}
                accessibilityLabel="Filter projects"
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <FilterChip
                label={
                  statuses.find((item) => item.id === status)?.title ||
                  "Current projects"
                }
                selected
                onPress={() => setFilterOpen(true)}
                accessibilityLabel={`Project status: ${statuses.find((item) => item.id === status)?.title}`}
              />
              {(status !== "current" || search) && (
                <FilterChip
                  label="Clear filters"
                  onPress={() => {
                    setStatus("current");
                    setSearch("");
                  }}
                />
              )}
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: palette.mutedLabel, fontSize: 13 }}
              >
                {
                  new Set(
                    sections.flatMap((section) =>
                      section.data.map((item) => item.id),
                    ),
                  ).size
                }{" "}
                projects
              </Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingTop: 16,
              paddingBottom: 6,
            }}
          >
            <View
              style={{
                width: 6,
                height: 18,
                borderRadius: 3,
                backgroundColor: palette.primary,
              }}
            />
            <Text
              accessibilityRole="header"
              style={{
                color: palette.text,
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                backgroundColor: palette.primarySoft,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: palette.primary,
                }}
              >
                {section.data.length}
              </Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: palette.border,
              marginBottom: 8,
              overflow: "hidden",
              elevation: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <NavigationRow
                title={item.title}
                description={[
                  item.status.replaceAll("_", " "),
                  item.shortcut &&
                    (item.kind === "personal"
                      ? "Personal shortcut"
                      : "Office shortcut"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={<Folder size={20} color={palette.primary} />}
                onPress={() => {
                  const ids = [
                    item.id,
                    ...recent.filter((id) => id !== item.id),
                  ].slice(0, 5);
                  setOpened({ key, ids });
                  nativeWindow.localStorage.setItem(key, JSON.stringify(ids));
                  navigate({
                    name:
                      item.kind === "personal" ? "personal_project" : "project",
                    id: item.id,
                    title: item.title,
                  });
                }}
              />
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Favorite ${item.title}`}
              accessibilityState={{
                checked: preferences.favorites.has(item.id),
              }}
              onPress={() => preferences.toggle(item.id)}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Star
                size={21}
                color={palette.primary}
                fill={
                  preferences.favorites.has(item.id)
                    ? palette.primary
                    : "transparent"
                }
              />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          workspace.error ? (
            <ErrorState
              error={workspace.error}
              retry={() => void workspace.refresh()}
            />
          ) : !current && workspace.loading ? (
            <Loading label="Loading projects" layout="projects" />
          ) : (
            <Empty
              kind="projects"
              title="No projects match"
              description={
                current
                  ? "Try another name or status."
                  : "Choose an available workspace to see projects."
              }
              action={
                current && (search || status !== "current") ? (
                  <Button
                    variant="outline"
                    onPress={() => {
                      setSearch("");
                      setStatus("current");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onPress={() => void workspace.refresh()}>
                    Refresh projects
                  </Button>
                )
              }
            />
          )
        }
      />
      <SelectionSheet
        open={filterOpen}
        title="Filter projects"
        options={statuses}
        value={status}
        onClose={() => setFilterOpen(false)}
        onSelect={(id) => {
          setStatus(id);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}
