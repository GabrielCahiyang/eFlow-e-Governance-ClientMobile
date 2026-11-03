import { useCallback, useEffect, useState } from "react";
import type { TaskFundingContext } from "../types";
import { fetchTaskFundingContext } from "../services/budgetService";

export function useTaskFundingContext(taskId: string, subtaskId?: string, version = "") {
  const [context, setContext] = useState<TaskFundingContext | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!taskId) {
      setContext(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setContext(await fetchTaskFundingContext(taskId, subtaskId));
    } catch (caught) {
      setContext(null);
      setError(caught instanceof Error ? caught.message : "Task funding could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [subtaskId, taskId]);

  useEffect(() => { void refresh(); }, [refresh, version]);

  return { context, loading, error, refresh };
}
