import { officeContextLabel } from "../../shared/officeLabels";
import { FilterChip } from "../../components/ui/FilterChip";
import { useNavigationHeader } from "../navigation/navigationHeaderContext";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Building from "lucide-react-native/icons/building";
import Calendar from "lucide-react-native/icons/calendar";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Star from "lucide-react-native/icons/star";
import User from "lucide-react-native/icons/user";
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
  PageHeader,
  SearchField,
  Status,
  withOpacity,
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

const scheduleHealthSpec: Record<
  "on_track" | "due_soon" | "overdue" | "at_risk" | "completed",
  { code: string; label: string }
> = {
  on_track: { code: "active", label: "On track" },
  due_soon: { code: "pending", label: "Due soon" },
  overdue: { code: "overdue", label: "Overdue" },
  at_risk: { code: "stalled", label: "At risk" },
  completed: { code: "completed", label: "Completed" },
};

export function ProjectsScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const navHeader = useNavigationHeader();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const resolveStatus = useWorkStatus();
  const { fontScale } = useWindowDimensions();
  const current = workspace.selected;
  const projects = current?.projects ?? [];
  const showPlanning =
    profile?.role === "head" &&
    current?.workspace.kind === "office" &&
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
    ...[
      "active",
      "on_hold",
      "completed",
      "archived",
      ...(showPlanning ? ["planning"] : []),
    ].map((id) => ({
      id,
      title: resolveStatus(id).label,
    })),
  ];
  const matches =
    current && !workspace.error && facts.data && !facts.error
      ? projectSections(
          verifiedProjects,
          preferences.favorites,
          search,
          status,
          showPlanning,
        )
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
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";

  const list = (
    <RefreshSectionList
      sections={sections}
      onEndReached={page.onEndReached}
      onEndReachedThreshold={0.5}
      keyExtractor={(project) => project.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 16 + (navHeader?.bottomInset ?? 0),
      }}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View
          style={{
            gap: 12,
            marginBottom: 8,
            paddingTop: navHeader?.topInset ?? 0,
          }}
        >
          <PageHeader
            title="Projects"
            subtitle={
              current ? "Your authorized projects" : "Select a workspace"
            }
          />
          {!!pull.error && (
            <ErrorState error={pull.error} retry={() => void pull.refresh()} />
          )}
          {!!facts.error && (
            <ErrorState
              error={facts.error}
              retry={() => void facts.refresh()}
            />
          )}
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search projects"
            filterTrigger={{
              label:
                statuses.find((item) => item.id === status)?.title || "Filter",
              active: status !== "current",
              count: status !== "current" ? 1 : undefined,
              accessibilityLabel: `Project status: ${statuses.find((item) => item.id === status)?.title}`,
              onPress: () => setFilterOpen(true),
            }}
          />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
              }}
            >
              {status !== "current" && (
                <FilterChip
                  label={
                    statuses.find((item) => item.id === status)?.title || status
                  }
                  tone="tinted"
                  removable
                  accessibilityLabel={`Remove filter: ${statuses.find((item) => item.id === status)?.title || status}`}
                  onPress={() => setStatus("current")}
                />
              )}
              {(status !== "current" || (!!search && total > 0)) && (
                <FilterChip
                  label="Clear filters"
                  onPress={() => {
                    setStatus("current");
                    setSearch("");
                  }}
                />
              )}
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: palette.mutedLabel,
                fontSize: 12.5,
                fontWeight: "600",
              }}
            >
              {total} {total === 1 ? "project" : "projects"}
            </Text>
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View
            style={{
              width: 4,
              height: 18,
              borderRadius: 2,
              backgroundColor: palette.primary,
            }}
          />
          <Text
            accessibilityRole="header"
            style={{
              color: palette.text,
              fontWeight: "700",
              fontSize: 15.5,
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
      )}
      renderItem={({ item }) => {
        const record = authoritative.get(item.id);
        const progress =
          record && portfolioSummary(record, facts.data?.tasks ?? []);
        const statusPresentation =
          item.status === "unavailable"
            ? undefined
            : resolveStatus(item.status);
        const recordedOfficeName = facts.data?.offices.find(
          (office) => office.id === authoritative.get(item.id)?.org_id,
        )?.name;
        const officeName = officeContextLabel(
          typeof recordedOfficeName === "string"
            ? recordedOfficeName
            : undefined,
        );
        const ownerName = String(
          facts.data?.owners.find(
            (owner) => owner.id === authoritative.get(item.id)?.owner_id,
          )?.full_name ||
            (record && !record.owner_id ? "Unassigned" : "Unavailable"),
        );
        const targetDate = record
          ? typeof record.target_date === "string"
            ? record.target_date
            : (progress?.nextDeadline ?? "Unscheduled")
          : "Unavailable";
        const scheduleSpec =
          progress && !progress.isEmpty
            ? scheduleHealthSpec[progress.health]
            : undefined;
        const favorited = preferences.favorites.has(item.id);

        return (
          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
              !isDark && styles.cardShadow,
            ]}
          >
            <View style={styles.cardTop}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open project ${item.title}`}
                onPress={() =>
                  navigate({
                    name:
                      item.kind === "personal" ? "personal_project" : "project",
                    id: item.id,
                    title: item.title,
                    ...(item.status === "planning"
                      ? {
                          view: "project_setup",
                          workspaceId: current?.workspace.id,
                        }
                      : {}),
                  })
                }
                style={({ pressed }) => [
                  styles.cardBodyPressable,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={styles.titleRow}>
                  <Text
                    numberOfLines={fontScale > 1.5 ? 3 : 2}
                    style={[styles.cardTitle, { color: palette.text }]}
                  >
                    {item.title}
                  </Text>
                </View>

                <View style={styles.pillsRow}>
                  {item.status === "unavailable" ? (
                    <Status
                      value="unavailable"
                      label="Status unavailable"
                      variant="pill"
                    />
                  ) : (
                    <Status
                      value={item.status}
                      label={statusPresentation?.label}
                      variant="pill"
                      work
                    />
                  )}
                  {scheduleSpec ? (
                    <Status
                      value={scheduleSpec.code}
                      label={scheduleSpec.label}
                      variant="pill"
                    />
                  ) : progress?.isEmpty ? (
                    <Status
                      value="unscheduled"
                      label="No scheduled work"
                      variant="pill"
                    />
                  ) : null}
                </View>

                <View
                  style={[
                    styles.metaBox,
                    {
                      backgroundColor: insetSurface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.metaRow}>
                    {!!officeName && (
                      <View style={styles.metaItem}>
                        <Building size={13} color={palette.mutedLabel} />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.metaText,
                            { color: palette.mutedLabel },
                          ]}
                        >
                          {officeName}
                        </Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <User size={13} color={palette.mutedLabel} />
                      <Text
                        numberOfLines={1}
                        style={[styles.metaText, { color: palette.mutedLabel }]}
                      >
                        {ownerName}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar size={13} color={palette.mutedLabel} />
                      <Text
                        numberOfLines={1}
                        style={[styles.metaText, { color: palette.mutedLabel }]}
                      >
                        {targetDate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text
                        style={[styles.progressText, { color: palette.text }]}
                      >
                        {!progress
                          ? "Unavailable"
                          : progress.total
                            ? `${progress.completed} of ${progress.total} · ${progress.progress}%`
                            : "No tasks yet"}
                      </Text>
                      <ChevronRight size={15} color={palette.mutedLabel} />
                    </View>
                    {!!progress?.total && (
                      <View
                        style={[
                          styles.progressTrack,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progress.progress}%`,
                              backgroundColor: palette.primary,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`Favorite ${item.title}`}
                accessibilityState={{ checked: favorited }}
                onPress={() => preferences.toggle(item.id)}
                style={[
                  styles.favoriteBtn,
                  {
                    backgroundColor: favorited
                      ? palette.primarySoft
                      : insetSurface,
                    borderColor: favorited
                      ? withOpacity(palette.primary, 0.28)
                      : palette.border,
                  },
                ]}
              >
                <Star
                  size={18}
                  color={favorited ? palette.primary : palette.mutedLabel}
                  fill={favorited ? palette.primary : "transparent"}
                />
              </Pressable>
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
            kind={
              current && (search || status !== "current")
                ? "search"
                : current
                  ? "projects"
                  : "people"
            }
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
                  icon={<RotateCcw size={15} color={palette.primary} />}
                  onPress={() => {
                    setSearch("");
                    setStatus("current");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )
      }
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
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

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 14,
    paddingBottom: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardShadow: {
    shadowColor: "#00004f",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardBodyPressable: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: "700",
    flexShrink: 1,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  metaBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    flexShrink: 1,
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progressText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  favoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
