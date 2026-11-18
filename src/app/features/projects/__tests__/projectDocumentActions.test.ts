import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  changeProjectDocument,
  saveProjectDocument,
  documentUploadScope,
  type DocumentUpload,
} from "../projectDocumentActions";
import type {
  ProjectFile,
  ProjectFileSnapshot,
} from "../../../../core/web/app/features/project-files/types";
const mockSession = jest.fn<() => Promise<unknown>>();
const mockList =
  jest.fn<(...args: unknown[]) => Promise<ProjectFileSnapshot>>();
const mockCommand = jest.fn<(...args: unknown[]) => Promise<ProjectFile>>();
const mockUpload = jest.fn<(...args: unknown[]) => Promise<ProjectFile>>();
const mockSet = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockRemove = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockRead = jest.fn<() => Promise<ArrayBuffer>>();
jest.mock("../../../../platform/supabase", () => ({
  supabase: { auth: { getSession: () => mockSession() } },
}));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    set: (...a: unknown[]) => mockSet(...a),
    remove: (...a: unknown[]) => mockRemove(...a),
  },
}));
jest.mock("../../../../platform/evidenceFiles", () => ({
  readEvidenceFile: () => mockRead(),
}));
jest.mock("../../../../platform/files", () => ({
  asServiceFile: async (file: unknown) => file,
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: async () => new Uint8Array(32).fill(171).buffer,
}));
jest.mock(
  "../../../../core/web/app/features/project-files/services/projectFileService",
  () => ({
    fetchProjectFiles: (...a: unknown[]) => mockList(...a),
    projectFileCommand: (...a: unknown[]) => mockCommand(...a),
    uploadProjectFile: (...a: unknown[]) => mockUpload(...a),
  }),
);
const scope = {
  actor: "actor-a",
  project: "personal-project-a",
  task: "task-a",
};
const file: ProjectFile = {
  id: "saved-id",
  project_id: scope.project,
  project_kind: "personal",
  uploader_id: scope.actor,
  uploader_name: "QA Member",
  initial_task_id: scope.task,
  file_name: "Plan.pdf",
  file_size: 2,
  mime_type: "application/pdf",
  sha256: "ab".repeat(32),
  object_path: "project/saved-id/Plan.pdf",
  state: "ready",
  created_at: "2026-11-18T01:00:00Z",
  committed_at: "2026-11-18T01:00:01Z",
  linked: false,
  can_remove: true,
  links: 0,
};
const request = (): DocumentUpload => ({
  id: file.id,
  file: {
    uri: "file:///qa/Plan.pdf",
    name: file.file_name,
    size: 2,
    type: file.mime_type,
  },
});
beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({
    data: { session: { user: { id: scope.actor } } },
    error: null,
  });
  mockList.mockResolvedValue({ can_write: true, files: [{ ...file }] });
  mockCommand.mockResolvedValue(file);
  mockUpload.mockResolvedValue(file);
  mockSet.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
  mockRead.mockResolvedValue(new Uint8Array([1, 2]).buffer);
});
test("rechecks current actor/project/task capabilities before linking a document", async () => {
  await changeProjectDocument(scope, "link", file.id);
  expect(mockList).toHaveBeenCalledWith(scope.project, scope.task);
  expect(mockCommand).toHaveBeenCalledWith(scope.project, scope.task, "link", {
    id: file.id,
  });
});
test.each([
  { can_write: false, files: [file] },
  { can_write: undefined, files: [file] },
  { can_write: true, files: [{ ...file, project_id: "another-project" }] },
  { can_write: true, files: [] },
])(
  "fails closed on stale/missing access or the wrong record scope",
  async (snapshot) => {
    mockList.mockResolvedValue(snapshot as ProjectFileSnapshot);
    await expect(
      changeProjectDocument(scope, "link", file.id),
    ).rejects.toThrow();
    expect(mockCommand).not.toHaveBeenCalled();
  },
);
test("a changed actor cannot issue a write or read another actor's recovery scope", async () => {
  mockSession.mockResolvedValue({
    data: { session: { user: { id: "actor-b" } } },
  });
  await expect(changeProjectDocument(scope, "link", file.id)).rejects.toThrow(
    "original account",
  );
  expect(mockList).not.toHaveBeenCalled();
  expect(mockCommand).not.toHaveBeenCalled();
});

test("an actor change during the capability read is caught again before writing", async () => {
  mockSession
    .mockResolvedValueOnce({ data: { session: { user: { id: scope.actor } } } })
    .mockResolvedValueOnce({ data: { session: { user: { id: "actor-b" } } } });
  await expect(changeProjectDocument(scope, "link", file.id)).rejects.toThrow(
    "original account",
  );
  expect(mockCommand).not.toHaveBeenCalled();
});
test.each([
  { can_remove: false, links: 0 },
  { can_remove: true, links: 2 },
  { can_remove: true, links: undefined },
])(
  "cannot remove a file without explicit current removal authority and zero links",
  async (patch) => {
    mockList.mockResolvedValue({
      can_write: true,
      files: [{ ...file, ...patch }],
    });
    await expect(
      changeProjectDocument(scope, "remove", file.id),
    ).rejects.toThrow("authorized, unlinked");
    expect(mockCommand).not.toHaveBeenCalled();
  },
);
test("a lost link/unlink response is reconciled from current state before another write", async () => {
  mockList.mockResolvedValueOnce({
    can_write: true,
    files: [{ ...file, linked: true }],
  });
  await changeProjectDocument(scope, "link", file.id);
  await changeProjectDocument(scope, "unlink", file.id);
  expect(mockCommand).not.toHaveBeenCalled();
});
test("does not accept a mismatched command result or unconfirmed removal", async () => {
  mockCommand.mockResolvedValueOnce({ ...file, project_id: "other-project" });
  await expect(changeProjectDocument(scope, "link", file.id)).rejects.toThrow(
    "could not be verified",
  );
  await expect(changeProjectDocument(scope, "remove", file.id)).rejects.toThrow(
    "could not be confirmed",
  );
});
test("retains the same durable ID/hash after a lost upload receipt and retries that exact request", async () => {
  mockList.mockResolvedValue({ can_write: true, files: [] });
  mockUpload.mockRejectedValueOnce(new Error("Receipt response lost"));
  const saved = request();
  await expect(saveProjectDocument(scope, saved, false)).rejects.toThrow(
    "Receipt response lost",
  );
  expect(mockRemove).not.toHaveBeenCalled();
  expect(mockSet).toHaveBeenCalledWith(
    scope.actor,
    documentUploadScope(scope),
    expect.objectContaining({
      id: file.id,
      sha256: file.sha256,
      attempted: true,
    }),
  );
  const restored = JSON.parse(JSON.stringify(saved)) as DocumentUpload;
  await saveProjectDocument(scope, restored, false);
  expect(
    mockUpload.mock.calls.map((call) => (call[2] as { id: string }).id),
  ).toEqual([file.id, file.id]);
  expect(mockRemove).toHaveBeenCalledWith(
    scope.actor,
    documentUploadScope(scope),
  );
});
test("recovers a completed upload after restart without file bytes or a fresh write, even after closure", async () => {
  const saved = { ...request(), sha256: file.sha256, attempted: true };
  mockList.mockResolvedValue({ can_write: false, files: [file] });
  await expect(saveProjectDocument(scope, saved, true)).resolves.toEqual(file);
  expect(mockRead).not.toHaveBeenCalled();
  expect(mockUpload).not.toHaveBeenCalled();
});
test("closed/missing write authority keeps an incomplete request without uploading", async () => {
  mockList.mockResolvedValue({ can_write: false, files: [] });
  await expect(saveProjectDocument(scope, request(), false)).rejects.toThrow(
    "saved request has been kept",
  );
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});
test("changed original file bytes and mismatched receipts never clear the saved request", async () => {
  mockList.mockResolvedValue({ can_write: true, files: [] });
  await expect(
    saveProjectDocument(
      scope,
      { ...request(), sha256: "wrong-original-hash" },
      false,
    ),
  ).rejects.toThrow("original file changed");
  expect(mockUpload).not.toHaveBeenCalled();
  mockUpload.mockResolvedValueOnce({ ...file, id: "unexpected-id" });
  await expect(saveProjectDocument(scope, request(), false)).rejects.toThrow(
    "receipt could not be verified",
  );
  expect(mockRemove).not.toHaveBeenCalled();
});
