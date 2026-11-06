import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SettlementPanel } from "../SettlementPanel";
import type { IndependentReviewContext } from "../../../../core/web/app/features/budget/services/independentReviewService";
import type {
  PettyCashRequest,
  PettyCashLiquidation,
} from "../../../../core/web/app/features/budget/types";

let mockContext: IndependentReviewContext | undefined;
let mockLoading = false;
let mockError: Error | undefined;
const mockRun = jest.fn();

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: {
      id: "accounting-a",
      role: "accounting_staff",
      org_id: "office-a",
    },
    organization: { id: "office-a" },
    can: () => true,
  }),
}));
jest.mock("../../../shared/useFacts", () => ({
  useFacts: () => ({
    data: mockContext,
    loading: mockLoading,
    error: mockError,
    refresh: jest.fn(),
  }),
}));
jest.mock("../useFinancialCommand", () => ({
  useFinancialAction: () => ({ run: mockRun, busy: false }),
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/independentReviewService",
  () => ({
    getIndependentReview: jest.fn(),
    routeIndependentReview: jest.fn(),
    decideIndependentReview: jest.fn(),
    independentReviewAllowsPosting: () => false,
  }),
);
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetService",
  () => ({
    decidePettyCashLiquidation: jest.fn(),
    authorizeLateLiquidation: jest.fn(),
    decidePettyCashLiquidationLeaderReview: jest.fn(),
  }),
);

const request = {
  id: "request-a",
  fundingOrgId: "office-a",
  taskLeaderId: "lead-a",
} as PettyCashRequest;
const liquidation = {
  id: "package-a",
  version: 1,
  status: "pending_department_settlement",
} as PettyCashLiquidation;
const renderPanel = () => (
  <SettlementPanel
    request={request}
    liquidation={liquidation}
    onSaved={async () => {}}
  />
);

beforeEach(() => {
  mockLoading = false;
  mockError = undefined;
  mockRun.mockClear();
  mockContext = {
    liquidationId: liquidation.id,
    version: 1,
    required: true,
    current: true,
    canReview: false,
    canSettle: false,
    review: null,
    candidates: [],
    eligibleSettlers: 0,
    escalationRequired: true,
  };
});

test("a blocked package has one clear warning and no unusable review-note form", async () => {
  await render(renderPanel());
  expect(screen.getAllByText(/An independent Accounting Officer must be assigned/)).toHaveLength(1);
  expect(screen.queryByText(/^Independent review is required/)).toBeNull();
  expect(screen.queryByText(/^No independent eligible settler/)).toBeNull();
  expect(
    screen.getByText(/An independent Accounting Officer must be assigned/),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Review note")).toBeNull();
  expect(screen.queryByText("Settle and post")).toBeNull();
  expect(mockRun).not.toHaveBeenCalled();
});

test("blocked settlement keeps an independently permitted review and its required note available", async () => {
  mockContext!.canReview = true;
  await render(renderPanel());
  const note = screen.getByLabelText("Review note");
  expect(note.props.multiline).toBe(true);
  expect(note).toHaveStyle({ minHeight: 104, textAlignVertical: "top" });
  const approve = screen.getByRole("button", {
    name: "Approve independent review",
  });
  expect(approve).toBeDisabled();
  await fireEvent.changeText(note, "Please verify the original receipt.");
  expect(approve).toBeEnabled();
  expect(screen.queryByText("Settle and post")).toBeNull();
  expect(mockRun).not.toHaveBeenCalled();
});

test("the draft survives temporary loss of available review actions", async () => {
  mockContext!.canReview = true;
  const result = await render(renderPanel());
  await fireEvent.changeText(
    screen.getByLabelText("Review note"),
    "Keep this review draft",
  );
  mockContext = undefined;
  mockLoading = true;
  await result.rerender(renderPanel());
  expect(screen.queryByLabelText("Review note")).toBeNull();
  mockLoading = false;
  mockError = new Error("Review capabilities unavailable");
  await result.rerender(renderPanel());
  expect(screen.getByText("We couldn't load this information. Please try again.")).toBeOnTheScreen();
  expect(screen.queryByLabelText("Review note")).toBeNull();
  mockError = undefined;
  mockContext = {
    liquidationId: liquidation.id,
    version: 1,
    required: true,
    current: true,
    canReview: true,
    canSettle: false,
    review: null,
    candidates: [],
    eligibleSettlers: 0,
    escalationRequired: true,
  };
  await result.rerender(renderPanel());
  expect(screen.getByLabelText("Review note").props.value).toBe(
    "Keep this review draft",
  );
  expect(mockRun).not.toHaveBeenCalled();
});
