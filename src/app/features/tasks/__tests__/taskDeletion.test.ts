import { beforeEach, expect, jest, test } from "@jest/globals";
import { supabase } from "../../../../platform/supabase";
import { assertEvidenceActor } from "../taskEvidence";
import {
  deleteUnstartedTask,
  taskCanBeDeletedBeforeStart,
} from "../taskDeletion";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
jest.mock("../../../../platform/supabase", () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));
jest.mock("../taskEvidence", () => ({
  assertEvidenceActor: jest.fn(async () => {}),
}));
const task = {
  id: "task",
  linkedProjectId: "project",
  orgId: "office",
  status: "todo",
} as Task;
let row: Record<string, unknown> | null;
let project: Record<string, unknown>;
beforeEach(() => {
  jest.clearAllMocks();
  row = {
    id: "task",
    linked_project_id: "project",
    org_id: "office",
    status: "todo",
    percent_complete: 0,
  };
  project = {
    id: "project",
    org_id: "office",
    project_lead_id: "actor",
    status: "active",
  };
  jest.mocked(supabase.from).mockImplementation(((table: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      is: () => q,
      maybeSingle: async () => ({
        error: null,
        data:
          table === "tasks"
            ? row
            : table === "projects"
              ? project
              : {
                  id: "actor",
                  org_id: "office",
                  role: "member",
                  is_active: true,
                },
      }),
    };
    return q;
  }) as never);
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue({ data: false, error: null } as never);
});
test("an authorized Project Lead deletes an unstarted Task using the existing RPC after fresh reads", async () => {
  await deleteUnstartedTask(task, "actor");
  expect(assertEvidenceActor).toHaveBeenCalledTimes(2);
  expect(supabase.rpc).toHaveBeenLastCalledWith("soft_delete_task", {
    p_task_id: "task",
  });
});
test.each([
  "in_progress",
  "for_review",
  "completed",
  "changes_requested",
  "cancelled",
])("a Task that changed to %s is not deleted", async (status) => {
  row!.status = status;
  await expect(deleteUnstartedTask(task, "actor")).rejects.toThrow(
    "Only an unstarted task",
  );
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(
    taskCanBeDeletedBeforeStart({ status: status as Task["status"] }),
  ).toBe(false);
});
test("an unrelated Member cannot delete even an unstarted Task", async () => {
  project.project_lead_id = "other";
  await expect(deleteUnstartedTask(task, "actor")).rejects.toThrow(
    "Only an authorized",
  );
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});
test("an uncertain earlier deletion is not blindly replayed against an unavailable record", async () => {
  row = null;
  await expect(deleteUnstartedTask(task, "actor")).rejects.toThrow(
    "unavailable or has already been deleted",
  );
  expect(supabase.rpc).not.toHaveBeenCalled();
});
