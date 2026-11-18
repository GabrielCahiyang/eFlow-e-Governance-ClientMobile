import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fetchInspectorFiles,
  mapInspectorFiles,
  openInspectorFile,
} from "../../../../core/web/app/features/task-inspector/services/inspectorFileService";
const mockRead = jest.fn<(table: string, task: string) => Promise<unknown>>();
const mockSign = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (_key: string, task: string) => mockRead(table, task),
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, ttl: number) =>
          mockSign(bucket, path, ttl),
      }),
    },
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockRead.mockResolvedValue({ data: [], error: null });
});
test("uses Web's seven authorized workflow sources and exact root task filter", async () => {
  expect(await fetchInspectorFiles("root-a")).toEqual([]);
  expect(mockRead.mock.calls).toEqual([
    ["task_attachments", "root-a"],
    ["task_progress_updates", "root-a"],
    ["task_submissions", "root-a"],
    ["subtask_progress_updates", "root-a"],
    ["subtask_submission_attachments", "root-a"],
    ["subtask_submissions", "root-a"],
    ["subtasks", "root-a"],
  ]);
});
test("one failed source rejects the combined list instead of showing incomplete evidence", async () => {
  mockRead.mockImplementation(async (table) =>
    table === "subtask_submissions"
      ? { error: { message: "Access denied" } }
      : { data: [] },
  );
  await expect(fetchInspectorFiles("root-a")).rejects.toThrow("Access denied");
});
test("keeps progress/submission provenance, scope titles, buckets and expiry from Web", async () => {
  const files = mapInspectorFiles(
    [
      {
        id: "a",
        file_name: "Parent.pdf",
        file_path: "task/a",
        submission_id: "s",
        created_at: "2026-11-16",
      },
    ],
    [
      {
        id: "b",
        attachment_name: "Progress.jpg",
        attachment_path: "task/b",
        author_name: "Worker",
        created_at: "2026-11-15",
      },
    ],
    [{ id: "s", version: 2, status: "approved", submitter_name: "Task Lead" }],
    [
      {
        id: "c",
        subtask_id: "sub",
        attachment_path: "sub/c",
        author_name: "Member",
        created_at: "2026-11-17",
      },
    ],
    [
      {
        id: "d",
        subtask_id: "sub",
        submission_id: "ss",
        file_path: "sub/d",
        created_at: "2026-11-18",
      },
    ],
    [
      {
        id: "ss",
        version: 1,
        status: "pending",
        submitter_name: "Subtask Lead",
      },
    ],
    [{ id: "sub", title: "Survey households" }],
  );
  expect(files[0].source).toBe("Survey households · Submission 1 (pending)");
  expect(files[0].uploader).toBe("Subtask Lead");
  expect(files[3].bucket).toBe("task-comment-attachments");
  mockSign.mockResolvedValue({
    data: { signedUrl: "https://signed.example/evidence" },
    error: null,
  });
  await openInspectorFile(files[0]);
  await openInspectorFile(files[3]);
  expect(mockSign.mock.calls).toEqual([
    ["task-attachments", "sub/d", 300],
    ["task-comment-attachments", "task/b", 600],
  ]);
});
