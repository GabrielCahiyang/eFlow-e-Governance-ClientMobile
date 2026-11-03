import { useEffect, useState } from "react";
import {
  fetchCollaborationDrafts,
  subscribeToCollaborationDraftChanges,
  type CollaborationDraft,
} from "../interdepartment-collaboration";

export function usePendingPlanDrafts(userId?: string) {
  const [drafts, setDrafts] = useState<CollaborationDraft[]>([]);

  useEffect(() => {
    if (!userId) { setDrafts([]); return; }
    let active = true;
    const refresh = () => {
      void fetchCollaborationDrafts()
        .then((rows) => { if (active) setDrafts(rows); })
        .catch(() => { if (active) setDrafts([]); });
    };
    refresh();
    const unsubscribe = subscribeToCollaborationDraftChanges(refresh);
    return () => { active = false; unsubscribe(); };
  }, [userId]);

  return drafts;
}
