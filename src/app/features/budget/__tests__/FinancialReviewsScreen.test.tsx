import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { FinancialReviewsScreen } from "../FinancialReviewsScreen";
import { getAssignedIndependentReviews } from "../../../../core/web/app/features/budget/services/independentReviewService";

const mockCreateReceiptSignedUrl = jest.fn(
  async (_path: string) => "https://example.test/or-44192.pdf",
);

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: {
      id: "reviewer-1",
      role: "accounting_staff",
      org_id: "office-a",
      is_active: true,
    },
    organization: { id: "office-a", name: "Engineering Office" },
    can: () => true,
  }),
}));
jest.mock("../SettlementPanel", () => ({ SettlementPanel: () => null }));
jest.mock("../../../shared/liveUpdates", () => ({
  createLiveRefreshController: () => ({
    schedule: jest.fn(),
    dispose: jest.fn(),
    onChannelStatus: jest.fn(),
  }),
}));
jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => ({
    on() {
      return this;
    },
    subscribe() {
      return this;
    },
  }),
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: { removeChannel: jest.fn() },
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/independentReviewService",
  () => ({
    getAssignedIndependentReviews: jest.fn(),
  }),
);
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetService",
  () => ({
    createReceiptSignedUrl: (...args: Parameters<typeof mockCreateReceiptSignedUrl>) =>
      mockCreateReceiptSignedUrl(...args),
  }),
);

beforeEach(() => {
  mockCreateReceiptSignedUrl.mockClear();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

test("renders navy financial review hero and receipt evidence inset cards", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([
    {
      year: 2026,
      request: {
        id: "req-10",
        requestNumber: 10,
        purpose: "Office internet & printer toner",
        status: "pending_department_settlement",
      },
      liquidation: {
        id: "liq-1",
        version: 1,
        status: "pending_department_settlement",
        declaredSpent: 3890,
        returnedAmount: 360,
        receipts: [
          {
            id: "rec-1",
            vendor: "FiberCorp Solutions",
            receiptNumber: "OR #44192",
            amount: 2490,
            description: "Monthly office fiber",
            filePath: "receipts/or-44192.pdf",
            mimeType: "application/pdf",
          },
        ],
      },
      context: { review: { id: "rev-1" } },
    } as unknown as Awaited<ReturnType<typeof getAssignedIndependentReviews>>[number],
  ]);

  await render(<FinancialReviewsScreen />);
  expect(await screen.findByText("FR-00010")).toBeOnTheScreen();
  expect(screen.getByText("DECLARED SPENT")).toBeOnTheScreen();
  expect(screen.getByText("1 file")).toBeOnTheScreen();
  expect(screen.getByText("FiberCorp Solutions")).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", {
      name: "Open receipt evidence for FiberCorp Solutions",
    }),
  );
  expect(mockCreateReceiptSignedUrl).toHaveBeenCalledWith(
    "receipts/or-44192.pdf",
  );
});

test("shows an empty state when no review packages are assigned", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  await render(<FinancialReviewsScreen />);
  expect(
    await screen.findByText("No assigned packages waiting"),
  ).toBeOnTheScreen();
});
