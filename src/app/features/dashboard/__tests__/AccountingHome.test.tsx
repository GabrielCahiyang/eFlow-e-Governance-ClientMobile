import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { nativeWindow } from "../../../../platform/webRuntime";
import { NavigationHeaderContext } from "../../navigation/navigationHeaderContext";
import { AccountingHome } from "../AccountingHome";

const mockQueueData = {
  counts: [
    { label: "Requested", count: 1 },
    { label: "Authorized or partly released", count: 2 },
    { label: "Settled", count: 5 },
  ],
  actions: [
    {
      key: "cash-release:1",
      title: "Field Inspection Fuel",
      description: "Action required · Scheduled cash release",
      route: {
        name: "accounting_releases" as const,
        recordId: "req-1",
        financialOfficeId: "accounting-office",
        fiscalYear: 2026,
      },
      priority: 1,
      sort: 1,
    },
    {
      key: "settlement:1",
      title: "Field Transport",
      description: "Action required · Post settlement",
      route: {
        name: "accounting_releases" as const,
        recordId: "req-3",
        financialOfficeId: "accounting-office",
        fiscalYear: 2026,
      },
      priority: 2,
      sort: 3,
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

const mockSummaryData: {
  approved?: number;
  released?: number;
  pending?: number;
  settled?: number;
  available?: number;
  committed?: number;
  dailyLimit?: number;
  releasedToday?: number;
  scheduledToday?: number;
  dailyRemaining?: number;
} = {
  approved: 1250000,
  released: 750000,
  pending: 500000,
  settled: 342500,
  available: 650000,
  committed: 600000,
  dailyLimit: 50000,
  releasedToday: 12000,
  scheduledToday: 8000,
  dailyRemaining: 30000,
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

jest.mock("../../communication", () => ({
  useConversationDirectory: () => ({ data: [] }),
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

const mockAccountingHomeQueue = jest.fn(async () => mockQueueData);
const mockAssignedFinanceReviews = jest.fn(async () => mockReviewsData);
const mockOfficeBudgetPosition = jest.fn(async () => mockSummaryData);

jest.mock("../homeFinance", () => ({
  accountingHomeQueue: () => mockAccountingHomeQueue(),
  assignedFinanceReviews: () => mockAssignedFinanceReviews(),
}));

jest.mock("../../budget/officeFinancialSummary", () => ({
  officeBudgetPosition: () => mockOfficeBudgetPosition(),
}));

jest.mock("../../budget/useOfficeFinanceUpdates", () => ({
  useOfficeFinanceUpdates: jest.fn(),
}));

test("AccountingHome renders officer hero, action cards, cash & budget position, and outstanding items", async () => {
  const navigate = jest.fn();
  const view = await render(<AccountingHome navigate={navigate} />);

  // No bulky header container; Office context stays in the hero subtitle.
  expect(view.queryByText("Financial Work")).toBeNull();
  expect(view.getByText("City Accounting Office")).toBeOnTheScreen();
  expect(view.queryByText("Accounting Staff · Maria Santos")).toBeNull();

  // Action Required Cards
  expect(view.getByText("Field Inspection Fuel")).toBeOnTheScreen();
  expect(view.getByText("Release cash")).toBeOnTheScreen();
  expect(view.getByText("Office Supplies Liquidation")).toBeOnTheScreen();
  expect(view.getByText("Review receipts")).toBeOnTheScreen();
  expect(view.getByText("Field Transport")).toBeOnTheScreen();
  expect(view.getByText("Post settlement")).toBeOnTheScreen();
  expect(view.queryAllByText(/^Action required ·/)).toHaveLength(0);

  // Action card tap
  await fireEvent.press(
    view.getByRole("button", { name: "Release cash, Field Inspection Fuel" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "accounting_releases",
    recordId: "req-1",
    financialOfficeId: "accounting-office",
    fiscalYear: 2026,
  });

  // Cash & budget position replaces the legacy Financial workflow pill cloud
  expect(view.queryByText("Financial workflow")).toBeNull();
  expect(view.getByText("Cash & budget position")).toBeOnTheScreen();
  expect(view.getByText("Available Office budget")).toBeOnTheScreen();
  expect(view.getByText("₱650,000.00")).toBeOnTheScreen();
  expect(view.getByText("Budget released")).toBeOnTheScreen();
  expect(view.getByText("₱750,000.00")).toBeOnTheScreen();
  expect(view.getByText("Pending release")).toBeOnTheScreen();
  expect(view.getByText("₱500,000.00")).toBeOnTheScreen();
  expect(view.getByText("Daily release capacity")).toBeOnTheScreen();
  expect(view.getByText("₱30,000.00")).toBeOnTheScreen();
  expect(
    view.getByRole("button", { name: "Open Office budget summary" }),
  ).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "Open Office budget summary" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "accounting_overview",
    view: "overview",
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

  // Financial Summary Hero Tiles (non-clickable)
  expect(view.queryByText("Financial summary")).toBeNull();
  expect(view.getByText("Approved appropriation")).toBeOnTheScreen();
  expect(view.getByText("Settled expenditure")).toBeOnTheScreen();
  expect(view.getByText("₱1,250,000.00")).toBeOnTheScreen();
  expect(view.getByText("₱342,500.00")).toBeOnTheScreen();
  expect(
    view.queryByRole("button", { name: /Approved appropriation/ }),
  ).toBeNull();
  expect(
    view.queryByRole("button", { name: /Settled expenditure/ }),
  ).toBeNull();
  expect(
    view.queryByRole("button", { name: /3 financial actions required/ }),
  ).toBeNull();
  navigate.mockClear();
  await fireEvent.press(view.getByText("Approved appropriation"));
  await fireEvent.press(view.getByText("Settled expenditure"));
  await fireEvent.press(view.getByText("Actions required"));
  expect(navigate).not.toHaveBeenCalled();
});

test("AccountingHome flags when the daily release ceiling is reached and preserves missing amounts", async () => {
  mockOfficeBudgetPosition.mockResolvedValueOnce({
    approved: 250000,
    settled: 1040,
    available: 148960,
    dailyLimit: 15000,
    releasedToday: 15000,
    dailyRemaining: 0,
  });
  const view = await render(<AccountingHome navigate={jest.fn()} />);

  expect(view.getByText("Cash & budget position")).toBeOnTheScreen();
  expect(view.getByText("₱0.00")).toBeOnTheScreen();
  expect(
    view.getByText("Daily ceiling reached · ₱15,000.00 released today"),
  ).toBeOnTheScreen();
  expect(view.getAllByText("—").length).toBeGreaterThanOrEqual(2);
});

test("AccountingHome keeps action cards and budget position visible during background refresh", async () => {
  const view = await render(<AccountingHome navigate={jest.fn()} />);
  expect(view.getByText("Field Inspection Fuel")).toBeOnTheScreen();
  expect(view.getByText("Approved appropriation")).toBeOnTheScreen();
  expect(view.getByText("Available Office budget")).toBeOnTheScreen();

  let resolveQueue!: (value: typeof mockQueueData) => void;
  let resolveSummary!: (value: typeof mockSummaryData) => void;
  let resolveReviews!: (value: typeof mockReviewsData) => void;
  mockAccountingHomeQueue.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveQueue = resolve;
      }),
  );
  mockOfficeBudgetPosition.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
  );
  mockAssignedFinanceReviews.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveReviews = resolve;
      }),
  );

  await act(async () => {
    nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
  });

  expect(view.getByText("Field Inspection Fuel")).toBeOnTheScreen();
  expect(view.getByText("Office Supplies Liquidation")).toBeOnTheScreen();
  expect(view.getByText("Approved appropriation")).toBeOnTheScreen();
  expect(view.getByText("Available Office budget")).toBeOnTheScreen();
  expect(view.queryByLabelText("Loading financial summary")).toBeNull();
  expect(view.queryByLabelText("Loading budget position")).toBeNull();

  await act(async () => {
    resolveQueue(mockQueueData);
    resolveSummary(mockSummaryData);
    resolveReviews(mockReviewsData);
  });
});

test("AccountingHome renders illustrated empty states for empty Action required and Outstanding transactions", async () => {
  mockAccountingHomeQueue.mockResolvedValueOnce({
    counts: [],
    actions: [],
    outstanding: [],
  });
  mockAssignedFinanceReviews.mockResolvedValueOnce([]);
  const view = await render(<AccountingHome navigate={jest.fn()} />);

  expect(view.getByRole("header", { name: "All clear" })).toBeOnTheScreen();
  expect(
    view.getByText("No verified actions in your assigned Office."),
  ).toBeOnTheScreen();
  expect(
    view.getByRole("header", { name: "No unresolved requests in this preview" }),
  ).toBeOnTheScreen();
});

test("AccountingHome extends HomeBody flush to the bottom without an awkward shadow or bottom container gap", async () => {
  const view = await render(
    <NavigationHeaderContext.Provider
      value={{
        onBack: jest.fn(),
        backHint: "Returns to Home",
        topInset: 24,
        bottomInset: 108,
      }}
    >
      <AccountingHome navigate={jest.fn()} />
    </NavigationHeaderContext.Provider>,
  );

  const homeBody = view.getByTestId("home-body");
  const bodyStyle = StyleSheet.flatten(homeBody.props.style);
  expect(bodyStyle).toMatchObject({
    flexGrow: 1,
    paddingBottom: 124,
  });
  expect(bodyStyle.marginBottom).toBeUndefined();
  expect(bodyStyle.elevation).toBeUndefined();
  expect(bodyStyle.shadowOpacity).toBeUndefined();
  expect(bodyStyle.shadowRadius).toBeUndefined();

  let scroll = homeBody.parent;
  while (scroll && !scroll.props?.contentContainerStyle) {
    scroll = scroll.parent;
  }
  expect(scroll).toBeTruthy();
  expect(
    StyleSheet.flatten(scroll?.props.contentContainerStyle).paddingBottom,
  ).toBe(0);
});

