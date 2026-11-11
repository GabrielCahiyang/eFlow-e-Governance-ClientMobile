import { expect, test } from "@jest/globals";
import { statusLabel } from "../statusLabels";

test("status copy can change by code and context without changing stored values", () => {
  expect(statusLabel("for_review")).toBe("Awaiting approval");
  expect(statusLabel("changes_requested")).toBe("Changes requested");
  expect(statusLabel("approved")).toBe("Approved");
  expect(statusLabel("approved", "finance")).toBe("Authorized");
  expect(
    statusLabel("approved", "finance", { finance: { approved: "Cleared" } }),
  ).toBe("Cleared");
  expect(
    statusLabel("completed", undefined, { shared: { completed: "Closed" } }),
  ).toBe("Closed");
  expect(statusLabel("constructor")).toBe("Constructor");
});
