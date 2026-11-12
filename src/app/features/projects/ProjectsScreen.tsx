import { FilterChip } from "../../components/ui/FilterChip";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
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
import { useFacts } from "../../shared/useFacts";
import {
  portfolioSummary,
  readPortfolioFacts,
  verifiedProjectStatus,
} from "./portfolioFacts";
import { projectSections } from "./mobileProjects";
import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { useWorkStatus } from "../../shared/workStatusPresentation";

export function ProjectsScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const palette = useTheme();
  const resolveStatus = useWorkStatus();
  const { width, fontScale } = useWindowDimensions();
  const pinnedWidth = Math.max(176, Math.min(228, width * 0.48));
  const tableWidth = pinnedWidth + 140 + 175 + 150 + 150 + 135 + 150;
  const horizontal = useSharedValue(0);
  const onHorizontalScroll = useAnimatedScrollHandler((event) => {
    horizontal.set(event.contentOffset.x);
  });
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateX: horizontal.get() }],
  }));
  const current = workspace.selected;
  const projects = current?.projects ?? [];
  const showPlanning = profile?.role === "head" && current?.workspace.kind === "office" &&
    current.workspace.office_id === profile.org_id;
  const facts = useFacts(
    `project-portfolio:${profile?.id}:${current?.workspace.id}:${projects.map((item) => item.id).join(",")}`,
    () => readPortfolioFacts(projects.map((item) => item.id)),
    !!current && !!profile?.id,
  );
  const pull = usePullRefresh(async () => {
    await Promise.all([workspace.refresh(), facts.refresh()]);
  });
  const authoritative = new Map(
    (facts.data?.projects ?? []).map((row) => [String(row.id), row]),
  );
  const verifiedProjects = projects.map((item) => ({
    ...item,
    status:
      verifiedProjectStatus(
        item.kind === "personal"
          ? item.status
          : authoritative.get(item.id)?.status,
      ) || "unavailable",
  }));
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
    ...["active", "on_hold", "completed", "archived", ...(showPlanning ? ["planning"] : [])].map((id) => ({
      id,
      title: resolveStatus(id).label,
    })),
  ];
  const matches =
    current && !workspace.error && facts.data && !facts.error
      ? projectSections(verifiedProjects, preferences.favorites, search, status, showPlanning)
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
        <Animated.View
          style={[
            { width: Math.max(0, width - 32), gap: 12, marginBottom: 12 },
            pinned,
          ]}
        >
          <Text
            accessibilityRole="header"
            style={{ fontSize: 24, fontWeight: "700", color: palette.text }}
          >
            Projects
          </Text>
          {showPlanning && (
              <Button variant="outline" onPress={() => navigate({
                name: "projects",
                view: "project_setup",
                workspaceId: current?.workspace.id,
                title: "Create or resume a project on eFlow Web",
              })}>
                Create or resume on eFlow Web
              </Button>
            )}
          {!!pull.error && (
            <ErrorState error={pull.error} retry={() => void pull.refresh()} />
          )}
          {!!facts.error && (
            <ErrorState
              error={facts.error}
              retry={() => void facts.refresh()}
            />
          )}
          {!!facts.data && (
            <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
              Swipe sideways to see project details.
            </Text>
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
        </Animated.View>
      }
      renderSectionHeader={({ section }) => (
        <View>
          <Animated.View
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingTop: 16,
                paddingBottom: 6,
              },
              pinned,
            ]}
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
          </Animated.View>
          <View
            style={{
              flexDirection: "row",
              width: tableWidth,
              backgroundColor: palette.background,
              borderBottomWidth: 1,
              borderColor: palette.border,
              minHeight: 42,
              alignItems: "center",
            }}
          >
            <Animated.View
              style={[
                {
                  width: pinnedWidth,
                  backgroundColor: palette.background,
                  paddingHorizontal: 10,
                  zIndex: 2,
                },
                pinned,
              ]}
            >
              <Text>Project</Text>
            </Animated.View>
            {[
              "Status",
              "Progress",
              "Lead office",
              "Project lead",
              "Schedule",
              "Target date",
            ].map((label, index) => (
              <Text
                key={label}
                style={{
                  width: [140, 175, 150, 150, 135, 150][index],
                  paddingHorizontal: 8,
                  color: palette.mutedLabel,
                }}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      )}
      renderItem={({ item }) => {
        const record = authoritative.get(item.id);
        const progress =
          record && portfolioSummary(record, facts.data?.tasks ?? []);
        return (
          <View
            style={{
              flexDirection: "row",
              width: tableWidth,
              minHeight: fontScale > 1.5 ? 100 : 76,
              alignItems: "stretch",
              backgroundColor: palette.surface,
              borderBottomWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Animated.View
              style={[
                {
                  width: pinnedWidth,
                  backgroundColor: palette.surface,
                  zIndex: 2,
                  flexDirection: "row",
                  alignItems: "center",
                },
                pinned,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open project ${item.title}`}
                onPress={() =>
                  navigate({
                    name:
                      item.kind === "personal" ? "personal_project" : "project",
                    id: item.id,
                    title: item.title,
                    ...(item.status === "planning" ? {
                      view: "project_setup",
                      workspaceId: current?.workspace.id,
                    } : {}),
                  })
                }
                style={{
                  flex: 1,
                  minHeight: 48,
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  numberOfLines={fontScale > 1.5 ? 3 : 2}
                  style={{ fontWeight: "600" }}
                >
                  {item.title}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`Favorite ${item.title}`}
                accessibilityState={{
                  checked: preferences.favorites.has(item.id),
                }}
                onPress={() => preferences.toggle(item.id)}
                style={{
                  width: 44,
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
            </Animated.View>
            <View
              style={{
                width: 140,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text>
                {item.status === "unavailable"
                  ? "Status unavailable"
                  : resolveStatus(item.status).label}
              </Text>
            </View>
            <View
              style={{
                width: 175,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              {
                <>
                  <Text>
                    {!progress
                      ? "Unavailable"
                      : progress.total
                        ? `${progress.completed} of ${progress.total} · ${progress.progress}%`
                        : "No tasks yet"}
                  </Text>
                  {!!progress?.total && (
                    <View
                      style={{
                        height: 3,
                        backgroundColor: palette.border,
                        marginTop: 5,
                      }}
                    >
                      <View
                        style={{
                          height: 3,
                          width: `${progress.progress}%`,
                          backgroundColor: palette.primary,
                        }}
                      />
                    </View>
                  )}
                </>
              }
            </View>
            <View
              style={{
                width: 150,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text>
                {String(
                  facts.data?.offices.find(
                    (office) =>
                      office.id === authoritative.get(item.id)?.org_id,
                  )?.name ||
                    (item.kind === "personal" ? "Personal" : "Unavailable"),
                )}
              </Text>
            </View>
            <View
              style={{
                width: 150,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text>
                {String(
                  facts.data?.owners.find(
                    (owner) =>
                      owner.id === authoritative.get(item.id)?.owner_id,
                  )?.full_name ||
                    (record && !record.owner_id ? "Unassigned" : "Unavailable"),
                )}
              </Text>
            </View>
            <View
              style={{
                width: 135,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text>
                {progress
                  ? progress.isEmpty
                    ? "No scheduled work"
                    : {
                        on_track: "On track",
                        due_soon: "Due soon",
                        overdue: "Overdue",
                        at_risk: "At risk",
                        completed: "Completed",
                      }[progress.health]
                  : "Unavailable"}
              </Text>
            </View>
            <View
              style={{
                width: 150,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text>
                {record
                  ? typeof record.target_date === "string"
                    ? record.target_date
                    : (progress?.nextDeadline ?? "Unscheduled")
                  : "Unavailable"}
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        workspace.error ? (
          <ErrorState
            error={workspace.error}
            retry={() => void workspace.refresh()}
          />
        ) : facts.error ? undefined : (workspace.loading || facts.loading) &&
          !facts.data ? (
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
                : "Use the status filter to find archived projects."
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
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <FolderPullArea
        pull={pull}
        frame={(scroll) => (
          <Animated.ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            onScroll={onHorizontalScroll}
            scrollEventThrottle={16}
          >
            <View style={{ width: tableWidth }}>{scroll}</View>
          </Animated.ScrollView>
        )}
      >
        {list}
      </FolderPullArea>
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
