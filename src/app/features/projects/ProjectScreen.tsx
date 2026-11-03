import { ProjectFundingCloseout } from "./ProjectFundingCloseout";
import { supabase } from "../../../platform/supabase";
import { DeliveryAnalytics } from "../analytics";
import { Text } from "../../components/ui/Typography";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "../../components/ui/Primitives";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import MoreHorizontal from "lucide-react-native/icons/ellipsis";
import Plus from "lucide-react-native/icons/plus";
import Star from "lucide-react-native/icons/star";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Sheet,
  Status,
  Tabs,
  colors,
  dateLabel,
  peso,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import type { Navigate } from "../../shared/routes";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { fetchProject, fetchProjectTasks } from "./services";
import {
  fetchProjectGroups,
  createProjectGroup,
  createWorkspaceTask,
  deleteProjectGroup,
  updateProjectGroup,
} from "../../../core/web/app/features/project-table/services/workspaceService";
import { tasksInGroup } from "../../../core/web/app/features/project-table/selectors";
import {
  PROJECT_COLUMNS,
  type ProjectGroup,
} from "../../../core/web/app/features/project-table/types";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { fetchDepartmentBudgetBundle } from "../../../core/web/app/features/budget/services/budgetService";
import {
  ProjectTaskTable,
  ProjectBoard,
  ProjectCalendar,
  ProjectGantt,
} from "./ProjectTaskViews";
import { ProjectPublication } from "../project-publication";
import { ProjectSettings } from "./ProjectSettings";
import { ProjectReadinessSheet } from "./ProjectReadinessSheet";
import { ProjectPeople } from "./ProjectPeople";
import { ProjectOffices } from "./ProjectOffices";
import { ProjectFiles } from "./ProjectFiles";
import { netProjectUpdates } from "./subscriptions";
import { ProjectAccess } from "./ProjectAccess";
import { Milestones } from "./Milestones";
import { ProjectViewTools } from "./ProjectViewTools";
import { PdfImportSheet } from "./import/PdfImportSheet";
import { OrderList } from "../../components/ui/OrderList";
import { reorderWorkspaceTasks } from "../../../core/web/app/features/project-table/services/workspaceService";
const views = [
  { id: "tasks", label: "Main table" },
  { id: "board", label: "Board" },
  { id: "gantt", label: "Gantt" },
  { id: "calendar", label: "Calendar" },
  { id: "dashboard", label: "Project Dashboard" },
  { id: "analytics", label: "Analytics" },
  { id: "offices", label: "Offices" },
  { id: "files", label: "Files" },
  { id: "milestones", label: "Milestones" },
  { id: "sharing", label: "Sharing & invitations" },
  { id: "settings", label: "Settings" },
  { id: "funding", label: "Funding" },
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
  const { profile, organization } = useAuth(),
    workspace = useWorkspace();
  const facts = useFacts("project:" + profile?.id + ":" + id, async () => {
    const [project, tasks, groups] = await Promise.all([
      fetchProject(id),
      fetchProjectTasks(id),
      fetchProjectGroups(id),
    ]);
    return { project, tasks, groups };
  });
  const [view, setView] = useState(initialView || "tasks"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [owner, setOwner] = useState(""),
    [sort, setSort] = useState("manual"),
    [hidden, setHidden] = useState<string[]>([]),
    [collapse, setCollapse] = useState(new Set<string>()),
    [groupOpen, setGroupOpen] = useState(false),
    [groupName, setGroupName] = useState(""),
    [taskGroup, setTaskGroup] = useState(""),
    [taskName, setTaskName] = useState(""),
    [groupEdit, setGroupEdit] = useState<ProjectGroup>(),
    [groupColor, setGroupColor] = useState("#087f8c"),
    [readiness, setReadiness] = useState<"setup" | "complete">(),
    [people, setPeople] = useState(false);
  const [ordering, setOrdering] = useState<ProjectGroup>();
  const [importing, setImporting] = useState(initialView === "import");
  const action = useAction();
  const data = facts.data,
    project = data?.project,
    closed = !!project && ["completed", "archived"].includes(project.status);
  const canManage =
    !!project &&
    profile?.org_id === project.orgId &&
    isAppointedOfficeHead(profile, organization ? [organization] : []);
  const setup = useFacts(
    "project-setup-gate:" + profile?.id + ":" + id,
    async () => {
      const { data, error } = await supabase.rpc("project_flow_snapshot", {
        p_project: id,
      });
      if (error) throw new Error(error.message);
      return data as { ready: boolean };
    },
    !!project && project.status === "planning",
  );
  const setupReady =
    project?.status !== "planning" || setup.data?.ready === true;
  const favorite = useNavigationFavorites(
    profile?.id || "",
    workspace.selected?.workspace.id || "",
    workspace.selected?.projects.map((p) => p.id) || [id],
    !!workspace.selected,
  );
  useEffect(
    () =>
      netProjectUpdates(id, () => {
        void facts.refresh();
        void setup.refresh();
      }),
    [id, profile?.id, setup.refresh],
  );
  const visible = useMemo(() => {
    const rank = { high: 0, medium: 1, low: 2 };
    return (data?.tasks || [])
      .filter(
        (t) =>
          (closed || !t.archivedAt) &&
          (!query ||
            (t.title + " " + t.description + " " + t.assigneeName)
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!status || t.status === status) &&
          (!owner || t.assigneeId === owner),
      )
      .sort((a, b) =>
        sort === "title"
          ? a.title.localeCompare(b.title)
          : sort === "deadline"
            ? (a.deadline || a.dueDate || "9999").localeCompare(
                b.deadline || b.dueDate || "9999",
              )
            : sort === "priority"
              ? rank[a.priority || "medium"] - rank[b.priority || "medium"]
              : (a.workspacePosition || 0) - (b.workspacePosition || 0),
      );
  }, [data?.tasks, query, status, owner, sort, closed]);
  const budget = useFacts(
    "project-budget:" + id + ":" + project?.orgId,
    () =>
      fetchDepartmentBudgetBundle(project!.orgId!, new Date().getFullYear()),
    !!project?.orgId && view === "dashboard",
  );
  if (facts.loading && !data)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (facts.error || !project || !data)
    return (
      <Screen>
        <ErrorState
          error={facts.error || "Project unavailable."}
          retry={() => void facts.refresh()}
        />
      </Screen>
    );
  const completed = data.tasks.filter((t) => t.status === "completed").length,
    required = data.tasks.filter((t) => t.status !== "cancelled").length;
  const addGroup = () =>
    action.run(async () => {
      if (!groupName.trim()) throw new Error("Group name is required.");
      if (groupEdit)
        await updateProjectGroup(groupEdit.id, {
          title: groupName.trim(),
          color: groupColor,
        });
      else await createProjectGroup(id, groupName, data.groups.length);
      setGroupOpen(false);
      setGroupName("");
      setGroupEdit(undefined);
      await facts.refresh();
    });
  const addTask = () =>
    action.run(async () => {
      if (!taskName.trim()) throw new Error("Task title is required.");
      const result = await createWorkspaceTask(id, taskGroup, taskName);
      setTaskGroup("");
      setTaskName("");
      await facts.refresh();
      navigate({ name: "task", id: result.id, projectId: id });
    });
  return (
    <Screen
      title={project.title}
      description={organization?.name || "Project workspace"}
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
      actions={
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Favorite project"
          accessibilityState={{ checked: favorite.favorites.has(id) }}
          onPress={() => favorite.toggle(id)}
          style={{ padding: 12 }}
        >
          <Star
            size={22}
            color={colors.primary}
            fill={favorite.favorites.has(id) ? colors.primary : "transparent"}
          />
        </Pressable>
      }
    >
      <Row>
        <Status value={project.status} />
        <Text style={{ color: colors.muted }}>
          {completed}/{required} tasks completed ·{" "}
          {required ? Math.round((completed * 100) / required) : 0}%
        </Text>
      </Row>
      <Row>
        <Button variant="outline" onPress={() => setPeople(true)}>
          People
        </Button>
        {!!(canManage && !closed && setupReady) && (
          <>
            <Button variant="outline" onPress={() => setImporting(true)}>
              Import PDF
            </Button>
            {!!(project.status !== "active") && (
              <Button variant="outline" onPress={() => setReadiness("setup")}>
                Setup & activation
              </Button>
            )}
            <Button variant="outline" onPress={() => setReadiness("complete")}>
              Completion requirements
            </Button>
          </>
        )}
        <Button variant="outline" onPress={() => setView("settings")}>
          Project settings
        </Button>
      </Row>
      {project.status === "archived" && (
        <ProjectPublication projectId={id} canPublish={canManage} />
      )}
      {!!closed && (
        <Notice>
          {project.status === "archived" ? "Archived" : "Completed"} project
          details are read-only. History and reports remain available.
        </Notice>
      )}
      {canManage && !setupReady && (
        <Notice>
          Finish project setup in Project settings before adding work or
          importing a plan.
        </Notice>
      )}
      <Tabs items={views} value={view} onChange={setView} />
      <ProjectViewTools
        project={id}
        title={project.title}
        tasks={visible}
        current={{ view, query, status, owner, sort, hidden }}
        onApply={(v) => {
          setView(v.view);
          setQuery(v.query);
          setStatus(v.status);
          setOwner(v.owner);
          setSort(v.sort);
          setHidden(v.hidden);
        }}
      />
      {view === "milestones" && (
        <Milestones
          project={id}
          tasks={data.tasks}
          editable={canManage && !closed}
          onTasksChanged={facts.refresh}
        />
      )}
      {view === "sharing" && (
        <ProjectAccess project={id} onSaved={facts.refresh} />
      )}
      {!!["tasks", "board", "gantt", "calendar"].includes(view) && (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search project tasks"
          />
          <Row>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Choice
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "", label: "All statuses" },
                  ...[
                    "pending_assignment",
                    "todo",
                    "in_progress",
                    "for_review",
                    "changes_requested",
                    "completed",
                    "cancelled",
                  ].map((value) => ({
                    value,
                    label: value.replaceAll("_", " "),
                  })),
                ]}
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Choice
                label="Sort tasks"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "manual", label: "Manual order" },
                  { value: "title", label: "Task name" },
                  { value: "deadline", label: "Due date" },
                  { value: "priority", label: "Priority" },
                ]}
              />
            </View>
          </Row>
          <Choice
            label="Task owner"
            value={owner}
            onChange={setOwner}
            options={[
              { value: "", label: "All task owners" },
              ...[
                ...new Map(
                  data.tasks
                    .filter((t) => t.assigneeId)
                    .map((t) => [
                      t.assigneeId!,
                      t.assigneeName || "Project person",
                    ]),
                ).entries(),
              ].map(([value, label]) => ({ value, label })),
            ]}
          />
        </>
      )}
      {!!(view === "tasks") && (
        <>
          <Choice
            label="Visible columns"
            multiple
            value={PROJECT_COLUMNS.filter((c) => !hidden.includes(c.id)).map(
              (c) => c.id,
            )}
            options={PROJECT_COLUMNS.map((c) => ({
              value: c.id,
              label: c.label,
            }))}
            onChange={(ids: string[]) =>
              setHidden(
                PROJECT_COLUMNS.filter((c) => !ids.includes(c.id)).map(
                  (c) => c.id,
                ),
              )
            }
          />
          {!!(canManage && !closed && setupReady) && (
            <Button
              icon={<Plus size={18} color="#fff" />}
              onPress={() => {
                setGroupEdit(undefined);
                setGroupName("");
                setGroupOpen(true);
              }}
            >
              New group
            </Button>
          )}
          {data.groups.map((group) => (
            <Card key={group.id}>
              <Row>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    (collapse.has(group.id) ? "Expand " : "Collapse ") +
                    group.title
                  }
                  onPress={() =>
                    setCollapse((prev) => {
                      const next = new Set(prev);
                      next.has(group.id)
                        ? next.delete(group.id)
                        : next.add(group.id);
                      return next;
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {collapse.has(group.id) ? (
                    <ChevronDown color={group.color} />
                  ) : (
                    <ChevronUp color={group.color} />
                  )}
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 18,
                      color: colors.text,
                    }}
                  >
                    {group.title}
                  </Text>
                  <Text style={{ color: colors.muted }}>
                    {tasksInGroup(visible, group).length} tasks
                  </Text>
                </Pressable>
                {!!(canManage && !closed && setupReady) && (
                  <Button
                    variant="ghost"
                    accessibilityLabel={"Edit group " + group.title}
                    onPress={() => {
                      setGroupEdit(group);
                      setGroupName(group.title);
                      setGroupColor(group.color);
                      setGroupOpen(true);
                    }}
                    icon={<MoreHorizontal size={19} color={colors.text} />}
                  >
                    Actions
                  </Button>
                )}
              </Row>
              {!collapse.has(group.id) && (
                <ProjectTaskTable
                  tasks={tasksInGroup(visible, group)}
                  navigate={navigate}
                  columns={PROJECT_COLUMNS.filter(
                    (c) => !hidden.includes(c.id),
                  ).map((c) => c.id)}
                />
              )}
              {!!(canManage && !closed && setupReady) && (
                <Button variant="outline" onPress={() => setOrdering(group)}>
                  Reorder tasks
                </Button>
              )}
              {!!(canManage && !closed && setupReady) && (
                <Button
                  variant="ghost"
                  icon={<Plus size={17} color={colors.primary} />}
                  onPress={() => setTaskGroup(group.id)}
                >
                  Add task
                </Button>
              )}
            </Card>
          ))}
          {!data.groups.length && (
            <Empty
              title="No groups yet"
              description="Create a group to organize this project's work."
            />
          )}
        </>
      )}
      {!!(view === "board") && (
        <ProjectBoard tasks={visible} navigate={navigate} />
      )}
      {!!(view === "gantt") && (
        <ProjectGantt tasks={visible} project={project} navigate={navigate} />
      )}
      {!!(view === "calendar") && (
        <ProjectCalendar
          tasks={visible}
          project={project}
          navigate={navigate}
        />
      )}
      {!!(view === "offices") && (
        <ProjectOffices project={project} canManage={canManage} />
      )}
      {!!(view === "files") && <ProjectFiles projectId={id} />}
      {view === "funding" && (
        <ProjectFundingCloseout
          key={profile?.id + ":" + id}
          projectId={id}
          readOnly={closed}
        />
      )}
      {!!(view === "settings") && (
        <ProjectSettings
          key={project.metadataVersion}
          project={project}
          canManage={canManage}
          onSaved={async () => {
            await Promise.all([facts.refresh(), setup.refresh()]);
          }}
          onDeleted={() => navigate({ name: "projects" })}
        />
      )}
      {view === "analytics" && (
        <DeliveryAnalytics tasks={data.tasks} navigate={navigate} />
      )}
      {!!(view === "dashboard") && (
        <>
          <Card title="Project overview">
            <LabelValue label="All tasks" value={data.tasks.length} />
            <LabelValue label="Completed" value={completed} />
            <LabelValue
              label="Overall completion"
              value={`${required ? Math.round((completed * 100) / required) : 0}%`}
            />
            <LabelValue
              label="Start date"
              value={dateLabel(project.startDate)}
            />
            <LabelValue
              label="Target date"
              value={dateLabel(project.targetDate)}
            />
          </Card>
          <Card title="Budget utilization">
            {budget.error ? (
              <ErrorState
                error={budget.error}
                retry={() => void budget.refresh()}
              />
            ) : budget.data ? (
              <>
                <LabelValue
                  label="Authorized task funding"
                  value={peso(
                    budget.data.allocations
                      .filter(
                        (a) =>
                          data.tasks.some((t) => t.id === a.taskId) &&
                          a.status === "approved",
                      )
                      .reduce((n, a) => n + a.amount, 0),
                  )}
                />
                <LabelValue
                  label="Settled spending"
                  value={peso(
                    budget.data.requests
                      .filter(
                        (r) =>
                          r.status === "settled" &&
                          data.tasks.some((t) => t.id === r.taskId),
                      )
                      .reduce((n, r) => n + (r.actualSpent || 0), 0),
                  )}
                />
              </>
            ) : (
              <Loading />
            )}
          </Card>
        </>
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {importing && setupReady && (
        <PdfImportSheet
          project={id}
          title={project.title}
          onClose={() => {
            setImporting(false);
            setView("tasks");
          }}
          onImported={facts.refresh}
        />
      )}
      <Sheet
        open={!!ordering}
        title={"Order tasks · " + (ordering?.title || "")}
        onClose={() => setOrdering(undefined)}
        busy={action.busy}
      >
        <OrderList
          items={
            ordering
              ? tasksInGroup(data.tasks, ordering).map((t) => ({
                  id: t.id,
                  label: t.title,
                }))
              : []
          }
          busy={action.busy}
          onSave={async (ids) => {
            await action.run(async () => {
              await reorderWorkspaceTasks(id, ordering!.id, ids);
              setOrdering(undefined);
              await facts.refresh();
            });
          }}
        />
      </Sheet>
      <Sheet
        open={groupOpen}
        title={groupEdit ? "Group settings" : "New group"}
        onClose={() => setGroupOpen(false)}
        busy={action.busy}
        footer={
          <Button busy={action.busy} onPress={() => void addGroup()}>
            Save group
          </Button>
        }
      >
        <Field
          label="Group name"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Choice
          label="Group color"
          value={groupColor}
          onChange={setGroupColor}
          options={[
            { value: "#087f8c", label: "Teal" },
            { value: "#579bfc", label: "Blue" },
            { value: "#00b97d", label: "Green" },
            { value: "#8b6be8", label: "Purple" },
          ]}
        />
        {!!groupEdit && (
          <Button
            variant="danger"
            onPress={() =>
              void action.run(async () => {
                if (
                  !(await confirmAction(
                    "Delete group?",
                    "The current tasks and history are checked by the server before deletion.",
                    "Delete group",
                    true,
                  ))
                )
                  return;
                await deleteProjectGroup(groupEdit.id);
                setGroupOpen(false);
                await facts.refresh();
              })
            }
          >
            Delete group
          </Button>
        )}
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
      <Sheet
        open={!!taskGroup}
        title="New task"
        onClose={() => setTaskGroup("")}
        busy={action.busy}
        footer={
          <Button busy={action.busy} onPress={() => void addTask()}>
            Create task
          </Button>
        }
      >
        <Field label="Task title" value={taskName} onChangeText={setTaskName} />
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
      {!!readiness && (
        <ProjectReadinessSheet
          project={project}
          mode={readiness}
          canManage={canManage}
          onClose={() => setReadiness(undefined)}
          onSaved={facts.refresh}
        />
      )}
      {!!people && (
        <ProjectPeople
          project={project}
          onClose={() => setPeople(false)}
          onSaved={facts.refresh}
        />
      )}
    </Screen>
  );
}
