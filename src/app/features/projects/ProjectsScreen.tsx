import { FilterChip } from "../../components/ui/FilterChip";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Star from "lucide-react-native/icons/star";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { usePullRefresh } from "../../shared/usePullRefresh";
import { useSnapshotPage } from "../../shared/useSnapshotPage";
import type { Navigate } from "../../shared/routes";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  SearchField,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import {
  ProjectDirectoryCells,
  projectDirectoryWidths,
} from "./ProjectTableCells";
import { projectSections } from "./mobileProjects";
import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { statusLabel } from "../../shared/statusLabels";

export function ProjectsScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const pull = usePullRefresh(workspace.refresh);
  const palette = useTheme();
  const { width } = useWindowDimensions();
  const [viewport, setViewport] = useState(0);
  const widths = projectDirectoryWidths(
    Math.max(120, (viewport || width) - 32 - 48),
  );
  const current = workspace.selected;
  const projects = current?.projects ?? [];
  const key = `eflow:navigation:v1:${profile?.id}:${current?.workspace.id}`;
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
      title: statusLabel(id),
    })),
  ];
  const matches =
    current && !workspace.error
      ? projectSections(projects, preferences.favorites, search, status)
      : [];
  const total = matches.reduce(
    (count, section) => count + section.data.length,
    0,
  );
  const page = useSnapshotPage(
    JSON.stringify([key, search.trim().toLowerCase(), status]),
    total,
  );
  let remaining = page.limit;
  const sections = matches.flatMap((section) => {
    if (!remaining) return [];
    const data = section.data.slice(0, remaining);
    remaining -= data.length;
    return [{ ...section, data, total: section.data.length }];
  });
  const list = (
    <RefreshSectionList
      sections={sections}
      onEndReached={page.onEndReached}
      onEndReachedThreshold={0.5}
      keyExtractor={(project) => project.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16 }}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 12 }}>
          {!!pull.error && (
            <ErrorState error={pull.error} retry={() => void pull.refresh()} />
          )}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View style={{ flex: 1, minWidth: 152 }}>
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search projects"
              />
            </View>
            <FilterChip
              label={
                statuses.find((item) => item.id === status)?.title || "Filter"
              }
              icon
              onPress={() => setFilterOpen(true)}
              selected={status !== "current"}
              accessibilityLabel={`Project status: ${statuses.find((item) => item.id === status)?.title}`}
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
              {total} {total === 1 ? "project" : "projects"}
            </Text>
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View>
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
                {section.total}
              </Text>
            </View>
          </View>
          <ProjectDirectoryCells widths={widths} />
        </View>
      )}
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "stretch",
            backgroundColor: palette.surface,
          }}
        >
          <ProjectDirectoryCells
            project={item}
            widths={widths}
            onOpen={() => {
              navigate({
                name: item.kind === "personal" ? "personal_project" : "project",
                id: item.id,
                title: item.title,
              });
            }}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Favorite ${item.title}`}
            accessibilityState={{
              checked: preferences.favorites.has(item.id),
            }}
            onPress={() => preferences.toggle(item.id)}
            style={{
              width: 48,
              minHeight: 48,
              borderBottomWidth: 0.5,
              borderColor: palette.border,
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
            title={
              current && (search || status !== "current")
                ? "No projects match"
                : current
                  ? "No current projects"
                  : "No workspace selected"
            }
            description={
              current
                ? search || status !== "current"
                  ? "Try another name or status."
                  : "Use the status filter to find completed or archived projects."
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
  );
  return (
    <View
      style={{ flex: 1, backgroundColor: palette.background }}
      onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
    >
      <FolderPullArea pull={pull}>{list}</FolderPullArea>
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
