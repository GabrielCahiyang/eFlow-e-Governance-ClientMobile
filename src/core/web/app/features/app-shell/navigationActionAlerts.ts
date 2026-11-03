import type { CollaborationDraft } from "../interdepartment-collaboration";
import type { Project } from "../projects";
import { isTaskVisibleInReviewQueue } from "../reviews";
import type { Task } from "../tasks";
import { isHeadWorkspaceRole } from "../../shared/roles";

export function getNavigationActionAlerts(input: {
  tasks: Task[];
  projects: Project[];
  drafts: CollaborationDraft[];
  userId?: string;
  role?: string;
  orgId?: string;
}) {
  const { tasks, projects, drafts, userId, role, orgId } = input;
  if (!userId) return { reviews: false, projects: false };

  const reviews = tasks.some((task) =>
    isTaskVisibleInReviewQueue(task, userId, role) &&
    (task.reviewerId === userId || task.backupReviewerId === userId),
  );
  const canManageOrg = isHeadWorkspaceRole(role);
  const projectsNeedArchiving = projects.some((project) =>
    project.status === "completed" && !project.archivedAt &&
    (project.ownerId === userId || project.createdBy === userId ||
      (canManageOrg && Boolean(orgId) && project.orgId === orgId)),
  );
  const proposalsNeedAttention = drafts.some((draft) =>
    (draft.status === "in_review" || draft.status === "ready_to_commit" || draft.status === "changes_requested") &&
    (draft.ownerUserId === userId ||
      (canManageOrg && Boolean(orgId) && draft.ownerOrgId === orgId)),
  );
  return { reviews, projects: projectsNeedArchiving || proposalsNeedAttention };
}
