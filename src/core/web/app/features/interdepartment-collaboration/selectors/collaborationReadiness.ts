import type { CollaborationApproval, CollaborationChangeRequest, CollaborationParticipant, CollaborationRevision } from "../types";

export function calculateCollaborationReadiness({
  currentRevisionId,
  participants,
  approvals,
  changeRequests,
}: {
  currentRevisionId?: string;
  participants: CollaborationParticipant[];
  approvals: CollaborationApproval[];
  changeRequests: CollaborationChangeRequest[];
}) {
  const externalParticipants = participants.filter((participant) => participant.participationRole === "participant" || participant.participationRole === "governance");
  const externalOrgIds = new Set(externalParticipants.map((participant) => participant.orgId));
  const approvedOrgIds = new Set(
    approvals
      .filter((approval) => externalOrgIds.has(approval.organizationId) && approval.revisionId === currentRevisionId && approval.decision === "approved")
      .map((approval) => approval.organizationId),
  );
  const openChanges = changeRequests.filter((request) => request.status === "open");
  const pending = externalParticipants.filter((participant) => !approvedOrgIds.has(participant.orgId));
  return {
    ready: Boolean(currentRevisionId && pending.length === 0 && openChanges.length === 0),
    approvedCount: approvedOrgIds.size,
    requiredCount: externalParticipants.length,
    pendingOrgIds: pending.map((participant) => participant.orgId),
    openChangeCount: openChanges.length,
  };
}

export function latestRevision(revisions: CollaborationRevision[]) {
  return [...revisions].sort((left, right) => right.revisionNumber - left.revisionNumber)[0];
}
