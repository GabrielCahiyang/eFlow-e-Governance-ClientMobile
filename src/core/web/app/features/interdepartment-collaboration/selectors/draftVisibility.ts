import type { CollaborationDraft } from "../types";

const ACTIVE_DRAFT_STATUSES = new Set<CollaborationDraft["status"]>([
  "draft",
  "in_review",
  "changes_requested",
  "ready_to_commit",
]);

/** Published, archived, and deleted records remain available for governance
 * history, but they are no longer work-in-progress drafts. */
export function isActiveCollaborationDraft(draft: Pick<CollaborationDraft, "status">): boolean {
  return ACTIVE_DRAFT_STATUSES.has(draft.status);
}
