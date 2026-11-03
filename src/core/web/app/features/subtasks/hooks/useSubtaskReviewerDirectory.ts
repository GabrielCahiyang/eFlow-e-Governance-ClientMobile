import { useEffect, useMemo, useState } from "react";
import { fetchSubtaskReviewerDirectory } from "../services/subtaskReviewerService";
import type { SubtaskReviewerIdentity } from "../types";

export function useSubtaskReviewerDirectory(reviewerIds: Array<string | undefined>) {
  const reviewerKey = useMemo(
    () => Array.from(new Set(reviewerIds.filter((id): id is string => Boolean(id)))).sort().join("|"),
    [reviewerIds],
  );
  const [reviewersById, setReviewersById] = useState<Record<string, SubtaskReviewerIdentity>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const ids = reviewerKey ? reviewerKey.split("|") : [];
    if (ids.length === 0) {
      setReviewersById({});
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    fetchSubtaskReviewerDirectory(ids)
      .then((directory) => { if (active) setReviewersById(directory); })
      .catch(() => { if (active) setReviewersById({}); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reviewerKey]);

  return { reviewersById, loading };
}
