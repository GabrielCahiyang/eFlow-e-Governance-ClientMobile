import { dateLabel } from "../../components/ui/theme";
import {
  getPhilippineCalendarDate,
  isCalendarDate,
} from "../../../core/web/app/shared/calendarDates";

export interface TaskDateRange {
  start?: string;
  end?: string;
}

export interface CashNeededByBounds {
  min: string;
  max?: string;
  taskStart?: string;
  taskEnd?: string;
  expired: boolean;
}

export function cashNeededByBounds(
  schedule?: TaskDateRange,
  today = getPhilippineCalendarDate(),
): CashNeededByBounds {
  const taskStart =
    schedule?.start && isCalendarDate(schedule.start)
      ? schedule.start
      : undefined;
  const taskEnd =
    schedule?.end && isCalendarDate(schedule.end) ? schedule.end : undefined;

  if (taskEnd && taskEnd < today) {
    return {
      min: today,
      max: undefined,
      taskStart,
      taskEnd,
      expired: true,
    };
  }

  if (taskStart && taskEnd && taskEnd < taskStart) {
    return {
      min: today,
      max: undefined,
      taskStart,
      taskEnd,
      expired: true,
    };
  }

  const min = taskStart && taskStart > today ? taskStart : today;
  return {
    min,
    max: taskEnd,
    taskStart,
    taskEnd,
    expired: false,
  };
}

export function cashNeededByError(
  value: string,
  schedule?: TaskDateRange,
  today = getPhilippineCalendarDate(),
): string {
  const trimmed = value.trim();
  const bounds = cashNeededByBounds(schedule, today);
  if (bounds.expired) {
    return "The task's scheduled dates have already passed. Update the task dates before requesting cash.";
  }
  if (!trimmed) return "Needed-by date is required.";
  if (!isCalendarDate(trimmed)) return "Needed-by date must be a valid date.";
  if (bounds.taskStart && trimmed < bounds.taskStart) {
    return `Needed-by date must be on or after the task start date (${dateLabel(bounds.taskStart)}).`;
  }
  if (bounds.taskEnd && trimmed > bounds.taskEnd) {
    return `Needed-by date must be on or before the task due date (${dateLabel(bounds.taskEnd)}).`;
  }
  if (trimmed < today) {
    return "Needed-by date cannot be earlier than today.";
  }
  return "";
}

export function formatTaskDateRangeHint(
  schedule?: TaskDateRange,
): string | undefined {
  const taskStart =
    schedule?.start && isCalendarDate(schedule.start)
      ? schedule.start
      : undefined;
  const taskEnd =
    schedule?.end && isCalendarDate(schedule.end) ? schedule.end : undefined;
  if (taskStart && taskEnd) {
    return `Choose a date within the task schedule (${dateLabel(taskStart)} – ${dateLabel(taskEnd)}).`;
  }
  if (taskStart) {
    return `Choose a date on or after the task start date (${dateLabel(taskStart)}).`;
  }
  if (taskEnd) {
    return `Choose a date on or before the task due date (${dateLabel(taskEnd)}).`;
  }
  return undefined;
}
