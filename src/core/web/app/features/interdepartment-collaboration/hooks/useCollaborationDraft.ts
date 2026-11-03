import * as React from "react";
import { fetchCollaborationDraft, subscribeToCollaborationDraftChanges } from "../services/collaborationDraftService";
import { fetchCollaborationReviewState, subscribeToCollaborationReview } from "../services/collaborationReviewService";
import type {
  CollaborationApproval,
  CollaborationChangeRequest,
  CollaborationDraft,
  CollaborationMessage,
  CollaborationParticipant,
  CollaborationReadiness,
  CollaborationRevision,
} from "../types";

export function useCollaborationDraft(draftId: string | null) {
  const [draft, setDraft] = React.useState<CollaborationDraft | null>(null);
  const [participants, setParticipants] = React.useState<CollaborationParticipant[]>([]);
  const [revisions, setRevisions] = React.useState<CollaborationRevision[]>([]);
  const [messages, setMessages] = React.useState<CollaborationMessage[]>([]);
  const [changeRequests, setChangeRequests] = React.useState<CollaborationChangeRequest[]>([]);
  const [approvals, setApprovals] = React.useState<CollaborationApproval[]>([]);
  const [readiness, setReadiness] = React.useState<CollaborationReadiness | null>(null);
  const [loading, setLoading] = React.useState(Boolean(draftId));
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!draftId) return;
    try {
      const [core, review] = await Promise.all([
        fetchCollaborationDraft(draftId),
        fetchCollaborationReviewState(draftId),
      ]);
      setDraft(core.draft);
      setParticipants(core.participants);
      setRevisions(core.revisions);
      setMessages(review.messages);
      setChangeRequests(review.changeRequests);
      setApprovals(review.approvals);
      setReadiness(review.readiness);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this collaboration.");
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  React.useEffect(() => {
    if (!draftId) return;
    setLoading(true);
    void refresh();
    const unsubscribeDrafts = subscribeToCollaborationDraftChanges(() => { void refresh(); });
    const unsubscribeReview = subscribeToCollaborationReview(draftId, () => { void refresh(); });
    return () => { unsubscribeDrafts(); unsubscribeReview(); };
  }, [draftId, refresh]);

  return { draft, participants, revisions, messages, changeRequests, approvals, readiness, loading, error, refresh };
}
