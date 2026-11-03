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
