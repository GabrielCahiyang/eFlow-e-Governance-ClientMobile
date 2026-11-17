import { beforeEach, expect, jest, test } from "@jest/globals";
import { sharedWorkRpc } from "../../../shared/sharedWorkRequest";
import {
  fetchWorkFinancialClearance,
  fetchReceiptSubmissionClearance,
  fetchCashReturnClearance,
  verifySavedReturn,
  verifySavedCompletion,
} from "../workFinancialClearance";
jest.mock("../../../shared/sharedWorkRequest", () => ({
  sharedWorkRpc: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
});
test.each([
  null,
  {
    version: 1,
    rootId: "other",
    nodeId: null,
    workAccepted: true,
    cashOutstanding: false,
    completed: false,
    canFinalize: true,
  },
  {
    version: 1,
    rootId: "task",
    nodeId: "wrong-branch",
    workAccepted: true,
    cashOutstanding: false,
    completed: false,
    canFinalize: true,
  },
  {
    version: 1,
    rootId: "task",
    nodeId: null,
    workAccepted: true,
    cashOutstanding: undefined,
    completed: false,
    canFinalize: true,
  },
])(
  "rejects missing or foreign work clearance instead of granting completion: %j",
  async (value) => {
    jest.mocked(sharedWorkRpc).mockResolvedValue(value);
    await expect(fetchWorkFinancialClearance("task")).rejects.toThrow(
      "could not be verified",
    );
  },
);
test("keeps receipt authority bound to its exact request", async () => {
  jest
    .mocked(sharedWorkRpc)
    .mockResolvedValue({
      version: 1,
      requestId: "other",
      workAccepted: true,
      canSubmit: true,
    });
  await expect(fetchReceiptSubmissionClearance("request")).rejects.toThrow(
    "could not be verified",
  );
});
test.each([
  null,
  {
    version: 1,
    liquidationId: "other",
    packageVersion: 2,
    amount: 1500,
    received: true,
    approved: true,
    canAcknowledge: false,
    canApprove: false,
  },
  {
    version: 1,
    liquidationId: "package",
    packageVersion: 2,
    amount: NaN,
    received: true,
    approved: true,
    canAcknowledge: false,
    canApprove: false,
  },
])("rejects unknown or mismatched return evidence: %j", async (value) => {
  jest.mocked(sharedWorkRpc).mockResolvedValue(value);
  await expect(fetchCashReturnClearance("package")).rejects.toThrow(
    "could not be verified",
  );
});

const command = "00000000-0000-4000-8000-000000000001";
test.each([
  {
    p_liquidation: "other",
    p_version: 1,
    p_amount: 1500,
    p_action: "acknowledge",
    p_reference: "OR-42",
    p_key: command,
  },
  {
    p_liquidation: "package",
    p_version: 2,
    p_amount: 1500,
    p_action: "acknowledge",
    p_reference: "OR-42",
    p_key: command,
  },
  {
    p_liquidation: "package",
    p_version: 1,
    p_amount: 1500,
    p_action: "approve",
    p_reference: "OR-42",
    p_key: "different",
  },
])(
  "never replays a saved cash return into a foreign or changed record: %j",
  (args) => {
    expect(() =>
      verifySavedReturn({ id: command, args }, "package", 1, 1500),
    ).toThrow("saved cash-return action");
  },
);
test("never replays completion into a different branch", () => {
  expect(() =>
    verifySavedCompletion(
      { id: command, args: { p_root: "task", p_node: "other" } },
      "task",
      "node",
    ),
  ).toThrow("saved completion");
});
