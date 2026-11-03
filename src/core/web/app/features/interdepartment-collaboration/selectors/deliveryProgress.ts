import type { Project } from "../../projects/services/types";
import type { Task } from "../../tasks";

export type ProposalDeliveryStage =
  | "publishing"
  | "active"
  | "attention"
  | "awaiting_review"
  | "ready_to_complete"
  | "ready_to_archive"
  | "archived";

export interface CommittedProposalDeliverySummary {
  stage: ProposalDeliveryStage;
  projects: Project[];
  tasks: Task[];
  projectCount: number;
  completedProjectCount: number;
  taskCount: number;
  completedTaskCount: number;
  remainingTaskCount: number;
  awaitingReviewCount: number;
  changesRequestedCount: number;
  overdueCount: number;
  progress: number;
  readyToComplete: boolean;
  readyToArchive: boolean;
  archived: boolean;
}

export function buildCommittedProposalDeliverySummary(
  draftId: string,
  projects: Project[],
  tasks: Task[],
  now = Date.now(),
): CommittedProposalDeliverySummary {
  const proposalProjects = projects.filter((project) => project.sourceCollaborationDraftId === draftId);
  const projectIds = new Set(proposalProjects.map((project) => project.id));
  const proposalTasks = tasks.filter((task) =>
    !task.archivedAt &&
    task.status !== "cancelled" &&
    (task.sourceCollaborationDraftId === draftId || Boolean(task.linkedProjectId && projectIds.has(task.linkedProjectId))),
  );
  const completedTaskCount = proposalTasks.filter((task) => task.status === "completed").length;
  const completedProjectCount = proposalProjects.filter((project) => ["completed", "archived"].includes(project.status)).length;
  const awaitingReviewCount = proposalTasks.filter((task) => task.status === "for_review").length;
  const changesRequestedCount = proposalTasks.filter((task) => task.status === "changes_requested").length;
  const overdueCount = proposalTasks.filter((task) => {
    const deadline = task.dueDate || task.deadline;
    return Boolean(deadline && task.status !== "completed" && new Date(deadline).getTime() < now);
  }).length;
  const progress = proposalTasks.length
    ? Math.round(proposalTasks.reduce((total, task) => total + (task.status === "completed" ? 100 : Math.max(0, Math.min(100, task.percentComplete || 0))), 0) / proposalTasks.length)
    : proposalProjects.length > 0 && completedProjectCount === proposalProjects.length ? 100 : 0;
  const archived = proposalProjects.length > 0 && proposalProjects.every((project) => project.status === "archived");
  const allTasksApproved = proposalTasks.length === 0 || completedTaskCount === proposalTasks.length;
  const readyToArchive = !archived && allTasksApproved && proposalProjects.length > 0 && proposalProjects.every((project) => ["completed", "archived"].includes(project.status));
  const readyToComplete = !readyToArchive && proposalTasks.length > 0 && allTasksApproved;

  let stage: ProposalDeliveryStage = "active";
  if (proposalProjects.length === 0) stage = "publishing";
  else if (archived) stage = "archived";
  else if (readyToArchive) stage = "ready_to_archive";
  else if (readyToComplete) stage = "ready_to_complete";
  else if (awaitingReviewCount > 0) stage = "awaiting_review";
  else if (overdueCount > 0 || changesRequestedCount > 0) stage = "attention";

  return {
    stage,
    projects: proposalProjects,
    tasks: proposalTasks,
    projectCount: proposalProjects.length,
    completedProjectCount,
    taskCount: proposalTasks.length,
    completedTaskCount,
    remainingTaskCount: proposalTasks.length - completedTaskCount,
    awaitingReviewCount,
    changesRequestedCount,
    overdueCount,
    progress,
    readyToComplete,
    readyToArchive,
    archived,
  };
}
