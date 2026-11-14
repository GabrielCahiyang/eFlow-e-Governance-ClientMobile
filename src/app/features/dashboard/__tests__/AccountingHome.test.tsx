import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { AccountingHome } from "../AccountingHome";

const mockQueueData = {
  counts: [
    { label: "Requested", count: 1 },
    { label: "Authorized or partly released", count: 2 },
    { label: "Settled", count: 5 },
  ],
  actions: [
    {
      key: "release:1",
      title: "Field Inspection Fuel",
      description: "Scheduled for release today",
      route: {
        name: "accounting_releases" as const,
        recordId: "req-1",
        financialOfficeId: "accounting-office",
        fiscalYear: 2026,
      },
      priority: 1,
      sort: 1,
    },
  ],
  outstanding: [
    {
      key: "out:1",
      title: "IT Hardware Maintenance",
      status: "released",
      amount: { label: "Released", value: 18200 },
      route: {
        name: "accounting_releases" as const,
        recordId: "req-2",
        financialOfficeId: "accounting-office",
        fiscalYear: 2026,
      },
    },
  ],
};

const mockReviewsData = [
  {
    key: "finance-review:1",
    title: "Office Supplies Liquidation",
    description: "Action required · Independent receipt review",
    route: {
      name: "financial_reviews" as const,
      recordId: "liq-1",
    },
    priority: 1,
    sort: 2,
  },
];

const mockSummaryData = {
  approved: 1250000,
  settled: 342500,
};

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: {
      id: "officer-1",
      org_id: "accounting-office",
      role: "accounting_staff",
      full_name: "Maria Santos",
      is_active: true,
    },
    organization: {
      id: "accounting-office",
      name: "City Accounting Office",
    },
    can: () => true,
  }),
}));

jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({
    selected: {
      workspace: {
        id: "workspace-1",
        office_id: "accounting-office",
        name: "Accounting Workspace",
      },
    },
    refresh: async () => {},
  }),
}));

jest.mock("../homeFinance", () => ({
  accountingHomeQueue: async () => mockQueueData,
  assignedFinanceReviews: async () => mockReviewsData,
}));

jest.mock("../../budget/officeFinancialSummary", () => ({
  officeFinancialSummary: async () => mockSummaryData,
}));

test("AccountingHome renders officer hero, action cards, pipeline strip, outstanding items, and financial summary", async () => {
  const navigate = jest.fn();
  const view = await render(<AccountingHome navigate={navigate} />);

  // No bulky header container
  expect(view.queryByText("Financial Work")).toBeNull();
  expect(view.queryByText("City Accounting Office")).toBeNull();
  expect(view.queryByText("Accounting Staff · Maria Santos")).toBeNull();

  // Action Required Cards
  expect(view.getByText("Field Inspection Fuel")).toBeOnTheScreen();
  expect(view.getByText("Cash release due")).toBeOnTheScreen();
  expect(view.getByText("Office Supplies Liquidation")).toBeOnTheScreen();
  expect(view.getByText("Review required")).toBeOnTheScreen();

  // Action card tap
  await fireEvent.press(
    view.getByRole("button", { name: "Field Inspection Fuel" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "accounting_releases",
    recordId: "req-1",
    financialOfficeId: "accounting-office",
    fiscalYear: 2026,
  });

  // Financial Workflow Pipeline
  expect(
    view.getByRole("button", { name: "See all requests and releases" }),
  ).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "See all requests and releases" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "accounting_releases",
    financialOfficeId: "accounting-office",
    fiscalYear: 2026,
  });

  // Outstanding Transactions
  expect(view.getByText("IT Hardware Maintenance")).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "IT Hardware Maintenance" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "accounting_releases",
    recordId: "req-2",
    financialOfficeId: "accounting-office",
    fiscalYear: 2026,
  });

  // Financial Summary Tiles
  expect(view.getByText("Approved appropriation")).toBeOnTheScreen();
  expect(view.getByText("Settled expenditure")).toBeOnTheScreen();
});

