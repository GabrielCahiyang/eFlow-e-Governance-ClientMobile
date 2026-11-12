import { useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Star from "lucide-react-native/icons/star";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Status,
  Tabs,
  dateLabel,
  MondayTableRow,
} from "../../components/ui";

import { Text } from "../../components/ui/Typography";
import type { Navigate } from "../../shared/routes";
import { useFacts } from "../../shared/useFacts";
import { retryTransientRead } from "../../shared/retryTransientRead";
import { usePullRefresh } from "../../shared/usePullRefresh";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { fetchProject, fetchProjectCompletion } from "./services";
import { useProjectTaskPages } from "./useProjectTaskPages";
import { fetchProjectGroups } from "../../../core/web/app/features/project-table/services/workspaceService";
import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { nativeWindow } from "../../../platform/webRuntime";
import { netProjectUpdates } from "./subscriptions";
import { ProjectTaskEditor, useTaskStructure } from "./ProjectTaskEditor";
import { ProjectPeople } from "./ProjectPeople";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectOffices } from "./ProjectOffices";
import { ProjectFundingSummary } from "./ProjectFundingSummary";
import { taskSections, type ProjectWorkView } from "./mobileProjects";
import { completionPercent } from "../../shared/completion";
import { fetchProjectTaskFinance } from "./projectTaskFinance";
import {
  ProjectTableCells,
  ProjectTableLoading,
  projectTableWidth,
  projectTableWidths,
} from "./ProjectTableCells";

const views = [
  { id: "tasks", label: "Main table" },
  { id: "board", label: "Board" },
  { id: "calendar", label: "Agenda" },
];
const pageGutter = 16;
const taskDateLabel = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T00:00:00" : value;
  return Number.isFinite(Date.parse(date)) ? dateLabel(date) : value;
};
const tools = [
  { id: "people", title: "Project people" },
  { id: "messages", title: "Project conversations" },
  { id: "offices", title: "Participating Offices" },
  { id: "files", title: "Project files" },
  { id: "funding", title: "Funding" },
  { id: "gantt", title: "Planning on eFlow Web" },
  { id: "settings", title: "Project settings on eFlow Web" },
  { id: "import", title: "PDF import on eFlow Web" },
];

export function ProjectScreen({
  id,
  navigate,
  initialView,
}: {
  id: string;
  navigate: Navigate;
  initialView?: string;
}) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const palette = useTheme();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const scope = JSON.stringify([
    profile?.id,
    workspace.selected?.workspace.id,
    id,
  ]);
  const facts = useFacts(
    "project:" + scope,
    () => retryTransientRead(() => fetchProject(id)),
    !!profile?.id,
  );
  const [view, setView] = useState(initialView || "tasks");
  const [menu, setMenu] = useState(false);
  const [people, setPeople] = useState(false);
  const [addTask, setAddTask] = useState(false);
  const [query, setQuery] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const workView: ProjectWorkView =
    view === "board" || view === "calendar" ? view : "tasks";
  const main = workView === "tasks";
  const auxiliary = ["offices", "files", "funding"].includes(view);
  const closed = ["completed", "archived"].includes(facts.data?.status ?? "");
  const needle = query.trim().toLowerCase();
  useEffect(() => {
    if (needle === serverSearch) return;
    const timer = setTimeout(() => setServerSearch(needle), needle ? 250 : 0);
    return () => clearTimeout(timer);
  }, [needle, serverSearch]);
  const searchPending = needle !== serverSearch;
  const projectReady = !!facts.data && !facts.error;
  const groupFacts = useFacts(
    "project-groups:" + scope,
    () => fetchProjectGroups(id),
    projectReady && main && !auxiliary,
  );
  const groups = groupFacts.error ? [] : (groupFacts.data ?? []);
  const taskScope = { actor: profile?.id || "", project: id, office: facts.data?.orgId || "" };
  const createAccess = useTaskStructure(taskScope, projectReady && !!taskScope.office && facts.data?.status === "active" && profile?.role === "head" && main && !auxiliary);
  const canAdd = createAccess.data === true && !createAccess.loading && !createAccess.error && !facts.loading && !groupFacts.loading && !!groups.length;
  const pages = useProjectTaskPages({
    scope,
    project: id,
    view: workView,
    groups,
    includeArchived: closed,
    search: serverSearch,
    enabled:
      projectReady &&
      !auxiliary &&
      (!main || (!!groupFacts.data && !groupFacts.error)),
  });
  const totals = useFacts(
    "project-totals:" + scope + ":" + closed,
    () => fetchProjectCompletion(id, closed),
    projectReady,
  );
  const financeTaskIds = pages.tasks.map((task) => task.id);
  const finance = useFacts(
    JSON.stringify(["project-table-finance", scope, financeTaskIds]),
    () => fetchProjectTaskFinance(financeTaskIds),
    projectReady &&
      main &&
      !auxiliary &&
      !searchPending &&
      !pages.error &&
      !!financeTaskIds.length,
  );
  const refresh = useCallback(async () => {
    await Promise.all([
      facts.refresh(),
      groupFacts.refresh(),
      pages.refresh(),
      totals.refresh(),
      finance.refresh(),
    ]);
  }, [
    facts.refresh,
    groupFacts.refresh,
    pages.refresh,
    totals.refresh,
    finance.refresh,
  ]);
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;
  const pull = usePullRefresh(refresh);
  const viewport = measuredWidth || windowWidth;
  const tableViewport = Math.max(0, viewport - 2 * pageGutter);
  const widths = projectTableWidths(tableViewport, fontScale);
  const tableWidth = projectTableWidth(widths);
  const offsetX = useSharedValue(0);
  const trackHorizontal = useAnimatedScrollHandler((event) => {
    offsetX.set(Math.max(0, event.contentOffset.x));
  });
  // Counter the horizontal scroll for the controls, group names and Task column.
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.get() }],
  }));
  useEffect(() => {
    offsetX.set(0);
  }, [view, id, projectReady, offsetX]);
  const favorites = useNavigationFavorites(
    profile?.id || "",
    workspace.selected?.workspace.id || "",
    workspace.selected?.projects.map((p) => p.id) || [],
    !!workspace.selected,
  );
  useEffect(() => {
    const onChange = () => void latestRefresh.current();
    const unsubscribe = netProjectUpdates(id, onChange);
    nativeWindow.addEventListener("eflow:work-updated", onChange);
    return () => {
      unsubscribe();
      nativeWindow.removeEventListener("eflow:work-updated", onChange);
    };
  }, [id]);

  if (facts.error || !facts.data) {
    return (
      <Screen title="Project">
        {facts.error ? (
          <ErrorState error={facts.error} retry={() => void facts.refresh()} />
        ) : main ? (
          <ProjectTableLoading widths={widths} />
        ) : (
          <Loading label="Loading project" layout="project" />
        )}
      </Screen>
    );
  }

  const project = facts.data;
  const completion = totals.error ? undefined : totals.data;
  const percent = completion
    ? completionPercent(
        completion.completed,
        completion.required,
        project.status,
      )
    : 0;
  const sections = taskSections(
    searchPending || pages.error ? [] : pages.tasks,
    groups,
    workView,
  );
  const hasTable = main && sections.length > 0;
  const accents = new Map(groups.map((group) => [group.id, group.color]));
  const header = (
    <View style={{ gap: 12, marginBottom: 8 }}>
      {main && !auxiliary && groupFacts.error && (
        <ErrorState
          error={groupFacts.error}
          retry={() => void groupFacts.refresh()}
        />
      )}
      {main && !auxiliary && groupFacts.loading && !groupFacts.data && (
        <Loading label="Loading task groups" layout="summary" />
      )}
      {!!pull.error && <ErrorState error={pull.error} retry={pull.refresh} />}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            color: palette.text,
            fontSize: 26,
            fontWeight: "600",
          }}
        >
          {project.title}
        </Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Favorite project"
          accessibilityState={{ checked: favorites.favorites.has(id) }}
          onPress={() => favorites.toggle(id)}
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Star
            size={22}
            color={palette.primary}
            fill={favorites.favorites.has(id) ? palette.primary : "transparent"}
          />
        </Pressable>
      </View>
      <Card style={{ padding: 10, gap: 6 }}>
        <Row>
          <Status value={project.status} />
        </Row>
        <LabelValue
          label="Tasks completed"
          value={
            completion
              ? `${completion.completed} of ${completion.required} · ${percent}%`
              : totals.error
                ? "Unavailable"
                : "Loading…"
          }
        />
        {completion && (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Project task completion"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: palette.border,
            }}
          >
            <View
              style={{
                width: `${percent}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: palette.primary,
              }}
            />
          </View>
        )}
        {!!project.targetDate && (
          <LabelValue
            label="Target date"
            value={dateLabel(project.targetDate)}
          />
        )}
      </Card>
      {closed && (
        <Notice>
          This project is read-only. Task history remains available.
        </Notice>
      )}
      <Row>
        <Button variant="outline" onPress={() => setMenu(true)}>
          Project options
        </Button>
        {canAdd && <Button onPress={() => setAddTask(true)}>Add task</Button>}
      </Row>
      {!auxiliary && (
        <Tabs items={views} value={main ? "tasks" : view} onChange={setView} />
      )}
      {!auxiliary && (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search project tasks"
        />
      )}
    </View>
  );

  const list = (
    <RefreshSectionList
      nestedScrollEnabled
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(task) => task.id}
      onEndReached={
        !searchPending && !pages.error && pages.next
          ? () => void pages.loadMore()
          : undefined
      }
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        main ? (
          <Animated.View style={[{ width: tableViewport }, pinned]}>
            {header}
            {!!sections.length && (
              <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                Swipe for more columns. Task names stay in view. Actual expense
                shows settled cash records you can access. A dash means no
                amount is available.
              </Text>
            )}
            {!!finance.error && (
              <ErrorState
                error="Task budget and expense amounts are unavailable."
                retry={() => void finance.refresh()}
              />
            )}
          </Animated.View>
        ) : (
          header
        )
      }
      ListEmptyComponent={
        main && (!groupFacts.data || groupFacts.error) ? undefined : (
          <Animated.View style={main && [{ width: tableViewport }, pinned]}>
            {searchPending || (pages.loading && !pages.data) ? (
              <Loading
                label={
                  needle ? "Searching project tasks" : "Loading project tasks"
                }
                layout="project"
              />
            ) : pages.error ? (
              <ErrorState
                error={pages.error}
                retry={() => void pages.refresh()}
              />
            ) : (
              <Empty
                kind="work"
                description={
                  needle
                    ? "Try a different task name or clear your search."
                    : "Authorized tasks will appear here when work is assigned to this project."
                }
                action={
                  needle ? (
                    <Button variant="outline" onPress={() => setQuery("")}>
                      Clear search
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onPress={() => void pull.refresh()}
                    >
                      Refresh project
                    </Button>
                  )
                }
                title={
                  needle
                    ? "No tasks match this search"
                    : "No tasks in this project"
                }
              />
            )}
          </Animated.View>
        )
      }
      ListFooterComponent={
        !searchPending && pages.next && !pages.error ? (
          <Animated.View
            style={[
              {
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              },
              main && [{ width: tableViewport }, pinned],
            ]}
          >
            {pages.moreError ? (
              <ErrorState
                error="Couldn't load more tasks."
                retry={() => void pages.loadMore(true)}
              />
            ) : pages.loadingMore ? (
              <Text
                accessibilityRole="progressbar"
                accessibilityLiveRegion="polite"
                style={{ color: palette.mutedLabel }}
              >
                Loading more tasks…
              </Text>
            ) : null}
          </Animated.View>
        ) : undefined
      }
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingVertical: pageGutter,
        paddingHorizontal: main ? 0 : pageGutter,
      }}
      renderSectionHeader={({ section }) => {
        const accent = (main && accents.get(section.key)) || palette.primary;
        return (
          <View>
            <Animated.View
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 16,
                  paddingBottom: 8,
                },
                main && [{ width: tableViewport }, pinned],
              ]}
            >
              <View
                style={{
                  width: 4,
                  height: 18,
                  borderRadius: 2,
                  backgroundColor: accent,
                }}
              />
              <Text
                accessibilityRole="header"
                style={{
                  flexShrink: 1,
                  color: palette.text,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {view === "calendar" && section.key
                  ? /^\d{4}-\d{2}-\d{2}$/.test(section.key)
                    ? taskDateLabel(section.key)
                    : section.title
                  : main
                    ? `Group: ${section.title}`
                    : section.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: palette.mutedLabel,
                }}
              >
                {section.data.length}
                {pages.next ? " loaded" : ""}
              </Text>
            </Animated.View>
            {main && (
              <ProjectTableCells
                widths={widths}
                accent={accent}
                pinStyle={pinned}
              />
            )}
          </View>
        );
      }}
      renderItem={({ item, index, section }) => {
        const open = () =>
          navigate({
            name: "task",
            id: item.id,
            projectId: id,
            title: item.title,
          });
        if (main)
          return (
            <ProjectTableCells
              widths={widths}
              accent={accents.get(section.key) || palette.primary}
              task={item}
              pinStyle={pinned}
              financial={finance.error ? undefined : finance.data?.get(item.id)}
              onOpen={open}
            />
          );
        const due = item.deadline || item.dueDate;
        return (
          <MondayTableRow
            title={item.title}
            status={item.status}
            due={due ? taskDateLabel(due) : null}
            assignee={item.assigneeName || null}
            isLast={index === section.data.length - 1}
            onPress={open}
          />
        );
      }}
    />
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: palette.background }}
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
    >
      {auxiliary ? (
        <Screen compact onRefresh={refresh}>
          {header}
          {view === "offices" && (
            <ProjectOffices project={project} canManage={false} />
          )}
          {view === "files" && (
            <ProjectFiles
              projectId={id}
              onManage={() =>
                navigate({
                  name: "project",
                  id,
                  view: "file_management",
                  title: "File management",
                })
              }
            />
          )}
          {view === "funding" && (
            <ProjectFundingSummary
              key={profile?.id + ":" + id}
              projectId={id}
              showCloseout={profile?.role === "head" && !closed}
            />
          )}
        </Screen>
      ) : (
        <FolderPullArea
          pull={pull}
          frame={
            main
              ? (scroll) => (
                  <Animated.ScrollView
                    style={{ marginHorizontal: pageGutter }}
                    horizontal
                    nestedScrollEnabled
                    directionalLockEnabled
                    bounces={false}
                    scrollEnabled={hasTable && tableWidth > tableViewport}
                    keyboardShouldPersistTaps="handled"
                    onScroll={trackHorizontal}
                    scrollEventThrottle={16}
                  >
                    <View
                      style={{
                        // Keep the scroll bounds stable when search temporarily hides every row.
                        width: tableWidth,
                      }}
                    >
                      {scroll}
                    </View>
                  </Animated.ScrollView>
                )
              : undefined
          }
        >
          {list}
        </FolderPullArea>
      )}
      <SelectionSheet
        open={menu}
        title="Project options"
        options={tools}
        onClose={() => setMenu(false)}
        onSelect={(option) => {
          setMenu(false);
          if (option === "people") setPeople(true);
          else if (option === "messages")
            navigate({
              name: "messages",
              projectId: id,
              title: "Project conversations",
            });
          else if (["offices", "files", "funding"].includes(option))
            setView(option);
          else
            navigate({
              name: "project",
              id,
              view: option,
              title: project.title,
            });
        }}
      />
      {addTask && <ProjectTaskEditor scope={taskScope} groups={groups} onClose={() => setAddTask(false)} onSaved={refresh} />}
      {people && (
        <ProjectPeople
          project={project}
          onClose={() => setPeople(false)}
          onManage={() => {
            setPeople(false);
            navigate({
              name: "project",
              id,
              view: "people_management",
              title: "Project people",
            });
          }}
        />
      )}
    </View>
  );
}
