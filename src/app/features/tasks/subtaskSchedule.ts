import {
  getPhilippineCalendarDate,
  isCalendarDate,
  scheduledDateError,
} from "../../../core/web/app/shared/calendarDates";
import type {
  WorkTreeSnapshot,
  WorkNode,
} from "../../../core/web/app/features/nested-work/types";
import type {
  WorkEditorBaseline,
  WorkEditorFields,
} from "../../../core/web/app/features/nested-work/types/editor";

export function subtaskScheduleError(
  tree: WorkTreeSnapshot,
  baseline: WorkEditorBaseline,
  fields: WorkEditorFields,
  today = getPhilippineCalendarDate(),
) {
  if (baseline.command !== "create" && baseline.command !== "edit") return "";
  const bounds = [tree.root.due];
  let parent = fields.parent;
  const seen = new Set<string>();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const ancestor = tree.nodes.find((node) => node.id === parent);
    if (!ancestor) break;
    bounds.push(ancestor.due_date);
    parent = ancestor.parent_subtask_id || "";
  }
  const latest = bounds
    .filter((date): date is string => !!date && isCalendarDate(date))
    .sort()[0];
  return scheduledDateError(fields.due, {
    original: baseline.command === "edit" ? baseline.fields.due : "",
    earliest:
      baseline.command === "create" && latest && latest < today
        ? latest
        : today,
    latest,
    label: "Subtask due date",
  });
}

type ScheduledNode = WorkNode & {
  start_date?: string | null;
  started_at?: string | null;
  effective_status?: WorkNode["status"];
};

export const nodeSchedule = (node?: WorkNode) =>
  node as ScheduledNode | undefined;

export function workScheduleToday(tree: WorkTreeSnapshot) {
  const schedule = (
    tree.root as WorkTreeSnapshot["root"] & {
      scheduling?: { version: number; today: string };
    }
  ).scheduling;
  return schedule?.version === 1 && isCalendarDate(schedule.today)
    ? schedule.today
    : undefined;
}

export function plannedSubtaskStartIssue(
  start: string,
  due: string,
  requireDate: boolean,
) {
  if (!start && !requireDate) return "";
  if (!isCalendarDate(start)) return "Choose a planned start date.";
  return due && due < start
    ? "Choose a start date on or before the due date, or reschedule the parent first."
    : "";
}
