import { expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { BudgetReleaseHistory } from "../BudgetReleaseHistory";
import {
  confirmOfficeBudgetRelease,
  fetchBudgetSections,
} from "../../../../core/web/app/features/budget/services/budgetSectionService";

jest.mock("../useOfficeFinanceUpdates", () => ({
  useOfficeFinanceUpdates: jest.fn(),
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "accountant" } } },
      }),
    },
    rpc: async () => ({
      data: { orgId: "office", fiscalYear: 2026, status: "locked" },
    }),
  },
}));
jest.mock("../../../../core/web/app/shared/calendarDates", () => ({
  getPhilippineCalendarDate: () => "2026-11-13",
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetSectionService",
  () => ({
    confirmOfficeBudgetRelease: jest.fn(),
    fetchBudgetSections: jest.fn(),
  }),
);

const snapshot = (version: number, canConfirmBudgetReleases: boolean) =>
  ({
    sectionsVersion: version,
    canConfirmBudgetReleases,
    releaseScheduleAvailable: true,
    sections: [
      {
        id: "account",
        name: "Supplies",
        releaseSchedule: [
          { id: "due", date: "2026-11-13", amount: 25000, status: "pending" },
          { id: "later", date: "2026-11-25", amount: 25000, status: "pending" },
        ],
      },
    ],
  }) as Awaited<ReturnType<typeof fetchBudgetSections>>;

test("only due releases with a current Accounting grant can be confirmed", async () => {
  jest.mocked(fetchBudgetSections).mockResolvedValue(snapshot(4, true));
  await render(
    <BudgetReleaseHistory
      actor="accountant"
      office="office"
      year={2026}
      onChanged={async () => {}}
    />,
  );
  expect(await screen.findByText("Release due")).toBeOnTheScreen();
  expect(screen.getByText("Scheduled")).toBeOnTheScreen();
  const [due] = screen.getAllByRole("button", { name: "Confirm availability" });
  expect(
    screen.getAllByRole("button", { name: "Confirm availability" }),
  ).toHaveLength(1);
  await fireEvent.press(due);
  await fireEvent.changeText(
    screen.getByLabelText("Reference or note"),
    "Budget release reference",
  );
  jest.mocked(fetchBudgetSections).mockResolvedValue(snapshot(4, false));
  const buttons = screen.getAllByRole("button", {
    name: "Confirm availability",
  });
  await fireEvent.press(buttons[buttons.length - 1]);
  await waitFor(() =>
    expect(
      screen.getByText(/no longer available to confirm/),
    ).toBeOnTheScreen(),
  );
  expect(confirmOfficeBudgetRelease).not.toHaveBeenCalled();
});
