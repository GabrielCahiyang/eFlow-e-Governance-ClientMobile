import { useMemo, useState } from "react";
import { DisplayUpdateNotice } from "../../components/ui/DisplayUpdateNotice";
import { Pressable, View } from "react-native";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { Button, Empty, ErrorState, SearchField } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { FilterChip } from "../../components/ui/FilterChip";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { Text } from "../../components/ui/Typography";
import { space, type ThemeColors } from "../../components/ui/theme";
import { FeedSkeleton } from "./FeedSkeleton";
import { WorkRowItem } from "./WorkRowItem";
import { useMobileWorkFeed } from "./WorkFeedProvider";
import { usePullRefresh } from "../../shared/usePullRefresh";
import {
  groupAssignedWork,
  matchesWorkSearch,
  workGroups,
  type WorkGroup,
} from "./mobileWork";
import { workDestination } from "./workDestination";
import type { WorkDestination } from "../../../core/web/app/features/personal-work/types";
import type { Navigate } from "../../shared/routes";

const rowsPerPage = 40;

function groupAccentColor(title: string, palette: ThemeColors): string {
  if (title === "Overdue") return palette.danger;
  if (title === "Today") return palette.warning;
  if (title === "Upcoming") return palette.blue;
  if (title === "Completed") return palette.success;
  return palette.mutedLabel;
}

export function PersonalWorkFeedScreen({
  initial = "Assigned work",
  dueOnly = false,
  navigate,
}: {
  initial?: WorkDestination;
  dueOnly?: boolean;
  navigate: Navigate;
}) {
  const facts = useMobileWorkFeed();
  const pull = usePullRefresh(facts.refresh);
  const palette = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WorkGroup | "All work">("All work");
  const [workspace, setWorkspace] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openError, setOpenError] = useState<Error>();

  const issues = [
    ...(facts.data?.issues || []),
    ...(facts.data?.unavailable || []),
  ];

  const rows = facts.data?.rows;
  const minute = Math.floor(Date.now() / 60_000);
  const allAssigned = useMemo(
    () =>
      groupAssignedWork(
        (rows ?? []).filter((row) =>
          initial === "History"
            ? row.history
            : initial === "Subtasks"
              ? row.kind.endsWith("node")
              : initial === "Leading"
                ? row.leading
                : true,
        ),
        "",
        workspace,
        new Date(minute * 60_000),
      ),
    [rows, initial, workspace, minute],
  );
  const overdueCount =
    allAssigned.find((g) => g.title === "Overdue")?.data.length || 0;
  const todayCount =
    allAssigned.find((g) => g.title === "Today")?.data.length || 0;
  const upcomingCount =
    allAssigned.find((g) => g.title === "Upcoming")?.data.length || 0;

  const needle = query.trim().toLocaleLowerCase();
  const matches = useMemo(
    () =>
      allAssigned
        .filter(
          ({ title }) =>
            (!dueOnly || ["Overdue", "Today", "Upcoming"].includes(title)) &&
            (filter === "All work" || title === filter),
        )
        .map(({ title, data }) => ({
          title,
          data: needle
            ? data.filter((row) => matchesWorkSearch(row, needle))
            : data,
        })),
    [allAssigned, dueOnly, filter, needle],
  );
  const total = matches.reduce((count, group) => count + group.data.length, 0);
  const scope = JSON.stringify([initial, dueOnly, workspace, filter, needle]);
  const [page, setPage] = useState({ scope, limit: rowsPerPage });
  if (page.scope !== scope) setPage({ scope, limit: rowsPerPage });
  const limit = page.scope === scope ? page.limit : rowsPerPage;
  // Slice after filtering and sorting the complete authorized snapshot, so
  // every new window extends the existing order, including between groups.
  let remaining = limit;
  const sections = matches.flatMap(({ title, data }) => {
    if (!remaining || !data.length) return [];
    const visible = data.slice(0, remaining);
    remaining -= visible.length;
    return [{ key: title, title, data: visible, total: data.length }];
  });

  const workspaces =
    facts.data?.workspaces.filter((item) => item.state === "active") || [];

  const list = (
    <RefreshSectionList
      sections={sections}
      keyExtractor={(row) => row.key}
      onEndReached={
        limit < total
          ? () =>
              setPage((previous) =>
                previous.scope === scope && previous.limit === limit
                  ? { scope, limit: Math.min(total, limit + rowsPerPage) }
                  : previous,
              )
          : undefined
      }
      onEndReachedThreshold={0.5}
      renderItem={({ item, index, section }) => (
        <WorkRowItem
          row={item}
          isLast={index === section.data.length - 1}
          onPress={() => {
            setOpenError(undefined);
            try {
              navigate(workDestination(item));
            } catch (error) {
              setOpenError(
                error instanceof Error
                  ? error
                  : new Error("This work location could not be opened."),
              );
            }
          }}
        />
      )}
      renderSectionHeader={({ section }) => {
        const accent = groupAccentColor(section.title, palette);
        return (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingTop: space.md,
              paddingBottom: space.xs,
            }}
          >
            <View
              style={{
                width: 6,
                height: 18,
                borderRadius: 3,
                backgroundColor: accent,
              }}
            />
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: palette.text,
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
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
      contentContainerStyle={{
        flexGrow: 1,
        padding: space.lg,
        gap: space.xs,
      }}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          {!!pull.error && (
            <ErrorState error={pull.error} retry={() => void pull.refresh()} />
          )}
          {/* Monday-style Top Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: palette.text,
              }}
            >
              {dueOnly
                ? "Deadlines"
                : initial === "Subtasks"
                  ? "Assigned subtasks"
                  : initial === "Assigned work"
                    ? "My Work"
                    : initial}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                expanded: filterOpen,
                selected: filter !== "All work" || !!workspace,
              }}
              accessibilityLabel="Filter assignments"
              onPress={() => setFilterOpen(true)}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? palette.primarySoft
                  : palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
              })}
            >
              <SlidersHorizontal size={18} color={palette.text} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              [
                ["Today", todayCount],
                ["Overdue", overdueCount],
                ["Upcoming", upcomingCount],
              ] as const
            ).map(([group, count]) => (
              <FilterChip
                key={group}
                label={`${group} · ${count}`}
                accessibilityLabel={`${group}, ${count} ${count === 1 ? "item" : "items"}`}
                selected={filter === group}
                onPress={() => setFilter(filter === group ? "All work" : group)}
              />
            ))}
            {filter !== "All work" &&
              !["Today", "Overdue", "Upcoming"].includes(filter) && (
                <FilterChip
                  label={filter}
                  selected
                  onPress={() => setFilter("All work")}
                />
              )}
            {!!workspace && (
              <FilterChip
                label={
                  workspaces.find((item) => item.id === workspace)?.name ||
                  "Workspace unavailable"
                }
                selected
                onPress={() => setFilterOpen(true)}
              />
            )}
            {(filter !== "All work" || workspace || query) && (
              <FilterChip
                label="Clear filters"
                onPress={() => {
                  setFilter("All work");
                  setWorkspace("");
                  setQuery("");
                }}
              />
            )}
          </View>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search assignments"
          />

          {!!(facts.error || openError) && (
            <ErrorState
              error={facts.error || openError}
              retry={() => void facts.refresh()}
            />
          )}
          <DisplayUpdateNotice
            visible={!!facts.data && facts.stale}
            loading={facts.loading}
          />
          {!!issues.length && (
            <ErrorState
              error="Some assignments couldn't load. Refresh to try again."
              retry={() => void facts.refresh()}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        facts.loading && !facts.data ? (
          <FeedSkeleton label="Loading assigned work" />
        ) : (
          <Empty
            kind="work"
            title={
              facts.error || issues.length
                ? "Assignments could not be checked"
                : query || workspace || filter !== "All work"
                  ? "No matching assignments"
                  : "Your work starts here"
            }
            description={
              facts.error || issues.length
                ? "Some work sources could not load. Refresh to check your assignments."
                : query || workspace || filter !== "All work"
                  ? "Try another search or clear your filters."
                  : "Tasks and subtasks assigned to you will appear here, grouped by due date."
            }
            action={
              filter !== "All work" || workspace || query ? (
                <Button
                  variant="outline"
                  onPress={() => {
                    setFilter("All work");
                    setWorkspace("");
                    setQuery("");
                  }}
                >
                  Reset search and filters
                </Button>
              ) : (
                <Button onPress={() => void facts.refresh()}>
                  Refresh assignments
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
      <FolderPullArea pull={pull}>{list}</FolderPullArea>
      <SelectionSheet
        open={filterOpen}
        title="Filter work"
        description="Choose a date group or an authorized workspace."
        value={"date:" + filter}
        options={[
          ...(["All work", ...workGroups] as const).map((title) => ({
            id: "date:" + title,
            title,
          })),
          { id: "scope:", title: "All workspaces", selected: !workspace },
          ...workspaces.map((item) => ({
            id: "scope:" + item.id,
            title: item.name,
            description:
              item.kind === "office"
                ? "Office workspace"
                : "Personal workspace",
            selected: workspace === item.id,
          })),
        ]}
        onSelect={(value) => {
          if (value.startsWith("date:"))
            setFilter(value.slice(5) as WorkGroup | "All work");
          else setWorkspace(value.slice(6));
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}
