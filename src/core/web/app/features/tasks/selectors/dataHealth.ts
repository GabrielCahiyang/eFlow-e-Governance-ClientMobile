import type { Project } from '../../../services/projectService';
import type { Task } from '../../../services/taskService';
import { isActive, isArchived, parseDueDate } from './lifecycle';
import type { Health } from './metrics';

export interface DataHealthReport {
  assignedButPending: Task[];
  missingProjectLink: Task[];
  danglingProjectLink: Task[];
  overdueWithoutDueDate: Task[];
}

/**
 * Assigned-but-pending is the flagship inconsistency (§0.3): a task carrying an
 * assignee while still `pending_assignment`. After the migration + guard this
 * should be empty, so a non-zero count means a write bypassed the lifecycle.
 */
export function assignedButPending(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && t.status === 'pending_assignment' && !!t.assigneeId);
}

/** Active task with no canonical project link (§0.2 "Needs project link"). */
export function missingProjectLink(tasks: Task[]): Task[] {
  return tasks.filter((t) => isActive(t) && !t.linkedProjectId);
}

/** Active task whose linked_project_id resolves to no live project. */
export function danglingProjectLink(tasks: Task[], projects: Pick<Project, 'id'>[]): Task[] {
  const known = new Set(projects.map((p) => p.id));
  return tasks.filter((t) => isActive(t) && !!t.linkedProjectId && !known.has(t.linkedProjectId));
}

/**
 * Active task whose deadline can't be treated as a real calendar date — a fuzzy
 * proposal schedule ("Month 2", "Phase 1") or blank. These cannot be judged
 * overdue and silently fall out of deadline reporting, so they're surfaced.
 */
export function overdueWithoutDueDate(tasks: Task[]): Task[] {
  return tasks.filter((t) => isActive(t) && parseDueDate(t) === null);
}

/**
 * One integrity bundle for the restricted Admin data-health panel (plan §5).
 * Derived from the same live task/project lists the dashboards use, so a clean
 * board here guarantees the dashboard numbers can be trusted.
 */
export function dataHealth(
  tasks: Task[],
  projects: Pick<Project, 'id'>[],
): DataHealthReport {
  return {
    assignedButPending: assignedButPending(tasks),
    missingProjectLink: missingProjectLink(tasks),
    danglingProjectLink: danglingProjectLink(tasks, projects),
    overdueWithoutDueDate: overdueWithoutDueDate(tasks),
  };
}

// Status labels + the canonical transition table live in taskService; keep a
// display helper for health here so badges are consistent.
export const HEALTH_LABEL: Record<Health, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  delayed: 'Delayed',
  complete: 'Complete',
  no_data: 'No task data',
};
