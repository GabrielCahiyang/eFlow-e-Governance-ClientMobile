import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { CashRequestCard } from "../CashRequestCard";
import type { CashRequestBundle } from "../focusedSubtaskFunding";
import type { PettyCashRequest } from "../../../../core/web/app/features/budget/types";

let mockRole = "accounting_staff";
let mockUserId = "accountant-1";
const mockCreateReceiptSignedUrl = jest.fn(
  async (_path: string) => "https://example.test/receipt.pdf",
);

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: {
      id: mockUserId,
      role: mockRole,
      org_id: "office-a",
      is_active: true,
    },
    organization: { id: "office-a", head_user_id: "head-a", name: "Engineering Office" },
    can: () => true,
  }),
}));

jest.mock("../SettlementPanel", () => ({ SettlementPanel: () => null }));
jest.mock("../LiquidationSheet", () => ({ LiquidationSheet: () => null }));
jest.mock("../../../../core/web/app/features/budget/services/budgetService", () => ({
  cancelContextualCashRequest: jest.fn(),
  acknowledgePettyCashRelease: jest.fn(),
  createReceiptSignedUrl: (...args: Parameters<typeof mockCreateReceiptSignedUrl>) =>
    mockCreateReceiptSignedUrl(...args),
  decidePettyCashRequest: jest.fn(),
  decidePettyCashLeaderReview: jest.fn(),
  recordAccountingRelease: jest.fn(),
}));

const baseRequest: PettyCashRequest = {
  id: "req-10",
  requestNumber: 10,
  fiscalBudgetId: "fb-1",
  commitmentId: "com-1",
  allocationId: "alloc-1",
  orgId: "office-a",
  fundingOrgId: "office-a",
  requesterOrgId: "office-a",
  taskId: "task-1",
  requesterId: "member-1",
  requesterName: "M. Reyes",
  taskTitle: "Site Fiber Upgrade",
  purpose: "Office internet & printer toner",
  requestedAmount: 4500,
  approvedAmount: 4250,
  releasedAmount: 4250,
  neededBy: "2026-11-20",
  status: "liquidation_submitted",
  createdAt: 1,
  updatedAt: 2,
};

const baseBundle: CashRequestBundle = {
  summary: { perReceiptLimit: 5000 },
  allocationLines: [],
  itemizedCashAvailable: false,
  releases: [
    {
      id: "rel-1",
      requestId: "req-10",
      orgId: "office-a",
      scheduledDate: "2026-11-18",
      amount: 4250,
      status: "released",
      voucherNumber: "PCV-2026-010",
      releaseMethod: "cash",
      createdAt: 1,
    },
  ],
  liquidations: [
    {
      id: "liq-1",
      requestId: "req-10",
      version: 1,
      status: "submitted",
      declaredSpent: 3890,
      returnedAmount: 360,
      note: "OR #44192 fiber bill and toner invoice.",
      submittedAt: 3,
      receipts: [
        {
          id: "rec-1",
          liquidationId: "liq-1",
          vendor: "FiberCorp",
          receiptDate: "2026-11-18",
          description: "Monthly fiber billing",
          amount: 2490,
          fileName: "OR-44192.pdf",
          filePath: "receipts/or-44192.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
        },
      ],
    } as unknown as CashRequestBundle["liquidations"][number],
  ],
};

beforeEach(() => {
  mockRole = "accounting_staff";
  mockUserId = "accountant-1";
  mockCreateReceiptSignedUrl.mockClear();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

test("renders compact hero with project link, keeps breakdown collapsed initially, and opens receipt pills", async () => {
  const onOpenProject = jest.fn();
  await render(
    <CashRequestCard
      request={baseRequest}
      bundle={baseBundle}
      onOpenProject={onOpenProject}
      onSaved={async () => {}}
    />,
  );

  expect(screen.getByText("FR-00010 · M. Reyes")).toBeOnTheScreen();
  expect(screen.getByText("Office internet & printer toner")).toBeOnTheScreen();
  expect(screen.getByText("Cash releases")).toBeOnTheScreen();
  expect(screen.getByText("Receipt package · v1")).toBeOnTheScreen();

  // Amount breakdown defaults collapsed (summary line shows, detail labels hidden until expanded)
  expect(screen.queryByText("Settled expenditure")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "View amount breakdown" }),
  );
  expect(screen.getByText("Settled expenditure")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Hide amount breakdown" }),
  );
  expect(screen.queryByText("Settled expenditure")).toBeNull();

  // Linked project opens directly from Hero footer
  await fireEvent.press(
    screen.getByRole("button", { name: "Open linked project" }),
  );
  expect(onOpenProject).toHaveBeenCalledTimes(1);

  // Horizontal receipt chip opens signed URL
  await fireEvent.press(
    screen.getByRole("button", { name: /FiberCorp · ₱2,490\.00 · Open receipt/ }),
  );
  expect(mockCreateReceiptSignedUrl).toHaveBeenCalledWith("receipts/or-44192.pdf");
});

test("scheduled release stays gated behind accounting release permission when readOnly is true", async () => {
  const scheduledRequest: PettyCashRequest = {
    ...baseRequest,
    status: "scheduled_for_release",
    releasedAmount: undefined,
  };
  const scheduledBundle: CashRequestBundle = {
    ...baseBundle,
    liquidations: [],
    releases: [
      {
        ...baseBundle.releases[0],
        status: "scheduled",
      },
    ],
  };

  const view = await render(
    <CashRequestCard
      request={scheduledRequest}
      bundle={scheduledBundle}
      readOnly
      onSaved={async () => {}}
    />,
  );
  expect(screen.queryByRole("button", { name: "Record cash release" })).toBeNull();

  await view.rerender(
    <CashRequestCard
      request={scheduledRequest}
      bundle={scheduledBundle}
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Record cash release" }),
  ).toBeOnTheScreen();
});
