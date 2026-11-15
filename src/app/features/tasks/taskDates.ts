import {
  getPhilippineCalendarDate,
  isCalendarDate,
} from "../../../core/web/app/shared/calendarDates";
import { workDay } from "../../../core/web/app/shared/workCalendar";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { PublicMessageError } from "../../shared/userMessages";

export function taskCalendarDate(value?: string | null) {
  const date = value?.trim() ?? "";
  if (isCalendarDate(date)) return date;
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(date)) return "";
  const day = workDay(
    /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(date) ? date : date + "+08:00",
    "Asia/Manila",
  );
  return day === null ? "" : new Date(day * 86400000).toISOString().slice(0, 10);
}

export function taskTimeline(task: Pick<Task, "startDate" | "deadline" | "dueDate">) {
  return { start: taskCalendarDate(task.startDate), end: taskCalendarDate(task.deadline || task.dueDate) };
}

export function taskDatePatch(
  original: ReturnType<typeof taskTimeline>,
  draft: ReturnType<typeof taskTimeline>,
  now = new Date(),
) {
  const today = getPhilippineCalendarDate(now);
  for (const date of [draft.start, draft.end])
    if (date && !isCalendarDate(date))
      throw new PublicMessageError("Enter a valid date.");
  if (draft.start && draft.end && draft.start > draft.end)
    throw new PublicMessageError("Due date cannot be before the start date.");
  if (draft.end && draft.end !== original.end && draft.end < today)
    throw new PublicMessageError("Choose today or a future due date.");
  if (draft.start && draft.start !== original.start && draft.start < today)
    throw new PublicMessageError("Choose today or a future start date.");
  return {
    ...(draft.start !== original.start ? { start_date: draft.start || null } : {}),
    ...(draft.end !== original.end ? { deadline: draft.end } : {}),
  };
}

const dateFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
});

export function taskDateLabel(value?: string | null) {
  const date = taskCalendarDate(value);
  return date ? dateFormat.format(Date.parse(date)) : "—";
}
