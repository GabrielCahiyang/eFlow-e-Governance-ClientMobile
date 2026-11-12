import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SettlementPanel } from "../SettlementPanel";
import type { SettlementReview } from "../staffingEscalation";
import type {
  PettyCashRequest,
  PettyCashLiquidation,
} from "../../../../core/web/app/features/budget/types";

let mockContext: SettlementReview | undefined;
let mockRole = "accounting_staff";
let mockLoading = false;
let mockError: Error | undefined;
const mockRun = jest.fn();
const mockApproval = jest.fn<
  (name: string, args: Record<string, unknown>) => Promise<{ data: string; error: null }>
>();
const mockReadReview = jest.fn<() => Promise<SettlementReview>>();

jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: (...args: Parameters<typeof mockApproval>) => mockApproval(...args),
  },
}));
jest.mock("../../../shared/confirm", () => ({
  confirmAction: async () => true,
}));
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: {
      id: mockRole === "head" ? "head-a" : "accounting-a",
      role: mockRole,
      org_id: "office-a",
      is_active: true,
    },
    organization: { id: "office-a", head_user_id: "head-a" },
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
    getIndependentReview: () => mockReadReview(),
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
  taskId: "task-a",
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
  mockRole = "accounting_staff";
  mockLoading = false;
  mockError = undefined;
  mockRun.mockClear();
  mockApproval.mockReset();
  mockReadReview.mockReset();
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

test("the appointed Head gets the server-authorized fallback posting action", async () => {
  mockRole = "head";
  mockContext!.headEscalationFingerprint = "current-package";
  mockContext!.headCanPostSettlement = true;
  await render(renderPanel());
  await fireEvent.changeText(
    screen.getByLabelText("Review note"),
    "Verified receipts and returned cash.",
  );
  expect(
    screen.getByRole("button", { name: "Approve and post settlement" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: /^Settle and post$/ }),
  ).toBeNull();
});

test("Head fallback reports posting only after the same liquidation version is confirmed", async () => {
  mockRole = "head";
  mockContext!.headEscalationFingerprint = "current-package";
  mockContext!.headCanPostSettlement = true;
  mockApproval.mockResolvedValue({ data: "command", error: null });
  mockReadReview
    .mockResolvedValueOnce(mockContext!)
    .mockResolvedValueOnce({ ...mockContext!, headSettlementPosted: false })
    .mockResolvedValueOnce(mockContext!)
    .mockResolvedValueOnce({ ...mockContext!, headSettlementPosted: true });
  await render(renderPanel());
  await fireEvent.changeText(
    screen.getByLabelText("Review note"),
    "Verified receipts.",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Approve and post settlement" }),
  );
  const [post, message] = mockRun.mock.calls[0] as [
    () => Promise<void>,
    string,
  ];
  expect(message).toBe("Settlement posted.");
  await expect(post()).rejects.toThrow(/could not be verified/);
  await expect(post()).resolves.toBeUndefined();
  expect(mockApproval).toHaveBeenCalledWith(
    "approve_liquidation_staffing_escalation",
    expect.objectContaining({
      p_liquidation_id: liquidation.id,
      p_version: 1,
      p_fingerprint: "current-package",
      p_reason: "Verified receipts.",
    }),
  );
});

test("a notified conflicted Accounting Officer gets the escalation status and no posting action", async () => {
  mockContext!.headAlertStatus = "notified";
  await render(renderPanel());
  expect(
    screen.getByText(/Automatically escalated to the Head/),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /post settlement|settle and post/i }),
  ).toBeNull();
});

test("a blocked package has one clear warning and no unusable review-note form", async () => {
  await render(renderPanel());
  expect(
    screen.getAllByText(/An independent Accounting Officer must be assigned/),
  ).toHaveLength(1);
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
  expect(
    screen.getByText("We couldn't load this information. Please try again."),
  ).toBeOnTheScreen();
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
