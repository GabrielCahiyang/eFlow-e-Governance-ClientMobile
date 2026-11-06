import { useTheme } from "../../components/ui/Appearance";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useEffect, useState } from "react";
import {
  Pressable,
  SectionList,
  View,
  useWindowDimensions,
} from "react-native";
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
import { usePullRefresh } from "../../shared/usePullRefresh";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { fetchProject, fetchProjectTasks } from "./services";
import { fetchProjectGroups } from "../../../core/web/app/features/project-table/services/workspaceService";
import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { nativeWindow } from "../../../platform/webRuntime";
import { netProjectUpdates } from "./subscriptions";
import { ProjectPeople } from "./ProjectPeople";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectOffices } from "./ProjectOffices";
import { ProjectFundingSummary } from "./ProjectFundingSummary";
import { taskSections, type ProjectWorkView } from "./mobileProjects";
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
  const { profile, organization } = useAuth();
  const workspace = useWorkspace();
  const palette = useTheme();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const facts = useFacts("project:" + profile?.id + ":" + id, async () => {
    const [project, tasks, groups] = await Promise.all([
      fetchProject(id),
      fetchProjectTasks(id),
      fetchProjectGroups(id),
    ]);
    return { project, tasks, groups };
  });
  const pull = usePullRefresh(facts.refresh);
  const [view, setView] = useState(initialView || "tasks");
  const [menu, setMenu] = useState(false);
  const [people, setPeople] = useState(false);
  const [query, setQuery] = useState("");
  const main = !views.some((item) => item.id === view && item.id !== "tasks");
  const viewport = measuredWidth || windowWidth;
  const widths = projectTableWidths(viewport - 32, fontScale);
  const offsetX = useSharedValue(0);
  const trackHorizontal = useAnimatedScrollHandler((event) => {
    offsetX.set(Math.max(0, event.contentOffset.x));
  });
  // Keep project controls and group names in view while the cells pan together.
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.get() }],
  }));
  useEffect(() => {
    offsetX.set(0);
  }, [view, id, offsetX]);
  const favorites = useNavigationFavorites(
    profile?.id || "",
    workspace.selected?.workspace.id || "",
    workspace.selected?.projects.map((p) => p.id) || [],
    !!workspace.selected,
  );
  useEffect(() => {
    const refresh = () => void facts.refresh();
    const unsubscribe = netProjectUpdates(id, refresh);
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () => {
      unsubscribe();
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
    };
  }, [id, facts.refresh]);

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

  const { project, tasks, groups } = facts.data;
  const closed = ["completed", "archived"].includes(project.status);
  const work = tasks.filter((task) => closed || !task.archivedAt);
  const required = work.filter((task) => task.status !== "cancelled");
  const completed = required.filter(
    (task) => task.status === "completed",
  ).length;
  const percent = required.length
    ? Math.round((completed * 100) / required.length)
    : 0;
  const needle = query.trim().toLowerCase();
  const filtered = work.filter(
    (task) =>
      [task.title, task.description, task.assigneeName].some((value) =>
        value?.toLowerCase().includes(needle),
      ) || !needle,
  );
  const sections = taskSections(
    filtered,
    groups,
    views.some((item) => item.id === view)
      ? (view as ProjectWorkView)
      : "tasks",
  );
  const auxiliary = ["offices", "files", "funding"].includes(view);
  const hasTable = main && sections.length > 0;
  const accents = new Map(groups.map((group) => [group.id, group.color]));
  const header = (
    <View style={{ gap: 12, marginBottom: 8 }}>
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
          value={`${completed} of ${required.length} · ${percent}%`}
        />
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
    <SectionList
      nestedScrollEnabled
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(task) => task.id}
      ListHeaderComponent={
        main ? (
          <Animated.View style={[{ width: viewport - 32 }, pinned]}>
            {header}
            {!!sections.length && (
              <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                Swipe across the table to see more columns.
              </Text>
            )}
          </Animated.View>
        ) : (
          header
        )
      }
      ListEmptyComponent={
        <Animated.View style={main && [{ width: viewport - 32 }, pinned]}>
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
                <Button variant="outline" onPress={() => void pull.refresh()}>
                  Refresh project
                </Button>
              )
            }
            title={
              needle ? "No tasks match this search" : "No tasks in this project"
            }
          />
        </Animated.View>
      }
      refreshing={pull.refreshing}
      onRefresh={pull.refresh}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16 }}
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
                main && [{ width: viewport - 32 }, pinned],
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
                  ? dateLabel(section.key + "T00:00:00")
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
              </Text>
            </Animated.View>
            {main && <ProjectTableCells widths={widths} accent={accent} />}
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
              office={
                organization?.id === item.orgId
                  ? organization?.name || item.department
                  : item.department
              }
              onOpen={open}
            />
          );
        const due = item.deadline || item.dueDate;
        return (
          <MondayTableRow
            title={item.title}
            status={item.status}
            due={due ? dateLabel(due) : null}
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
        <Screen compact onRefresh={facts.refresh}>
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
              onManageFunding={() =>
                navigate({
                  name: "project",
                  id,
                  view: "funding_configuration",
                  title: "Project funding setup",
                })
              }
            />
          )}
        </Screen>
      ) : main ? (
        <Animated.ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          bounces={false}
          scrollEnabled={hasTable && projectTableWidth(widths) + 32 > viewport}
          keyboardShouldPersistTaps="handled"
          onScroll={trackHorizontal}
          scrollEventThrottle={16}
        >
          <View
            style={{
              // Keep the scroll bounds stable when search temporarily hides every row.
              width: projectTableWidth(widths) + 32,
            }}
          >
            {list}
          </View>
        </Animated.ScrollView>
      ) : (
        list
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
