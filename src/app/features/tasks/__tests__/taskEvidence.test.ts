import { beforeEach, expect, jest, test } from "@jest/globals";
import { sendTaskEvidence, type EvidenceRequest } from "../taskEvidence";
import { draftStore } from "../../../../platform/draftStore";
import { readEvidenceFile } from "../../../../platform/evidenceFiles";

const mockReceipt = jest.fn<() => Promise<unknown>>();
const mockRpc = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpload = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockInfo = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSession = jest.fn<() => Promise<unknown>>();
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: { getSession: () => mockSession() },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: () => mockReceipt(),
      };
      return query;
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        info: (...args: unknown[]) => mockInfo(...args),
      }),
    },
  },
}));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { set: jest.fn() },
}));
jest.mock("../../../../platform/evidenceFiles", () => ({
  readEvidenceFile: jest.fn(),
}));
jest.mock(
  "../../../../core/web/app/features/tasks/services/leadershipReviewReadinessService",
  () => ({
    assertTaskSubtasksReady: jest.fn(),
    assertLeadershipReviewReady: jest.fn(),
  }),
);

const receipt = { id: "request", task_id: "root", submitter_id: "actor" };
const attempt = (): EvidenceRequest => ({
  id: "request",
  note: "Safe QA note",
  files: [
    {
      uri: "file://cached/evidence.pdf",
      name: "evidence.pdf",
      type: "application/pdf",
      size: 4,
    },
  ],
  uploaded: [],
});
const run = (
  request: EvidenceRequest,
  verifyAccess = jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
) =>
  sendTaskEvidence({
    actor: "actor",
    taskId: "root",
    request,
    verifyAccess,
    report: jest.fn(),
  });
beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue({
    data: { session: { user: { id: "actor" } } },
  });
  mockReceipt.mockResolvedValue({ data: null });
  mockUpload.mockResolvedValue({ error: null });
  jest.mocked(readEvidenceFile).mockResolvedValue(new ArrayBuffer(4));
});

test("a previously committed exact receipt is recovered without a new upload or write", async () => {
  mockReceipt.mockResolvedValue({ data: receipt });
  await run(attempt());
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockRpc).not.toHaveBeenCalled();
});

test("an upload lost reply can be verified at the immutable path and a lost submission reply recovers its receipt", async () => {
  mockUpload.mockResolvedValueOnce({
    error: { message: "Network interruption" },
  });
  mockInfo.mockResolvedValueOnce({ data: { size: 4 } });
  mockRpc.mockResolvedValueOnce({ error: { message: "Network interruption" } });
  mockReceipt
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: receipt });
  await run(attempt());
  expect(mockUpload).toHaveBeenCalledWith(
    "root/request/0-evidence.pdf",
    expect.any(ArrayBuffer),
    { upsert: false, contentType: "application/pdf" },
  );
  expect(mockInfo).toHaveBeenCalledWith("root/request/0-evidence.pdf");
  expect(draftStore.set).toHaveBeenCalledWith(
    "actor",
    "task-evidence:root",
    expect.objectContaining({ id: "request" }),
  );
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

test("a missing or mismatched stored object blocks the review write and keeps the original request", async () => {
  mockUpload.mockResolvedValueOnce({
    error: { message: "Network interruption" },
  });
  mockInfo.mockResolvedValueOnce({ data: { size: 5 } });
  const request = attempt();
  await expect(run(request)).rejects.toThrow("Could not verify evidence.pdf");
  expect(mockRpc).not.toHaveBeenCalled();
  expect(request.uploaded).toEqual([]);
  mockRpc.mockResolvedValueOnce({
    data: {
      id: "root",
      latest_submission: { id: "request", submitterId: "actor" },
    },
  });
  await run(request);
  expect(mockUpload.mock.calls.map(([path]) => path)).toEqual([
    "root/request/0-evidence.pdf",
    "root/request/0-evidence.pdf",
  ]);
});

test("changed access after upload blocks submission without removing verified evidence", async () => {
  const verify = jest
    .fn<() => Promise<void>>()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("Access changed"));
  const request = attempt();
  await expect(run(request, verify)).rejects.toThrow("Access changed");
  expect(mockRpc).not.toHaveBeenCalled();
  expect(request.uploaded).toHaveLength(1);
});
