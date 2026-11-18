import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  saveSubtaskWorkUpdate,
  SubtaskWorkUpdateRejectedError,
} from "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService";

const mockUpload = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRemove = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRpc = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockBucket = jest.fn((bucket: string) => ({ upload: mockUpload, remove: mockRemove }));
jest.mock("../../../../core/web/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: { from: (bucket: string) => mockBucket(bucket) },
  },
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));

// The native file adapter sends bytes with File-compatible validation metadata.
const evidence = (name = "proof final.pdf") => Object.assign(new ArrayBuffer(1), {
  name, size: 1, type: "application/pdf",
}) as unknown as File;
const input = () => ({ subtaskId: "child", state: "in_progress" as const, note: " Ready ", attachment: evidence() });
const uploadedPath = () => mockUpload.mock.calls[0][0];

beforeEach(() => {
  mockUpload.mockReset();
  mockRemove.mockReset();
  mockRpc.mockReset();
  mockBucket.mockClear();
  mockBucket.mockImplementation(() => ({ upload: mockUpload, remove: mockRemove }));
  mockUpload.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
});

test("successful direct update references its accepted progress path and preserves evidence", async () => {
  await saveSubtaskWorkUpdate(input());
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(uploadedPath()).toMatch(/^subtasks\/child\/progress\/\d+-proof_final.pdf$/);
  expect(mockUpload).toHaveBeenCalledWith(uploadedPath(), expect.any(ArrayBuffer), { upsert: false, contentType: "application/pdf" });
  expect(mockBucket).toHaveBeenCalledWith("task-attachments");
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(mockRpc).toHaveBeenCalledWith("save_subtask_work_update", {
    p_subtask_id: "child", p_state: "in_progress", p_note: "Ready",
    p_blocker: null, p_next_step: null, p_attachment_path: uploadedPath(), p_attachment_name: "proof final.pdf",
  });
  expect(mockRemove).not.toHaveBeenCalled();
});

test.each(["file", "size", "note", "blocker", "nextStep"])("rejects invalid %s before upload or RPC", async scenario => {
  const request = { ...input(), blocker: "Waiting", nextStep: "Ask lead" };
  if (scenario === "file") request.attachment = evidence("proof.exe");
  if (scenario === "size") Object.assign(request.attachment, { size: 26 * 1024 * 1024 });
  if (scenario === "note") request.note = "x".repeat(3001);
  if (scenario === "blocker") request.blocker = "x".repeat(3001);
  if (scenario === "nextStep") request.nextStep = "x".repeat(301);
  await expect(saveSubtaskWorkUpdate(request)).rejects.toMatchObject({ code: "22023" });
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});

test("requires a blocker before any I/O", async () => {
  await expect(saveSubtaskWorkUpdate({ ...input(), state: "stuck", blocker: " " })).rejects.toBeInstanceOf(SubtaskWorkUpdateRejectedError);
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});

test.each(["returned", "thrown"])("%s upload failure sends no update and removes no evidence", async kind => {
  if (kind === "returned") mockUpload.mockResolvedValue({ error: { code: "403", message: "Upload denied" } });
  else mockUpload.mockRejectedValue(new TypeError("Network request failed"));
  await expect(saveSubtaskWorkUpdate(input())).rejects.toBeInstanceOf(SubtaskWorkUpdateRejectedError);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});

test.each(["22023", "23514", "42501", "40001", "P0001", "40P01", "55P03", "PGRST202"])(
  "returned rejection %s cleans only this attempt's upload and preserves the code", async code => {
    mockRpc.mockResolvedValue({ error: { code, message: "Original rejection" } });
    await expect(saveSubtaskWorkUpdate(input())).rejects.toMatchObject({ code, message: "Original rejection" });
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith([uploadedPath()]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  },
);

test.each(["returned", "thrown"])("%s cleanup failure never hides the original structured rejection", async kind => {
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "Original rejection" } });
  if (kind === "returned") mockRemove.mockResolvedValue({ error: { message: "Cleanup denied" } });
  else mockRemove.mockRejectedValue(new Error("Cleanup offline"));
  const result = saveSubtaskWorkUpdate(input());
  await expect(result).rejects.toBeInstanceOf(SubtaskWorkUpdateRejectedError);
  await expect(result).rejects.toMatchObject({ code: "42501", message: "Original rejection" });
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

test.each([
  { code: "08006", message: "Connection lost" },
  { code: "57014", message: "Timeout" },
  { code: "PGRST000", message: "Transport failure" },
  { code: "", message: "Permission denied", status: 503 },
  { code: "", message: "Revision changed" },
  { code: "XX000", message: "Internal failure", status: 500 },
  { code: "P0002", message: "Unknown failure" },
])("uncertain returned response $code retains the upload regardless of message", async error => {
  mockRpc.mockResolvedValue({ error });
  const result = saveSubtaskWorkUpdate(input());
  await expect(result).rejects.toMatchObject(error);
  await expect(result).rejects.not.toBeInstanceOf(SubtaskWorkUpdateRejectedError);
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(mockRemove).not.toHaveBeenCalled();
});

test.each([
  new TypeError("Network request failed"),
  Object.assign(new Error("Timed out"), { name: "TimeoutError" }),
  new Error("Permission denied"),
  { code: "42501", message: "Unclassified thrown exception" },
])("thrown RPC exception retains the file and original exception", async error => {
  mockRpc.mockRejectedValue(error);
  await expect(saveSubtaskWorkUpdate(input())).rejects.toBe(error);
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(mockRemove).not.toHaveBeenCalled();
});

test("commit followed by response loss leaves evidence available to activity and file opening", async () => {
  const objects = new Map<string, unknown>();
  let committedPath: string | undefined;
  mockUpload.mockImplementation(async (path, file) => { objects.set(path as string, file); return { error: null }; });
  mockRpc.mockImplementation(async (_rpc, args) => {
    committedPath = (args as { p_attachment_path: string }).p_attachment_path;
    throw new TypeError("Network request failed");
  });
  await expect(saveSubtaskWorkUpdate(input())).rejects.toThrow("Network request failed");
  // Models the committed history reference; this is not a hosted signed-URL test.
  expect(committedPath).toBe(uploadedPath());
  expect(objects.get(committedPath!)).toBeDefined();
  expect(mockRemove).not.toHaveBeenCalled();
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

test("rejection without a new attachment never removes existing evidence", async () => {
  mockRpc.mockResolvedValue({ error: { code: "23514", message: "Rejected" } });
  await expect(saveSubtaskWorkUpdate({ ...input(), attachment: null })).rejects.toBeInstanceOf(SubtaskWorkUpdateRejectedError);
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});
