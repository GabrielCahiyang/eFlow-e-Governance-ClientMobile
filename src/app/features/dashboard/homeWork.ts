import type { WorkRow } from "../../../core/web/app/features/personal-work/types";
import type { WorkspaceSnapshot } from "../../../core/web/app/features/workspaces/types";
import {
  selectNodeWorkCapability,
  selectRootWorkCapability,
} from "../../../core/web/app/features/nested-work/selectors/capabilities";
import {
  workDay,
  workDateLabel,
} from "../../../core/web/app/shared/workCalendar";
import { workScope } from "../tasks/branchInspector";
import { workDestination } from "../personal-work/workDestination";
import { getTaskLeadId } from "../../../core/web/app/features/tasks/selectors/teamMembership";

const open = (row: WorkRow) =>
  !row.history && !["completed", "done", "cancelled"].includes(row.status);
const awaiting = (row: WorkRow) =>
  ["for_review", "submitted"].includes(row.status);
const day = (row: WorkRow) => workDay(row.due, row.timezone);
const overdue = (row: WorkRow, now: Date) => {
  const due = day(row),
    today = workDay(now, row.timezone);
  return due != null && today != null && due < today;
};

export function assignmentActionable(row: WorkRow, actor: string) {
  if (
    !row.mine ||
    !row.leading ||
    !row.actionable ||
    !open(row) ||
    awaiting(row)
  )
    return false;
  if (row.kind.endsWith("-node"))
    return (
      !!row.tree &&
      !!row.node &&
      row.node.lead_id === actor &&
      (["execute", "submit"] as const).some(
        (action) =>
          selectNodeWorkCapability(
            row.tree,
            row.id,
            action,
            workScope(row.tree!, actor),
          ).allowed,
      )
    );
  if (row.kind === "office-task")
    return (
      !!row.task &&
      getTaskLeadId(row.task) === actor &&
      row.tree?.root.open !== false &&
      ["todo", "in_progress", "changes_requested"].includes(row.status)
    );
  return (
    !!row.personalTask &&
    row.personalTask.lead_id === actor &&
    row.personal?.project.status === "active" &&
    ["todo", "in_progress"].includes(row.status)
  );
}

export function homeWorkRow(row: WorkRow, detail: string) {
  return {
    key: row.key,
    title: row.title,
    description: [
      detail,
      row.projectTitle || row.workspaceName,
      row.relation.replace("Subitem Lead", "Subtask Lead"),
      day(row) != null
        ? "Due " + workDateLabel(row.due, row.timezone)
        : undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    route: workDestination(row),
  };
}

export function memberHome(
  rows: WorkRow[],
  actor: string,
  workspace: string,
  now = new Date(),
) {
  const own = rows.filter(
    (row) =>
      row.mine &&
      row.workspaceId === workspace &&
      open(row) &&
      (!row.kind.startsWith("personal-") || !!row.projectId),
  );
  const executable = own.filter((row) => assignmentActionable(row, actor));
  const isToday = (row: WorkRow) =>
    day(row) != null && day(row) === workDay(now, row.timezone);
  const rank = (row: WorkRow) =>
    row.status === "changes_requested"
      ? 0
      : overdue(row, now)
        ? 1
        : isToday(row)
          ? 2
          : row.blocker?.trim()
            ? 3
            : 4;
  return {
    priorities: executable
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (day(a) ?? Infinity) - (day(b) ?? Infinity) ||
          a.key.localeCompare(b.key),
      )
      .slice(0, 5)
      .map((row) =>
        homeWorkRow(
          row,
          [
            "Changes requested",
            "Overdue",
            "Due today",
            "Blocker reported",
            "Action required",
          ][rank(row)],
        ),
      ),
    waiting: own
      .filter(
        (row) =>
          awaiting(row) ||
          (!assignmentActionable(row, actor) && row.blocker?.trim()),
      )
      .sort(
        (a, b) =>
          (day(a) ?? Infinity) - (day(b) ?? Infinity) ||
          a.key.localeCompare(b.key),
      )
      .slice(0, 5)
      .map((row) =>
        homeWorkRow(
          row,
          awaiting(row) ? "Awaiting review" : "Blocker reported",
        ),
      ),
    overdue: executable.filter((row) => overdue(row, now)).length,
    today: executable.filter(isToday).length,
    awaiting: own.filter(awaiting).length,
  };
}

export function officeHomeWork(
  rows: WorkRow[],
  scope: WorkspaceSnapshot | undefined,
  actor: string,
  now = new Date(),
) {
  const risk = new Map<string, Set<string>>();
  const relevantProjects = new Set<string>();
  if (!scope)
    return { attention: [], risk, relevantProjects, overdueOrBlocked: 0 };
  const projectIds = new Set(
    scope.projects
      .filter((project) => project.kind === "office")
      .map((project) => project.id),
  );
  const candidates = rows.filter(
    (row) =>
      row.kind.startsWith("office-") &&
      open(row) &&
      (row.tree?.root.office ?? row.task?.orgId) ===
        scope.workspace.office_id &&
      (row.projectId
        ? projectIds.has(row.projectId)
        : row.workspaceId === scope.workspace.id),
  );
  const attention = candidates.flatMap((row) => {
    const blocked = !!row.blocker?.trim();
    const late = !awaiting(row) && overdue(row, now);
    if (row.projectId) relevantProjects.add(row.projectId);
    if (row.projectId && (blocked || late)) {
      const signals = risk.get(row.projectId) ?? new Set<string>();
      if (blocked) signals.add("Blocked work");
      if (late) signals.add("Overdue work");
      risk.set(row.projectId, signals);
    }
    const tree = row.tree;
    const appoint =
      !!tree &&
      (row.kind === "office-node"
        ? selectNodeWorkCapability(
            tree,
            row.id,
            "appoint_lead",
            workScope(tree, actor),
          ).allowed
        : selectRootWorkCapability(tree, "appoint_lead", workScope(tree, actor))
            .allowed);
    const needsLead = appoint && row.relation === "Needs reassignment";
    if (!needsLead && !blocked && !late) return [];
    const assignedToHead = assignmentActionable(row, actor);
    const detail = needsLead
      ? "Action required · Assign a lead"
      : (assignedToHead ? "Action required · " : "Waiting on others · ") +
        (blocked ? "Blocker reported" : "Overdue work");
    return [
      {
        ...homeWorkRow(row, detail),
        priority:
          assignedToHead && late
            ? 0
            : needsLead || assignedToHead
              ? 2
              : blocked
                ? 3
                : 4,
        sort: day(row) ?? Number.MAX_SAFE_INTEGER,
      },
    ];
  });
  return {
    attention,
    risk,
    relevantProjects,
    overdueOrBlocked: candidates.filter(
      (row) => !!row.blocker?.trim() || (!awaiting(row) && overdue(row, now)),
    ).length,
  };
}

export function currentOfficeProjects(
  scope: WorkspaceSnapshot,
  risk: ReadonlyMap<string, ReadonlySet<string>>,
  relevantProjects: ReadonlySet<string> = new Set(),
) {
  return scope.projects
    .filter(
      (project) =>
        project.kind === "office" &&
        !project.shortcut &&
        (project.home_workspace_id === scope.workspace.id ||
          relevantProjects.has(project.id) ||
          ("org_id" in project &&
            project.org_id === scope.workspace.office_id)) &&
        !["completed", "archived", "cancelled"].includes(project.status),
    )
    .sort(
      (a, b) =>
        Number(risk.has(b.id)) - Number(risk.has(a.id)) ||
        Number(b.status === "on_hold") - Number(a.status === "on_hold") ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    );
}
