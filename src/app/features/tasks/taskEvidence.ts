import { supabase } from "../../../platform/supabase";
import { draftStore } from "../../../platform/draftStore";
import {
  readEvidenceFile,
  type EvidenceFile,
} from "../../../platform/evidenceFiles";
import {
  assertLeadershipReviewReady,
  assertTaskSubtasksReady,
} from "../../../core/web/app/features/tasks/services/leadershipReviewReadinessService";
import type { TaskSubmissionAttachment } from "../../../core/web/app/features/tasks/taskTypes";

export type EvidenceRequest = {
  id: string;
  note: string;
  files: EvidenceFile[];
  uploaded: TaskSubmissionAttachment[];
};
export const evidenceScope = (taskId: string) => "task-evidence:" + taskId;

export async function assertEvidenceActor(actor: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== actor)
    throw new Error("Sign in with the original account to continue.");
}

async function hasReceipt(taskId: string, actor: string, id: string) {
  const { data, error } = await supabase
    .from("task_submissions")
    .select("id, task_id, submitter_id")
    .eq("id", id)
    .eq("task_id", taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (
    data &&
    (data.id !== id || data.task_id !== taskId || data.submitter_id !== actor)
  )
    throw new Error(
      "The evidence receipt did not match this task and submitter.",
    );
  return !!data;
}

export async function uploadEvidenceFile(
  path: string,
  file: EvidenceFile,
  bucketId: "task-attachments" | "m7-work-evidence" = "task-attachments",
): Promise<TaskSubmissionAttachment> {
  const bytes = await readEvidenceFile(file);
  if (
    !bytes.byteLength ||
    bytes.byteLength > 25 * 1024 * 1024 ||
    (file.size > 0 && bytes.byteLength !== file.size)
  )
    throw new Error(
      "The selected file is empty, too large, or changed. Verify the original file.",
    );

  const bucket = supabase.storage.from(bucketId);
  const result = await bucket.upload(path, bytes, {
    upsert: false,
    contentType: file.type,
  });
  if (result.error) {
    // A timeout can leave the object at this immutable per-request path.
    const stored = await bucket.info(path);
    if (stored.error || stored.data?.size !== bytes.byteLength)
      throw new Error(`Could not verify ${file.name}. ${result.error.message}`);
  }
  return {
    fileName: file.name,
    filePath: path,
    fileSize: bytes.byteLength,
    mimeType: file.type,
  };
}

export async function sendTaskEvidence({
  actor,
  taskId,
  request,
  verifyAccess,
  report,
}: {
  actor: string;
  taskId: string;
  request: EvidenceRequest;
  verifyAccess: () => Promise<void>;
  report: (stage: string) => void;
}) {
  await assertEvidenceActor(actor);
  report("Checking submission status");
  if (await hasReceipt(taskId, actor, request.id)) return;
  await verifyAccess();
  await assertTaskSubtasksReady(taskId);
  await assertLeadershipReviewReady(taskId);
  for (
    let index = request.uploaded.length;
    index < request.files.length;
    index++
  ) {
    const file = request.files[index];
    report(
      `Uploading file ${index + 1} of ${request.files.length} · ${file.name}`,
    );
    await assertEvidenceActor(actor);
    const path = `${taskId}/${request.id}/${index}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    request.uploaded.push(await uploadEvidenceFile(path, file));
    await draftStore.set(actor, evidenceScope(taskId), request);
  }
  report("Submitting evidence for review");
  await verifyAccess();
  await assertEvidenceActor(actor);
  const { data, error } = await supabase.rpc("submit_task_for_review", {
    p_task_id: taskId,
    p_submission: {
      id: request.id,
      note: request.note,
      attachments: request.uploaded,
    },
  });
  if (
    data?.id === taskId &&
    data.latest_submission?.id === request.id &&
    data.latest_submission?.submitterId === actor
  )
    return;
  if (await hasReceipt(taskId, actor, request.id)) return;
  throw new Error(
    error?.message || "The submission outcome could not be confirmed.",
  );
}
