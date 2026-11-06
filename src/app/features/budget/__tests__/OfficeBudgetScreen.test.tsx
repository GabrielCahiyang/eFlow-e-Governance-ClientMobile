import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { OfficeBudgetScreen } from "../OfficeBudgetScreen";

jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "accountant", role: "accounting_staff", org_id: "office-a" },
    organization: { name: "QA Office" },
    can: () => true,
  }),
}));
jest.mock("../financialScope", () => ({ financialOffices: async () => [] }));
jest.mock("../useBudget", () => ({
  useBudget: () => ({ refresh: jest.fn() }),
}));
jest.mock("../CashRequestCard", () => ({ CashRequestCard: () => null }));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: async () => ({
      data: null,
      error: { message: "Summary unavailable" },
    }),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: [{ id: "fiscal-a", fiscal_year: new Date().getFullYear() }],
              error: null,
            }),
        }),
      }),
    }),
  },
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetReportReads",
  () => ({
    budgetReportRead: async () => ({
      data: [
        {
          id: "request-a",
          request_number: 1,
          purpose: "Approved QA release",
          status: "scheduled_for_release",
          requested_amount: 250,
        },
        {
          id: "request-b",
          request_number: 2,
          purpose: "Awaiting Head",
          status: "pending_department_approval",
          requested_amount: 100,
        },
      ],
    }),
  }),
);

test("Accounting shows only the cash work entry points even when the Office summary fails", async () => {
  const navigate = jest.fn();
  await render(<OfficeBudgetScreen navigate={navigate} />);
  expect(await screen.findByText("We couldn't load this information. Please try again.")).toBeOnTheScreen();
  for (const label of [
    "Annual budget",
    "General Journal",
    "Financial Audit Trail",
    "Account mapping",
    "Office petty cash",
    "Export CSV",
  ])
    expect(screen.queryByText(label)).toBeNull();

  await fireEvent.press(
    screen.getByRole("button", { name: "Requests & releases" }),
  );
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "accounting_releases",
      financialOfficeId: "office-a",
    }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Assigned reviews" }),
  );
  expect(navigate).toHaveBeenCalledWith({ name: "financial_reviews" });
});

test("the queue is independent of the summary and opens the exact authorized request context", async () => {
  const navigate = jest.fn();
  await render(
    <OfficeBudgetScreen initialView="requests" navigate={navigate} />,
  );
  const row = await screen.findByRole("button", {
    name: "FR-00001 · Approved QA release",
  });
  expect(screen.queryByText(/Awaiting Head/)).toBeNull();
  await fireEvent.changeText(
    screen.getByPlaceholderText("Search cash requests"),
    "FR-00001",
  );
  await fireEvent.press(row);
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "accounting_releases",
      recordId: "request-a",
      financialOfficeId: "office-a",
      fiscalYear: new Date().getFullYear(),
    }),
  );
});
