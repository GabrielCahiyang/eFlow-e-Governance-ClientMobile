import type { Subtask } from "../../../services/subtaskService";

const DAY = 86_400_000;

export type SubtaskDeadlineTone = "none" | "on_track" | "due_soon" | "overdue" | "completed";

export interface SubtaskDeadlineState {
  tone: SubtaskDeadlineTone;
  label: string;
  dueAt?: number;
  days?: number;
}

export function isoDateTimestamp(value?: string | null): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function parentTaskDueDate(deadline?: string | null, dueDate?: string | null): string | undefined {
  const candidate = dueDate || deadline;
  return candidate && /^\d{4}-\d{2}-\d{2}/.test(candidate) ? candidate.slice(0, 10) : undefined;
}

export function getSubtaskDeadlineState(subtask: Pick<Subtask, "dueDate" | "isCompleted" | "status">, now = Date.now()): SubtaskDeadlineState {
  if (subtask.isCompleted || subtask.status === "completed") return { tone: "completed", label: "Completed" };
  const dueAt = isoDateTimestamp(subtask.dueDate);
  if (dueAt === undefined) return { tone: "none", label: "No due date" };
  const today = new Date(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.round((dueAt - todayStart) / DAY);
  if (days < 0) return { tone: "overdue", label: `${Math.abs(days)}d overdue`, dueAt, days };
  if (days === 0) return { tone: "due_soon", label: "Due today", dueAt, days };
  if (days <= 3) return { tone: "due_soon", label: days === 1 ? "Due tomorrow" : `${days}d left`, dueAt, days };
  return { tone: "on_track", label: `${days}d left`, dueAt, days };
}
