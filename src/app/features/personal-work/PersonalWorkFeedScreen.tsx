import { useMemo, useState } from "react";
import { DisplayUpdateNotice } from "../../components/ui/DisplayUpdateNotice";
import { View } from "react-native";
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
import { useWorkspace } from "../workspaces";
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
  initialFilter = "All work",
  awaitingOnly = false,
  navigate,
}: {
  initial?: WorkDestination;
  dueOnly?: boolean;
  initialFilter?: WorkGroup | "All work";
  awaitingOnly?: boolean;
  navigate: Navigate;
}) {
  const facts = useMobileWorkFeed();
  const pull = usePullRefresh(facts.refresh);
  const palette = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WorkGroup | "All work">(initialFilter);
  const workspace = useWorkspace();
  const selected = workspace.error ? undefined : workspace.selected;
  const workspaceId = selected?.workspace.id;
  const filters = dueOnly
    ? (["Overdue", "Today", "Upcoming"] as const)
    : workGroups.filter((group) =>
        initial === "History"
          ? group === "Completed" || group === "Other history"
          : group !== "Completed" && group !== "Other history",
      );
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
        (workspaceId ? (rows ?? []) : []).filter((row) => {
          if (awaitingOnly)
            return ["for_review", "submitted"].includes(row.status);
          if (initial === "History") return row.history;
          if (row.history) return false;
          if (dueOnly) return true;
          if (initial === "Leading") return row.leading;
          if (initial === "Subtasks") return row.kind.endsWith("node");
          return row.kind.endsWith("task");
        }),
        "",
        workspaceId,
        new Date(minute * 60_000),
      ),
    [rows, initial, dueOnly, workspaceId, minute, awaitingOnly],
  );
  const needle = query.trim().toLocaleLowerCase();
  const matches = useMemo(
    () =>
      allAssigned
        .filter(
          ({ title }) =>
            (initial === "History" || title !== "Other history") &&
            (!dueOnly || ["Overdue", "Today", "Upcoming"].includes(title)) &&
            (filter === "All work" || title === filter),
        )
        .map(({ title, data }) => ({
          title,
          data: needle
            ? data.filter((row) => matchesWorkSearch(row, needle))
            : data,
        })),
    [allAssigned, initial, dueOnly, filter, needle],
  );
  const total = matches.reduce((count, group) => count + group.data.length, 0);
  const scope = JSON.stringify([initial, dueOnly, workspaceId, filter, needle]);
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
          <Text
            accessibilityRole="header"
            style={{ fontSize: 24, fontWeight: "700", color: palette.text }}
          >
            {dueOnly
              ? "Deadlines"
              : initial === "Subtasks"
                ? "Assigned subtasks"
                : initial === "Assigned work"
                  ? "My Work"
                  : initial}
          </Text>
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
                value={query}
                onChange={setQuery}
                placeholder="Search assignments"
              />
            </View>
            <FilterChip
              label={filter}
              icon
              onPress={() => setFilterOpen(true)}
              selected={filter !== "All work"}
              accessibilityLabel={`Filter assignments: ${filter}`}
            />
          </View>
          {!!workspace.error && (
            <ErrorState
              error={workspace.error}
              retry={() => void workspace.refresh()}
            />
          )}
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
        (facts.loading && !facts.data) || workspace.loading ? (
          <FeedSkeleton label="Loading assigned work" />
        ) : (
          <Empty
            kind="work"
            title={
              workspace.error || facts.error || issues.length
                ? "Assignments could not be checked"
                : query || filter !== "All work"
                  ? "No matching assignments"
                  : "Your work starts here"
            }
            description={
              workspace.error || facts.error || issues.length
                ? "Some work sources could not load. Refresh to check your assignments."
                : query || filter !== "All work"
                  ? "Try another search or clear your filters."
                  : "Tasks and subtasks assigned to you will appear here, grouped by due date."
            }
            action={
              filter !== "All work" || query ? (
                <Button
                  variant="outline"
                  onPress={() => {
                    setFilter("All work");
                    setQuery("");
                  }}
                >
                  Reset search and filters
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
        title="Filter work"
        value={filter}
        options={(["All work", ...filters] as const).map((title) => ({
          id: title,
          title,
        }))}
        onSelect={(value) => {
          setFilter(value as WorkGroup | "All work");
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}
