import type { Project } from '../../../services/projectService';
import type { Task } from '../../../services/taskService';
import { isActive, isArchived, isCompleted, isForReview, isOverdue, isUnassigned } from './lifecycle';

export function inScope(orgId: string | undefined, scopedOrgIds: string[]): boolean {
  if (scopedOrgIds.length === 0) return true;
  if (!orgId) return true; // legacy rows without an org stay visible in-scope
  return scopedOrgIds.includes(orgId);
}

export function scopeTasks(tasks: Task[], scopedOrgIds: string[]): Task[] {
  if (scopedOrgIds.length === 0) return tasks;
  return tasks.filter((t) => inScope(t.orgId, scopedOrgIds));
}

export function scopeProjects(projects: Project[], scopedOrgIds: string[]): Project[] {
  if (scopedOrgIds.length === 0) return projects;
  return projects.filter((p) => inScope(p.orgId, scopedOrgIds));
}

// ─── Task-set selectors ──────────────────────────────────────────
// All operate on a task list the caller has already scoped. They apply the
// archive/active policy themselves so screens never have to remember to.

export function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter(isActive);
}

export function unassignedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => isActive(t) && isUnassigned(t));
}

export function overdueTasks(tasks: Task[], now: number = Date.now()): Task[] {
  return tasks.filter((t) => isOverdue(t, now));
}

export function forReviewTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && isForReview(t));
}

export function inProgressTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && t.status === 'in_progress');
}

export function completedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && isCompleted(t));
}

export function archivedTasks(tasks: Task[]): Task[] {
  return tasks.filter(isArchived);
}

/** Only the canonical link is honoured. */
export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.linkedProjectId === projectId && !isArchived(t));
}

export function tasksForMilestone(tasks: Task[], milestoneId: string): Task[] {
  return tasks.filter((t) => t.milestoneId === milestoneId && !isArchived(t));
}

// ─── Rates & rollups ─────────────────────────────────────────────
