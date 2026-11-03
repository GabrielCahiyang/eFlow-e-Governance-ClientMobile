import { useEffect, useState } from "react";
import type { TaskSubtaskReviewEvidence } from "../types";
import { fetchTaskSubtaskReviewEvidence } from "../services/taskReviewEvidenceService";

export function useTaskReviewEvidence(taskId?: string) {
  const [evidence, setEvidence] = useState<TaskSubtaskReviewEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    if (!taskId) {
      setEvidence([]);
      setLoading(false);
      setError(undefined);
      return () => { active = false; };
    }

    setLoading(true);
    setError(undefined);
    fetchTaskSubtaskReviewEvidence(taskId)
      .then((next) => {
        if (active) setEvidence(next);
      })
      .catch((caught) => {
        if (!active) return;
        setEvidence([]);
        setError(caught instanceof Error ? caught.message : "Subtask evidence could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [taskId]);

  return { evidence, loading, error };
}
