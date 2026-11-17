import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { MobileContent } from "../MobileContent";

let mockRole = "accounting_staff";
const mockOfficeBudgetScreen = jest.fn();

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "accountant", role: mockRole, org_id: "office-a" },
    can: () => true,
  }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({ selected: undefined }),
}));
jest.mock("../../projects", () => ({
  ProjectScreen: () => null,
  ProjectsScreen: () => null,
}));
jest.mock("../../tasks", () => ({ TaskDetailsScreen: () => null }));
jest.mock("../../tasks/LinkedWorkNodeScreen", () => ({
  LinkedWorkNodeScreen: () => null,
}));
jest.mock("../../personal-work", () => ({
  PersonalProjectScreen: () => null,
  PersonalWorkFeedScreen: () => null,
}));
jest.mock("../../notifications", () => ({ ActionInbox: () => null }));
jest.mock("../../communication", () => ({
  ChatScreen: () => null,
  AnnouncementsScreen: () => null,
}));
jest.mock("../../profile", () => ({ ProfileScreen: () => null }));
jest.mock("../../settings", () => ({ SettingsScreen: () => null }));
jest.mock("../../office-petty-cash", () => ({ OfficePettyCash: () => null }));
jest.mock("../../reports", () => ({ ReportsScreen: () => null }));
jest.mock("../../dashboard", () => {
  const { Text } = require("react-native");
  return {
    OverviewScreen: () => <Text>Dashboard Home</Text>,
  };
});
jest.mock("../../budget", () => {
  const { Text } = require("react-native");
  return {
    OfficeBudgetScreen: (props: Record<string, unknown>) => {
      mockOfficeBudgetScreen(props);
      return <Text>{`Budget Screen:${String(props.initialView)}`}</Text>;
    },
    FinancialReviewsScreen: () => null,
  };
});

test("accounting_overview opens OfficeBudgetScreen overview rather than looping to Home", async () => {
  mockRole = "accounting_staff";
  mockOfficeBudgetScreen.mockClear();

  const view = await render(
    <MobileContent current={{ name: "overview" }} navigate={jest.fn()} />,
  );
  expect(screen.getByText("Dashboard Home")).toBeOnTheScreen();

  await view.rerender(
    <MobileContent
      current={{ name: "accounting_overview", view: "overview", fiscalYear: 2026 }}
      navigate={jest.fn()}
    />,
  );
  expect(screen.getByText("Budget Screen:overview")).toBeOnTheScreen();
  expect(screen.queryByText("Dashboard Home")).toBeNull();
  expect(mockOfficeBudgetScreen).toHaveBeenCalledWith(
    expect.objectContaining({
      initialView: "overview",
      fiscalYear: 2026,
    }),
  );
});
