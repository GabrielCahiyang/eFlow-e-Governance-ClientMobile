import * as Crypto from "expo-crypto";
import { supabase } from "../../../platform/supabase";
import { draftStore } from "../../../platform/draftStore";
import { asServiceFile } from "../../../platform/files";
import {
  readEvidenceFile,
  type EvidenceFile,
} from "../../../platform/evidenceFiles";
import { PublicMessageError } from "../../shared/userMessages";
import {
  fetchProjectFiles,
  projectFileCommand,
  uploadProjectFile,
} from "../../../core/web/app/features/project-files/services/projectFileService";
import type { ProjectFile } from "../../../core/web/app/features/project-files/types";
import { validateProjectFile } from "../../../core/web/app/features/project-files/constants";

export type DocumentScope = { actor: string; project: string; task?: string };
export type DocumentUpload = {
  id: string;
  file: EvidenceFile;
  sha256?: string;
  attempted?: boolean;
};
export const documentUploadScope = ({ project, task }: DocumentScope) =>
  `project-document:${project}:${task || "library"}`;

async function assertDocumentActor(scope: DocumentScope) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== scope.actor)
    throw new PublicMessageError(
      "Sign in with the original account to continue.",
    );
}

async function currentFiles(scope: DocumentScope) {
  await assertDocumentActor(scope);
  return fetchProjectFiles(scope.project, scope.task);
}

/** Uses current server capabilities for this actor and exact project/task on every write. */
export async function changeProjectDocument(
  scope: DocumentScope,
  command: "link" | "unlink" | "remove",
  id: string,
) {
  const snapshot = await currentFiles(scope);
  if (snapshot.can_write !== true)
    throw new PublicMessageError(
      "Document changes are no longer available in this task or project.",
    );
  const file = snapshot.files.find(
    (item) => item.id === id && item.project_id === scope.project,
  );
  if (!file || file.state !== "ready")
    throw new PublicMessageError(
      "This document is no longer available. Refresh the library.",
    );
  if ((command === "link" || command === "unlink") && !scope.task)
    throw new PublicMessageError("Choose the task for this document link.");
  // Reconcile a response lost after a previous link/unlink; never blindly repeat it.
  if (
    (command === "link" && file.linked === true) ||
    (command === "unlink" && file.linked === false)
  )
    return;
  if (command === "remove" && (file.can_remove !== true || file.links !== 0))
    throw new PublicMessageError(
      "Only an authorized, unlinked document can be removed.",
    );
  await assertDocumentActor(scope);
  const receipt = await projectFileCommand(scope.project, scope.task, command, {
    id,
  });
  if (receipt.id !== id || receipt.project_id !== scope.project)
    throw new PublicMessageError(
      "The document result could not be verified. Refresh before continuing.",
    );
  if (command === "remove" && receipt.state !== "removed")
    throw new PublicMessageError(
      "Removal could not be confirmed. Refresh the library before continuing.",
    );
}

function verifyUpload(
  file: ProjectFile,
  request: DocumentUpload,
  scope: DocumentScope,
) {
  if (
    file.id !== request.id ||
    file.project_id !== scope.project ||
    file.uploader_id !== scope.actor ||
    file.file_name !== request.file.name.trim() ||
    file.file_size !== request.file.size ||
    file.mime_type !== request.file.type ||
    file.sha256 !== request.sha256 ||
    file.initial_task_id !== (scope.task || null) ||
    file.state !== "ready"
  )
    throw new PublicMessageError(
      "The upload receipt could not be verified. Keep this request and check the library.",
    );
  return file;
}

/** Persist the same request ID/hash across navigation, restart and an uncertain Storage response. */
export async function saveProjectDocument(
  scope: DocumentScope,
  request: DocumentUpload,
  readOnly: boolean,
) {
  const invalid = validateProjectFile(request.file as unknown as File);
  if (invalid) throw new PublicMessageError(invalid);
  const snapshot = await currentFiles(scope);
  const existing = snapshot.files.find((file) => file.id === request.id);
  if (existing) {
    const receipt = verifyUpload(existing, request, scope);
    await draftStore.remove(scope.actor, documentUploadScope(scope));
    return receipt;
  }
  if (readOnly || snapshot.can_write !== true)
    throw new PublicMessageError(
      "Upload access is unavailable. The saved request has been kept.",
    );
  const bytes = await readEvidenceFile(request.file);
  if (!bytes.byteLength || bytes.byteLength !== request.file.size)
    throw new PublicMessageError(
      "The original file is unavailable or changed. Keep this request and check the library before choosing another file.",
    );
  const hash = Array.from(
    new Uint8Array(
      await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes),
    ),
  )
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  if (request.sha256 && request.sha256 !== hash)
    throw new PublicMessageError(
      "The original file changed. The saved upload has not been replaced.",
    );
  request.sha256 = hash;
  const file = await asServiceFile({
    ...request.file,
    arrayBuffer: async () => bytes,
  });
  request.attempted = true;
  await draftStore.set(scope.actor, documentUploadScope(scope), request);
  await assertDocumentActor(scope);
  const receipt = verifyUpload(
    await uploadProjectFile(scope.project, scope.task, {
      id: request.id,
      file,
      sha256: hash,
    }),
    request,
    scope,
  );
  await draftStore.remove(scope.actor, documentUploadScope(scope));
  return receipt;
}
