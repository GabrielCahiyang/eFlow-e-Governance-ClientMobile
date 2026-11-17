import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { CashReturnPanel } from "../CashReturnPanel";
import { WorkFinancialClearancePanel } from "../WorkFinancialClearancePanel";
import {
  fetchCashReturnClearance,
  fetchWorkFinancialClearance,
  type CashReturnClearance,
} from "../workFinancialClearance";
import {
  saveSharedWork,
  type SharedWorkRequest,
} from "../../../shared/sharedWorkRequest";
import { clearAllFormDrafts } from "../../../shared/formDraftMemory";
import { PublicMessageError } from "../../../shared/userMessages";
let mockPending: SharedWorkRequest | undefined;
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "accounting" } }),
}));
jest.mock("../useCashRequestUpdates", () => ({
  useCashRequestUpdates: () => {},
}));
jest.mock("../../../shared/confirm", () => ({
  confirmAction: async () => true,
}));
jest.mock("../workFinancialClearance", () => ({
  ...jest.requireActual<typeof import("../workFinancialClearance")>(
    "../workFinancialClearance",
  ),
  fetchCashReturnClearance: jest.fn(),
  fetchWorkFinancialClearance: jest.fn(),
}));
jest.mock("../../../shared/sharedWorkRequest", () => ({
  saveSharedWork: jest.fn(),
}));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: async () => mockPending },
}));
const initial: CashReturnClearance = {
  version: 1,
  liquidationId: "package",
  packageVersion: 1,
  amount: 1500,
  received: false,
  approved: false,
  receivedBy: null,
  approvedBy: null,
  reference: null,
  canAcknowledge: true,
  canApprove: false,
};
const view = () =>
  render(
    <CashReturnPanel
      rootId="task"
      liquidationId="package"
      version={1}
      amount={1500}
      onSaved={async () => {}}
    />,
  );
beforeEach(() => {
  jest.clearAllMocks();
  clearAllFormDrafts();
  mockPending = undefined;
  jest.mocked(fetchCashReturnClearance).mockResolvedValue({ ...initial });
  jest.mocked(saveSharedWork).mockResolvedValue({ ...initial, received: true });
});
test("Accounting acknowledgment is distinct from Head approval and settlement", async () => {
  await view();
  const acknowledge = await screen.findByRole("button", {
    name: "Acknowledge cash received",
  });
  expect(
    screen.queryByRole("button", { name: "Approve cash return" }),
  ).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Receiving reference"),
    "OR-42",
  );
  await fireEvent.press(acknowledge);
  await waitFor(() => expect(saveSharedWork).toHaveBeenCalledTimes(1));
  expect(jest.mocked(saveSharedWork).mock.calls[0][3]).toMatchObject({
    args: { p_action: "acknowledge", p_amount: 1500, p_reference: "OR-42" },
  });
  expect(jest.mocked(saveSharedWork).mock.calls[0][2]).toBe(
    "record_cash_return",
  );
});
test("Head approval is offered only after receipt is confirmed", async () => {
  jest
    .mocked(fetchCashReturnClearance)
    .mockResolvedValue({
      ...initial,
      received: true,
      receivedBy: "receiver",
      canAcknowledge: false,
      canApprove: true,
    });
  await view();
  expect(
    await screen.findByRole("button", { name: "Approve cash return" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Acknowledge cash received" }),
  ).toBeNull();
});
test("rechecks the current return before writing; stale authority cannot acknowledge", async () => {
  await view();
  await screen.findByRole("button", { name: "Acknowledge cash received" });
  await fireEvent.changeText(
    screen.getByLabelText("Receiving reference"),
    "OR-42",
  );
  jest
    .mocked(fetchCashReturnClearance)
    .mockResolvedValue({ ...initial, canAcknowledge: false });
  await fireEvent.press(
    screen.getByRole("button", { name: "Acknowledge cash received" }),
  );
  expect(
    await screen.findByText(
      "The return or your authority changed. Refresh the receipt package.",
    ),
  ).toBeOnTheScreen();
  expect(saveSharedWork).not.toHaveBeenCalled();
});
test("an unknown return result recovers the original command instead of issuing a fresh write", async () => {
  jest
    .mocked(saveSharedWork)
    .mockImplementationOnce(async (_actor, _scope, _rpc, request) => {
      mockPending = request;
      throw new Error("Return outcome is unconfirmed.");
    });
  await view();
  await screen.findByRole("button", { name: "Acknowledge cash received" });
  await fireEvent.changeText(
    screen.getByLabelText("Receiving reference"),
    "OR-42",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Acknowledge cash received" }),
  );
  const recover = await screen.findByRole("button", {
    name: "Check saved return action",
  });
  await fireEvent.press(recover);
  await waitFor(() => expect(saveSharedWork).toHaveBeenCalledTimes(2));
  const attempts = jest.mocked(saveSharedWork).mock.calls;
  expect(attempts[1][3]).toEqual(attempts[0][3]);
  expect(attempts[1][5]).toBe(true);
});
test("work acceptance with outstanding cash does not advertise final completion", async () => {
  jest
    .mocked(fetchWorkFinancialClearance)
    .mockResolvedValue({
      version: 1,
      rootId: "task",
      nodeId: null,
      workAccepted: true,
      cashOutstanding: true,
      completed: false,
      canFinalize: false,
    });
  await render(
    <WorkFinancialClearancePanel
      root="task"
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  expect(
    await screen.findByText(
      "Work accepted. Required receipts, cash returns and settlement must be cleared before completion.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Mark as complete" })).toBeNull();
});
test("missing return capabilities never enable a decision", async () => {
  jest
    .mocked(fetchCashReturnClearance)
    .mockRejectedValue(
      new PublicMessageError("Return verification unavailable."),
    );
  await view();
  expect(
    await screen.findByText("Return verification unavailable."),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Acknowledge cash received" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Approve cash return" }),
  ).toBeNull();
});
