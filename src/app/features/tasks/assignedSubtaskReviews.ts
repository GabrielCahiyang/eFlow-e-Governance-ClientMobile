import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import type { AppRoute } from "../../shared/routes";
import { PublicMessageError } from "../../shared/userMessages";

export type AssignedSubtaskReview = {
  id: string;
  root_id: string;
  node_id: string;
  task_title: string;
  subtask_title: string;
  kind: "progress" | "completion";
  submitted_at: string;
  cash_blocked: boolean;
};

export async function fetchAssignedSubtaskReviews() {
  try {
    return await readAllRows<AssignedSubtaskReview>((from, to) =>
      supabase
        .rpc("m7_assigned_subtask_reviews", {}, { count: "exact" })
        .order("submitted_at")
        .order("id")
        .range(from, to)
        .then((result) => {
          if (result.error) throw result.error;
          return result;
        }),
    );
  } catch (error) {
    if (
      ["PGRST202", "42883"].includes((error as { code?: string })?.code ?? "")
    )
      throw new PublicMessageError(
        "Assigned Subtask reviews are unavailable on the server.",
      );
    throw error;
  }
}

export function assignedSubtaskReviewRoute(
  review: AssignedSubtaskReview,
  projectId?: string,
): AppRoute {
  return {
    name: "task",
    id: review.root_id,
    nodeId: review.node_id,
    projectId,
    view: "subitems",
    recordType: "work_proposal",
    recordId: review.id,
  };
}
