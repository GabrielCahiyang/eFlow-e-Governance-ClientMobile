import type { Task } from "../../tasks";

export function filterCommittedProposalBoardTasks(
  tasks: Task[],
  query: string,
  projectId = "all",
): Task[] {
  const normalizedQuery = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (projectId !== "all" && task.linkedProjectId !== projectId) return false;
    if (!normalizedQuery) return true;
    return [task.title, task.description, task.projectTitle, task.activityTitle, task.assigneeName]
      .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
}

export function countOverdueDeliveryTasks(tasks: Task[], now = Date.now()): number {
  return tasks.filter((task) => {
    const deadline = task.dueDate || task.deadline;
    return Boolean(deadline && task.status !== "completed" && new Date(deadline).getTime() < now);
  }).length;
}
