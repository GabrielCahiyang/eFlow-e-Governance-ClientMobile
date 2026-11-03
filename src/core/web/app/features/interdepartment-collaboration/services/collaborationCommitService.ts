import { supabase } from "../../../../lib/supabase";
import type { CollaborationCommitResult } from "../types";
import { notifyCollaborationDraftsChanged } from "./collaborationDraftEvents";

function mapCommitResult(data: unknown, draftId: string): CollaborationCommitResult {
  const value = data as Record<string, unknown>;
  return {
    draftId: String(value.draftId || value.draft_id || draftId),
    revisionId: String(value.revisionId || value.revision_id || ""),
    revisionNumber: Number(value.revisionNumber || value.revision_number || 0),
    projectIds: Array.isArray(value.projectIds || value.project_ids) ? (value.projectIds || value.project_ids) as string[] : [],
    projectCount: Number(value.projectCount || value.project_count || 0),
  };
}

export async function commitCollaborationDraft(draftId: string, revisionId: string): Promise<CollaborationCommitResult> {
  const { data, error } = await supabase.rpc("commit_collaboration_draft", {
    p_draft_id: draftId,
    p_revision_id: revisionId,
  });
  if (error) throw new Error(error.message);
  notifyCollaborationDraftsChanged();
  const result = mapCommitResult(data, draftId);
  return { ...result, revisionId: result.revisionId || revisionId };
}

export async function publishDepartmentProposal(draftId: string): Promise<CollaborationCommitResult> {
  const { data, error } = await supabase.rpc("publish_department_proposal", {
    p_draft_id: draftId,
  });
  if (error) throw new Error(error.message);
  notifyCollaborationDraftsChanged();
  return mapCommitResult(data, draftId);
}
