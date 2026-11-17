import { expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type {
  DepartmentBudgetBundle,
  PettyCashRequest,
} from "../../../../core/web/app/features/budget/types";
import { submitPettyCashLiquidation } from "../../../../core/web/app/features/budget/services/budgetService";
import { draftStore } from "../../../../platform/draftStore";
import { chooseFiles, asServiceFile } from "../../../../platform/files";
import { LiquidationSheet } from "../LiquidationSheet";
import { fetchReceiptSubmissionClearance } from "../workFinancialClearance";
jest.mock("../workFinancialClearance", () => ({
  fetchReceiptSubmissionClearance: jest.fn(async (id: string) => ({version:1,requestId:id,workAccepted:true,canSubmit:true})),
}));

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor" } }),
}));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    get: jest.fn(async () => null),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../../platform/files", () => ({
  chooseFiles: jest.fn(),
  asServiceFile: jest.fn(),
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetService",
  () => ({
    submitPettyCashLiquidation: jest.fn(),
  }),
);

test("receipt editor preserves other receipts and never freezes an invalid package", async () => {
  const view = await render(
    <LiquidationSheet
      request={
        {
          id: "request",
          requestNumber: 3,
          releasedAmount: 100,
        } as PettyCashRequest
      }
      bundle={{ allocationLines: [] } as unknown as DepartmentBudgetBundle}
      onClose={jest.fn()}
      onSaved={async () => {}}
      readOnly={false}
    />,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Vendor")).toBeEnabled(),
  );
  await fireEvent.changeText(screen.getByLabelText("Vendor"), "First shop");
  await fireEvent.press(
    screen.getByRole("button", { name: "Add another receipt" }),
  );
  expect(screen.getAllByLabelText("Vendor")).toHaveLength(1);
  await fireEvent.changeText(screen.getByLabelText("Vendor"), "Second shop");
  await fireEvent.press(
    screen.getByRole("button", { name: "Receipt 1 · First shop" }),
  );
  expect(screen.getByLabelText("Vendor").props.value).toBe("First shop");
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit receipts for review" }),
  );
  expect(draftStore.set).not.toHaveBeenCalled();
  expect(submitPettyCashLiquidation).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Vendor")).toBeEnabled();
  await view.unmount();
});

test("an unconfirmed receipt package keeps the original key for retry", async () => {
  const file = {
    uri: "file:///receipt.pdf",
    name: "receipt.pdf",
    size: 4,
    type: "application/pdf",
    arrayBuffer: async () => new ArrayBuffer(4),
  };
  jest.mocked(chooseFiles).mockResolvedValueOnce([file]);
  jest.mocked(asServiceFile).mockResolvedValue(file as unknown as File);
  jest
    .mocked(submitPettyCashLiquidation)
    .mockResolvedValueOnce("null")
    .mockResolvedValueOnce("8812d5c8-adac-4a19-a34a-b782377cff12");
  const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  await render(
    <LiquidationSheet
      request={
        {
          id: "request-retry",
          requestNumber: 4,
          releasedAmount: 50,
        } as PettyCashRequest
      }
      bundle={{ allocationLines: [] } as unknown as DepartmentBudgetBundle}
      onClose={jest.fn()}
      onSaved={onSaved}
      readOnly={false}
    />,
  );
  await waitFor(() => expect(screen.getByLabelText("Vendor")).toBeEnabled());
  for (const [label, value] of [
    ["Vendor", "Example shop"],
    ["Expense description", "Supplies"],
    ["Receipt amount", "50"],
    ["Liquidation note", "Recorded supplies"],
  ]) {
    await fireEvent.changeText(screen.getByLabelText(label), value);
  }
  await fireEvent.press(
    screen.getByRole("button", { name: "Attach receipt image or PDF (required)" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit receipts for review" }),
  );
  const retry = await screen.findByRole("button", {
    name: "Submit receipts for review",
  });
  expect(onSaved).not.toHaveBeenCalled();
  await fireEvent.press(retry);
  expect(
    await screen.findByText("Receipt package submitted."),
  ).toBeOnTheScreen();
  const attempts = jest.mocked(submitPettyCashLiquidation).mock.calls;
  expect(attempts[0][0].idempotencyKey).toBe(attempts[1][0].idempotencyKey);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test("financial receipts stay locked before work acceptance, while required attachment copy remains clear", async () => {
  jest.mocked(fetchReceiptSubmissionClearance).mockResolvedValueOnce({version:1,requestId:"locked-request",workAccepted:false,canSubmit:false});
  const view = await render(<LiquidationSheet request={{id:"locked-request",requestNumber:5,releasedAmount:50} as PettyCashRequest}
    bundle={{allocationLines:[]} as unknown as DepartmentBudgetBundle} onClose={jest.fn()} onSaved={async()=>{}} readOnly={false}/>);
  expect(await screen.findByText("Receipts become available after the work is accepted.")).toBeOnTheScreen();
  expect(screen.getByRole("button",{name:"Attach receipt image or PDF (required)"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"Submit receipts for review"})).toBeDisabled();
  await view.unmount();
});
