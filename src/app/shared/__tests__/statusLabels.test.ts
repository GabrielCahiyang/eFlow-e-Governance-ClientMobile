import { expect, test } from "@jest/globals";
import { statusLabel, workDisplayStatus } from "../statusLabels";

test("status copy can change by code and context without changing stored values", () => {
  expect(statusLabel("for_review")).toBe("Awaiting approval");
  expect(statusLabel("changes_requested")).toBe("Changes requested");
  expect(statusLabel("approved")).toBe("Approved");
  expect(statusLabel("stuck")).toBe("Stuck");
  expect(statusLabel("approved", "finance")).toBe("Authorized");
  expect(
    statusLabel("approved", "finance", { finance: { approved: "Cleared" } }),
  ).toBe("Cleared");
  expect(
    statusLabel("completed", undefined, { shared: { completed: "Closed" } }),
  ).toBe("Closed");
  expect(statusLabel("constructor")).toBe("Constructor");
});

test("workDisplayStatus shows stuck only when active work has a non-empty blocker", () => {
  expect(workDisplayStatus("in_progress", "Permit missing")).toBe("stuck");
  expect(workDisplayStatus("in_progress", "   ")).toBe("in_progress");
  expect(workDisplayStatus("in_progress", null)).toBe("in_progress");
  expect(workDisplayStatus("todo", "Permit missing")).toBe("todo");
  expect(workDisplayStatus("completed", "Permit missing")).toBe("completed");
});
