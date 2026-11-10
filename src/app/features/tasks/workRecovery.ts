import { WorkRequestFailure } from "../../../core/web/app/features/nested-work/types/editor";
import type {
  WorkCapabilityContext,
  WorkRequest,
} from "../../../core/web/app/features/nested-work/types";
import type {
  WorkEditorBaseline,
  WorkEditorFields,
} from "../../../core/web/app/features/nested-work/types/editor";
import { sameWorkEditorScope } from "../../../core/web/app/features/nested-work/selectors/editorDraft";
import { isSubtaskContributor } from "./branchInspector";
import { contributorReviewUnavailable } from "../../shared/userMessages";

export async function recoverWorkRequest(
  rootId: string,
  request: WorkRequest,
  actorId: string,
) {
  const [{ supabase }, { fetchWorkTree, saveWorkTree }] = await Promise.all([
    import("../../../platform/supabase"),
    import("../../../core/web/app/features/nested-work/services/workTreeService"),
  ]);
  const { data, error } = await supabase.rpc("nw_work_command_receipt", {
    p_root: rootId,
    p_request: request.id,
    p_command: request.command,
    p_payload: request.payload,
  });
  if (error) throw new Error(error.message);
  if (data === true) return fetchWorkTree(rootId);
  if (data !== false)
    throw new Error("The original work receipt could not be verified.");
  if (request.command === "progress" || request.command === "submit") {
    const latest = await fetchWorkTree(rootId);
    const nodeId = request.payload.id;
    if (
      typeof nodeId !== "string" ||
      !latest.nodes.some(
        (node) => node.id === nodeId && node.task_id === rootId,
      )
    )
      throw new WorkRequestFailure(
        "confirmed_failure",
        "The original subtask is unavailable.",
      );
    if (isSubtaskContributor(latest, nodeId, actorId))
      throw new WorkRequestFailure(
        "confirmed_failure",
        contributorReviewUnavailable,
      );
  }
  return saveWorkTree(rootId, request);
}
export interface NativeWorkRecovery {
  baseline: WorkEditorBaseline;
  fields: WorkEditorFields;
  request: WorkRequest;
}
export function isNativeWorkRecovery(
  value: unknown,
  context: WorkCapabilityContext,
): value is NativeWorkRecovery {
  if (!value || typeof value !== "object") return false;
  const item = value as NativeWorkRecovery;
  return (
    !!item.baseline &&
    sameWorkEditorScope(item.baseline, context) &&
    !!item.request &&
    typeof item.request.id === "string" &&
    item.request.id.length > 0 &&
    item.request.revision === item.baseline.revision &&
    item.request.command === item.baseline.command &&
    !!item.request.payload &&
    typeof item.request.payload === "object" &&
    !Array.isArray(item.request.payload) &&
    !!item.fields &&
    typeof item.fields.title === "string" &&
    typeof item.fields.note === "string" &&
    typeof item.fields.due === "string" &&
    typeof item.fields.lead === "string" &&
    typeof item.fields.parent === "string" &&
    typeof item.fields.standalone === "boolean" &&
    Number.isFinite(item.fields.progress) &&
    Array.isArray(item.fields.people) &&
    item.fields.people.every((id) => typeof id === "string") &&
    Array.isArray(item.fields.order) &&
    item.fields.order.every((id) => typeof id === "string")
  );
}
export function workRecoveryCanDiscard(error: unknown) {
  return (
    error instanceof WorkRequestFailure &&
    ["confirmed_failure", "stale_revision"].includes(error.kind)
  );
}
