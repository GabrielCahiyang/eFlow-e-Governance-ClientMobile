import { supabase } from "../../../../lib/supabase";
import type {
  CollaborationApproval,
  CollaborationChangeRequest,
  CollaborationDecision,
  CollaborationMessage,
  CollaborationReadiness,
  CollaborationTargetType,
} from "../types";
import {
  rowToCollaborationApproval,
  rowToCollaborationChangeRequest,
  rowToCollaborationMessage,
} from "./collaborationMappers";
import { notifyCollaborationDraftsChanged } from "./collaborationDraftEvents";

export async function fetchCollaborationReviewState(draftId: string) {
  const [messages, changes, approvals, readiness] = await Promise.all([
    supabase.from("proposal_collaboration_messages").select("*").eq("draft_id", draftId).order("created_at"),
    supabase.from("proposal_collaboration_change_requests").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }),
    supabase.from("proposal_collaboration_approvals").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }),
    supabase.rpc("collaboration_readiness", { target_draft: draftId }),
  ]);
  const error = messages.error || changes.error || approvals.error || readiness.error;
  if (error) throw new Error(error.message);
  const value = (readiness.data || {}) as Record<string, unknown>;
  return {
    messages: (messages.data || []).map((row) => rowToCollaborationMessage(row as Record<string, unknown>)),
    changeRequests: (changes.data || []).map((row) => rowToCollaborationChangeRequest(row as Record<string, unknown>)),
    approvals: (approvals.data || []).map((row) => rowToCollaborationApproval(row as Record<string, unknown>)),
    readiness: {
      ready: Boolean(value.ready),
      requiredOrganizations: Number(value.requiredOrganizations || value.required_organizations || 0),
      approvedOrganizations: Number(value.approvedOrganizations || value.approved_organizations || 0),
      openChangeRequests: Number(value.openChangeRequests || value.open_change_requests || 0),
      missingApprovers: Number(value.missingApprovers || value.missing_approvers || 0),
      currentRevisionId: value.currentRevisionId ? String(value.currentRevisionId) : value.current_revision_id ? String(value.current_revision_id) : undefined,
      blockers: Array.isArray(value.blockers) ? value.blockers.filter((item): item is string => typeof item === "string") : [],
    } satisfies CollaborationReadiness,
  };
}

export async function requestCollaborationReview(draftId: string) {
  const { error } = await supabase.rpc("request_collaboration_review", { p_draft_id: draftId });
  if (error) throw new Error(error.message);
  notifyCollaborationDraftsChanged();
}

export async function sendCollaborationMessage(input: {
  draftId: string;
  message: string;
  targetType?: CollaborationTargetType;
  targetKey?: string;
}): Promise<CollaborationMessage> {
  const { data, error } = await supabase.rpc("send_collaboration_message", {
    p_draft_id: input.draftId,
    p_message: input.message,
    p_target_type: input.targetType || "proposal",
    p_target_key: input.targetKey || null,
    p_message_type: "comment",
  });
  if (error) throw new Error(error.message);
  return rowToCollaborationMessage((Array.isArray(data) ? data[0] : data) as Record<string, unknown>);
}

export async function createCollaborationChangeRequest(input: {
  draftId: string;
  targetType: CollaborationTargetType;
  targetKey: string;
  reason: string;
  proposedChange?: Record<string, unknown>;
  organizationId?: string;
}): Promise<CollaborationChangeRequest> {
  const { data, error } = await supabase.rpc("create_collaboration_change_request", {
    p_draft_id: input.draftId,
    p_target_type: input.targetType,
    p_target_key: input.targetKey,
    p_reason: input.reason,
    p_proposed_change: input.proposedChange || {},
    p_organization_id: input.organizationId || null,
  });
  if (error) throw new Error(error.message);
  const request = rowToCollaborationChangeRequest((Array.isArray(data) ? data[0] : data) as Record<string, unknown>);
  notifyCollaborationDraftsChanged();
  return request;
}

export async function resolveCollaborationChangeRequest(requestId: string, status: "accepted" | "rejected" | "withdrawn", reason?: string) {
  const { error } = await supabase.rpc("resolve_collaboration_change_request", {
    p_request_id: requestId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
  notifyCollaborationDraftsChanged();
}

export async function decideCollaborationReview(input: {
  draftId: string;
  organizationId: string;
  decision: CollaborationDecision;
  reason?: string;
}): Promise<CollaborationApproval> {
  const { data, error } = await supabase.rpc("decide_collaboration_review", {
    p_draft_id: input.draftId,
    p_organization_id: input.organizationId,
    p_decision: input.decision,
    p_reason: input.reason || null,
  });
  if (error) throw new Error(error.message);
  const approval = rowToCollaborationApproval((Array.isArray(data) ? data[0] : data) as Record<string, unknown>);
  notifyCollaborationDraftsChanged();
  return approval;
}

export function subscribeToCollaborationReview(draftId: string, callback: () => void) {
  const channel = supabase.channel(`collaboration-review-${draftId}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "proposal_collaboration_messages", filter: `draft_id=eq.${draftId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "proposal_collaboration_change_requests", filter: `draft_id=eq.${draftId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "proposal_collaboration_approvals", filter: `draft_id=eq.${draftId}` }, callback)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
