import { useState } from "react";
import { DisplayUpdateNotice } from "../../components/ui/DisplayUpdateNotice";
import { Pressable, SectionList, View } from "react-native";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { Button, Empty, ErrorState, SearchField } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { FilterChip } from "../../components/ui/FilterChip";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { Text } from "../../components/ui/Typography";
import { space, type ThemeColors } from "../../components/ui/theme";
import { FeedSkeleton } from "./FeedSkeleton";
import { WorkRowItem } from "./WorkRowItem";
import { useMobileWorkFeed } from "./WorkFeedProvider";
import { usePullRefresh } from "../../shared/usePullRefresh";
import { groupAssignedWork, workGroups, type WorkGroup } from "./mobileWork";
import { workDestination } from "./workDestination";
import type { WorkDestination } from "../../../core/web/app/features/personal-work/types";
import type { Navigate } from "../../shared/routes";

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

  const baseRows = (facts.data?.rows || []).filter((row) =>
    initial === "History"
      ? row.history
      : initial === "Subtasks"
        ? row.kind.endsWith("node")
        : initial === "Leading"
          ? row.leading
          : true,
  );

  const allAssigned = groupAssignedWork(baseRows, "", workspace);
  const overdueCount =
    allAssigned.find((g) => g.title === "Overdue")?.data.length || 0;
  const todayCount =
    allAssigned.find((g) => g.title === "Today")?.data.length || 0;
  const upcomingCount =
    allAssigned.find((g) => g.title === "Upcoming")?.data.length || 0;

  const sections = groupAssignedWork(baseRows, query, workspace).filter(
    (group) =>
      group.data.length &&
      (!dueOnly || ["Overdue", "Today", "Upcoming"].includes(group.title)) &&
      (filter === "All work" || group.title === filter),
  );

  const workspaces =
    facts.data?.workspaces.filter((item) => item.state === "active") || [];

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
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
                  {section.data.length}
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
        onRefresh={pull.refresh}
        refreshing={pull.refreshing}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            {!!pull.error && (
              <ErrorState
                error={pull.error}
                retry={() => void pull.refresh()}
              />
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
                    ? "Assigned subitems"
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
                  width: 40,
                  height: 40,
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

            {/* Stat Summary Cards Row (Monday.com signature) */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Today, ${todayCount} items`}
                accessibilityState={{ selected: filter === "Today" }}
                onPress={() =>
                  setFilter((prev) => (prev === "Today" ? "All work" : "Today"))
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor:
                    filter === "Today" ? palette.primarySoft : palette.surface,
                  borderWidth: 1,
                  borderColor:
                    filter === "Today" ? palette.primary : palette.border,
                  borderRadius: 14,
                  padding: 12,
                  elevation: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: palette.text,
                  }}
                >
                  {todayCount}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.mutedLabel,
                    marginTop: 2,
                  }}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Past dates, ${overdueCount} items`}
                accessibilityState={{ selected: filter === "Overdue" }}
                onPress={() =>
                  setFilter((prev) =>
                    prev === "Overdue" ? "All work" : "Overdue",
                  )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor:
                    filter === "Overdue" ? palette.dangerSoft : palette.surface,
                  borderWidth: 1,
                  borderColor:
                    filter === "Overdue" ? palette.danger : palette.border,
                  borderRadius: 14,
                  padding: 12,
                  elevation: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: overdueCount > 0 ? palette.danger : palette.text,
                  }}
                >
                  {overdueCount}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.mutedLabel,
                    marginTop: 2,
                  }}
                >
                  Past Dates
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Upcoming, ${upcomingCount} items`}
                accessibilityState={{ selected: filter === "Upcoming" }}
                onPress={() =>
                  setFilter((prev) =>
                    prev === "Upcoming" ? "All work" : "Upcoming",
                  )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor:
                    filter === "Upcoming" ? palette.blueSoft : palette.surface,
                  borderWidth: 1,
                  borderColor:
                    filter === "Upcoming" ? palette.blue : palette.border,
                  borderRadius: 14,
                  padding: 12,
                  elevation: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: palette.text,
                  }}
                >
                  {upcomingCount}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.mutedLabel,
                    marginTop: 2,
                  }}
                >
                  Upcoming
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <FilterChip
                label={filter === "All work" ? "All dates" : filter}
                selected={filter !== "All work"}
                onPress={() => setFilterOpen(true)}
                accessibilityLabel={`Date filter: ${filter === "All work" ? "All dates" : filter}`}
              />
              <FilterChip
                label={
                  workspace
                    ? workspaces.find((item) => item.id === workspace)?.name ||
                      "Workspace unavailable"
                    : "All workspaces"
                }
                selected={!!workspace}
                onPress={() => setFilterOpen(true)}
              />
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
                    : "Tasks and subitems assigned to you will appear here, grouped by due date."
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
