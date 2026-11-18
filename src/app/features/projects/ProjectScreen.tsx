import { useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Calendar from "lucide-react-native/icons/calendar";
import ListIcon from "lucide-react-native/icons/list";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Star from "lucide-react-native/icons/star";
import TableIcon from "lucide-react-native/icons/table";
import { useNavigationHeader } from "../navigation/navigationHeaderContext";
import {
  AllocationBar,
  Button,
  Card,
  DetailGroup,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  PageHeader,
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
import { BentoActionButtons } from "../tasks/TaskBentoComponents";
import {
  PostCreateStaffingSheet,
  resolvePostCreateTaskStaffing,
  type PostCreateStaffingTarget,
} from "../tasks/PostCreateStaffingSheet";
import { ProjectTaskEditor, useTaskStructure } from "./ProjectTaskEditor";
import { readProjectSetup } from "./projectAccess";
import { ProjectAnalysisSummary } from "./ProjectAnalysisSummary";
import { ProjectPeople } from "./ProjectPeople";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectOffices } from "./ProjectOffices";
import { ProjectAuditTrail } from "./ProjectAuditTrail";
import { ProjectCloseoutSheet } from "./ProjectCloseoutSheet";
import { ProjectFundingCloseout } from "./ProjectFundingCloseout";
import { ProjectFundingSummary } from "./ProjectFundingSummary";
import { taskSections, type ProjectWorkView } from "./mobileProjects";
import { useWorkStatus } from "../../shared/workStatusPresentation";
import { workDisplayStatus } from "../../shared/statusLabels";
import { completionPercent } from "../../shared/completion";
import { fetchProjectTaskFinance } from "./projectTaskFinance";
import { fetchProjectTaskBlockers } from "./projectTaskBlockers";
import {
  ProjectTableCells,
  ProjectTableLoading,
  ProjectTaskCard,
  projectTableWidth,
  projectTableWidths,
} from "./ProjectTableCells";

const views = [
  { id: "tasks", label: "Main table" },
  { id: "board", label: "Board" },
  { id: "calendar", label: "Agenda" },
  { id: "analysis", label: "Analysis" },
  { id: "audit_trail", label: "Audit Trail" },
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
  { id: "audit_trail", title: "Audit Trail" },
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
  const navHeader = useNavigationHeader();
  const palette = useTheme();
  const resolveStatus = useWorkStatus();
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
  const [mainViewMode, setMainViewMode] = useState<"cards" | "table">("cards");
  const [closeout, setCloseout] = useState<"complete" | "archive">();
  const [menu, setMenu] = useState(false);
  const [people, setPeople] = useState(false);
  const [addTask, setAddTask] = useState(false);
  const [postCreateStaffing, setPostCreateStaffing] =
    useState<PostCreateStaffingTarget>();
  const postCreateStaffingRequest = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    postCreateStaffingRequest.current += 1;
    setPostCreateStaffing(undefined);
  }, [scope]);
  const [query, setQuery] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const workView: ProjectWorkView =
    view === "board" || view === "calendar" ? view : "tasks";
  const main = workView === "tasks";
  const auxiliary = [
    "offices",
    "files",
    "funding",
    "analysis",
    "audit_trail",
  ].includes(view);
  const closed = ["completed", "archived"].includes(facts.data?.status ?? "");
  const needle = query.trim().toLowerCase();
  useEffect(() => {
    if (needle === serverSearch) return;
    const timer = setTimeout(() => setServerSearch(needle), needle ? 250 : 0);
    return () => clearTimeout(timer);
  }, [needle, serverSearch]);
  const searchPending = needle !== serverSearch;
  const setup = useFacts(
    "project-setup:" + scope,
    () => readProjectSetup(id),
    !!facts.data && !facts.error && !closed,
  );
  const projectReady =
    !!facts.data &&
    !facts.error &&
    (closed || (setup.data?.ready === true && !setup.error));
  const groupFacts = useFacts(
    "project-groups:" + scope,
    () => fetchProjectGroups(id),
    projectReady && main && !auxiliary,
  );
  const groups = groupFacts.error ? [] : (groupFacts.data ?? []);
  const taskScope = {
    actor: profile?.id || "",
    project: id,
    office: facts.data?.orgId || "",
  };
  const createAccess = useTaskStructure(
    taskScope,
    projectReady &&
      !!taskScope.office &&
      facts.data?.status === "active" &&
      profile?.role === "head" &&
      main &&
      !auxiliary,
  );
  const canAdd =
    createAccess.data === "head" &&
    !createAccess.error &&
    !facts.error &&
    !groupFacts.error &&
    !!facts.data &&
    !!groups.length;
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
  const blockers = useFacts(
    JSON.stringify(["project-table-blockers", scope, financeTaskIds]),
    () => fetchProjectTaskBlockers(financeTaskIds),
    projectReady &&
      !auxiliary &&
      !searchPending &&
      !pages.error &&
      !!financeTaskIds.length,
  );
  const refresh = useCallback(async () => {
    await Promise.all([
      facts.refresh(),
      setup.refresh(),
      createAccess.refresh(),
      groupFacts.refresh(),
      pages.refresh(),
      totals.refresh(),
      finance.refresh(),
      blockers.refresh(),
    ]);
  }, [
    facts.refresh,
    setup.refresh,
    createAccess.refresh,
    groupFacts.refresh,
    pages.refresh,
    totals.refresh,
    finance.refresh,
    blockers.refresh,
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
  }, [view, mainViewMode, id, projectReady, offsetX]);
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
  const workspaceId = workspace.selected?.workspace.id;
  const canCloseout =
    profile?.role === "head" &&
    profile.is_active !== false &&
    (profile.org_id === project.orgId ||
      !!project.sourceCollaborationDraftId) &&
    project.status !== "archived";
  const openWeb = (view: string, title: string) =>
    navigate({ name: "project", id, workspaceId, view, title });
  if (!projectReady && view !== "audit_trail") {
    return (
      <Screen title={project.title}>
        {setup.error ? (
          <ErrorState error={setup.error} retry={() => void setup.refresh()} />
        ) : !setup.data ? (
          <Loading label="Checking project setup" layout="project" />
        ) : (
          <Notice>
            Finish project details, lead, dates, and funding before adding tasks
            or people.
          </Notice>
        )}
      </Screen>
    );
  }
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
  const isTableMode = main && mainViewMode === "table";
  const hasTable = isTableMode && sections.length > 0;
  const accents = new Map(groups.map((group) => [group.id, group.color]));
  const completionSummary = completion
    ? `${completion.completed} of ${completion.required} · ${percent}%`
    : totals.error
      ? "Unavailable"
      : "Loading…";
  const header = (
    <View
      style={{
        gap: 12,
        marginBottom: 8,
        paddingTop:
          !auxiliary && navHeader?.topInset ? navHeader.topInset + 8 : 0,
      }}
    >
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
      <PageHeader
        title={project.title}
        subtitle={workspace.selected?.workspace.kind === "personal" ? workspace.selected.workspace.name : undefined}
        right={
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
        }
      />
      <Card style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Status value={project.status} variant="pill" work />
          {!!project.targetDate && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Calendar size={13} color={palette.mutedLabel} />
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: "600",
                  color: palette.mutedLabel,
                }}
              >
                Target {dateLabel(project.targetDate)}
              </Text>
            </View>
          )}
        </View>
        {completion ? (
          <AllocationBar
            label="Tasks completed"
            summary={completionSummary}
            percent={percent}
            tone={percent >= 100 ? "success" : "neutral"}
          />
        ) : (
          <DetailGroup>
            <LabelValue label="Tasks completed" value={completionSummary} />
          </DetailGroup>
        )}
      </Card>
      {closed && (
        <Notice>
          This project is read-only. Task history remains available.
        </Notice>
      )}
      <BentoActionButtons
        style={{ marginVertical: 0 }}
        actions={[
          {
            label: "Project options",
            variant: "secondary",
            icon: "sliders",
            onPress: () => setMenu(true),
          },
          canAdd && {
            label: "Add task",
            variant: "primary",
            icon: "plus",
            busy: createAccess.loading || groupFacts.loading,
            onPress: () => setAddTask(true),
          },
        ]}
      />
      {(!auxiliary || view === "analysis" || view === "audit_trail") && (
        <Tabs
          items={views}
          value={auxiliary ? view : main ? "tasks" : view}
          onChange={setView}
        />
      )}
      {!auxiliary && (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search project tasks"
        />
      )}
      {main && !auxiliary && !!sections.length && (
        <View style={projectStyles.modeBar}>
          <Text
            style={[projectStyles.modeLabel, { color: palette.mutedLabel }]}
          >
            TASKS
          </Text>
          <View
            accessibilityRole="tablist"
            accessibilityLabel="Tasks view mode"
            style={[
              projectStyles.segmentWrap,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Cards view"
              accessibilityState={{ selected: mainViewMode === "cards" }}
              onPress={() => setMainViewMode("cards")}
              style={[
                projectStyles.segmentBtn,
                mainViewMode === "cards" && {
                  backgroundColor: palette.primarySoft,
                },
              ]}
            >
              <ListIcon
                size={14}
                color={
                  mainViewMode === "cards"
                    ? palette.primaryDark
                    : palette.mutedLabel
                }
              />
              <Text
                style={[
                  projectStyles.segmentText,
                  {
                    color:
                      mainViewMode === "cards"
                        ? palette.primaryDark
                        : palette.mutedLabel,
                  },
                ]}
              >
                Cards
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Table view"
              accessibilityState={{ selected: mainViewMode === "table" }}
              onPress={() => setMainViewMode("table")}
              style={[
                projectStyles.segmentBtn,
                mainViewMode === "table" && {
                  backgroundColor: palette.primarySoft,
                },
              ]}
            >
              <TableIcon
                size={14}
                color={
                  mainViewMode === "table"
                    ? palette.primaryDark
                    : palette.mutedLabel
                }
              />
              <Text
                style={[
                  projectStyles.segmentText,
                  {
                    color:
                      mainViewMode === "table"
                        ? palette.primaryDark
                        : palette.mutedLabel,
                  },
                ]}
              >
                Table
              </Text>
            </Pressable>
          </View>
        </View>
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
        isTableMode ? (
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
          <View>
            {header}
            {main && !!finance.error && (
              <ErrorState
                error="Task budget and expense amounts are unavailable."
                retry={() => void finance.refresh()}
              />
            )}
          </View>
        )
      }
      ListEmptyComponent={
        main && (!groupFacts.data || groupFacts.error) ? undefined : (
          <Animated.View
            style={isTableMode && [{ width: tableViewport }, pinned]}
          >
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
                kind={needle ? "search" : "tasks"}
                description={
                  needle
                    ? "Try a different task name or clear your search."
                    : "Authorized tasks will appear here when work is assigned to this project."
                }
                action={
                  needle ? (
                    <Button
                      variant="outline"
                      icon={<RotateCcw size={15} color={palette.primary} />}
                      onPress={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : undefined
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
              isTableMode && [{ width: tableViewport }, pinned],
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
        paddingBottom: pageGutter + (navHeader?.bottomInset ?? 0),
        paddingHorizontal: isTableMode ? 0 : pageGutter,
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
                isTableMode && [{ width: tableViewport }, pinned],
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
                    : view === "board"
                      ? resolveStatus(section.key).label
                      : section.title}
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
                  {pages.next ? " loaded" : ""}
                </Text>
              </View>
            </Animated.View>
            {isTableMode && (
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
        const blocker = blockers.error ? undefined : blockers.data?.get(item.id);
        if (main) {
          const itemAccent = accents.get(section.key) || palette.primary;
          const itemFinance = finance.error
            ? undefined
            : finance.data?.get(item.id);
          if (mainViewMode === "cards") {
            return (
              <ProjectTaskCard
                accent={itemAccent}
                task={item}
                blocker={blocker}
                financial={itemFinance}
                onOpen={open}
              />
            );
          }
          return (
            <ProjectTableCells
              widths={widths}
              accent={itemAccent}
              task={item}
              blocker={blocker}
              pinStyle={pinned}
              financial={itemFinance}
              onOpen={open}
            />
          );
        }
        const due = item.deadline || item.dueDate;
        return (
          <MondayTableRow
            title={item.title}
            status={workDisplayStatus(item.status, blocker)}
            customStatusId={item.customStatusId}
            blocker={blocker}
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
          {view === "analysis" && (
            <ProjectAnalysisSummary
              project={project}
              onOpenWeb={() => openWeb("analytics", "Project analytics")}
            />
          )}
          {view === "audit_trail" && profile?.id && (
            <ProjectAuditTrail
              key={scope}
              actor={profile.id}
              project={id}
              timezone={workspace.selected?.workspace.timezone || "Asia/Manila"}
            />
          )}
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
            <>
              <ProjectFundingSummary
                key={profile?.id + ":" + id}
                projectId={id}
                workspaceId={workspaceId}
                showCloseout={canCloseout && !closed}
                navigate={navigate}
              />
              {!closed &&
                project.orgId &&
                profile?.id &&
                (canCloseout || project.projectLeadId === profile.id) && (
                  <ProjectFundingCloseout
                    key={scope}
                    actor={profile.id}
                    project={id}
                    office={project.orgId}
                    onChanged={refresh}
                  />
                )}
            </>
          )}
        </Screen>
      ) : (
        <FolderPullArea
          pull={pull}
          frame={
            isTableMode
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
        options={[
          ...tools,
          ...(canCloseout
            ? [
                {
                  id: "closeout",
                  title:
                    project.status === "completed"
                      ? "Archive project"
                      : "Complete project",
                },
              ]
            : []),
        ]}
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
          else if (option === "closeout")
            setCloseout(
              project.status === "completed" ? "archive" : "complete",
            );
          else if (
            ["offices", "files", "funding", "audit_trail"].includes(option)
          )
            setView(option);
          else
            openWeb(
              option,
              tools.find((tool) => tool.id === option)?.title ?? project.title,
            );
        }}
      />
      {closeout && canCloseout && profile?.id && (
        <ProjectCloseoutSheet
          key={scope + ":" + closeout}
          project={project}
          actor={profile.id}
          mode={closeout}
          workspaceId={workspaceId}
          navigate={navigate}
          onOpenFunding={() => {
            setCloseout(undefined);
            setView("funding");
          }}
          onClose={() => setCloseout(undefined)}
          onSaved={refresh}
        />
      )}
      {addTask && (
        <ProjectTaskEditor
          scope={taskScope}
          groups={groups}
          onClose={() => setAddTask(false)}
          onCreated={(created) => {
            const reqId = ++postCreateStaffingRequest.current;
            void resolvePostCreateTaskStaffing({
              taskId: created.id,
              title: created.title,
              actorId: profile?.id,
              readOnly: closed,
            }).then((target) => {
              if (
                !mountedRef.current ||
                postCreateStaffingRequest.current !== reqId ||
                !target
              ) {
                return;
              }
              setPostCreateStaffing(target);
            });
          }}
          onSaved={refresh}
        />
      )}
      {!!postCreateStaffing && (
        <PostCreateStaffingSheet
          key={`task:${postCreateStaffing.tree.root.id}`}
          target={postCreateStaffing}
          projectStatus={project.status}
          projectLeadId={project.projectLeadId}
          readOnly={closed}
          onClose={() => setPostCreateStaffing(undefined)}
          onSaved={refresh}
        />
      )}
      {people && (
        <ProjectPeople
          project={project}
          onClose={() => setPeople(false)}
          onManage={() => {
            setPeople(false);
            openWeb("people_management", "Manage project people");
          }}
        />
      )}
    </View>
  );
}

const projectStyles = StyleSheet.create({
  modeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modeLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  segmentWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
});
