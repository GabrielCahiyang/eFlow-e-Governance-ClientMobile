import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ReportsScreen } from "../ReportsScreen";
import { useOfficeAnalytics } from "../../analytics";

let mockOffice = "office";
let mockPermission = true;
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "head", role: "head", is_active: true, org_id: "office" },
    organization: {
      id: "office",
      name: "Planning Office",
      head_user_id: "head",
    },
    can: () => mockPermission,
  }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({
    selected: {
      workspace: {
        id: "office-workspace",
        kind: "office",
        office_id: mockOffice,
      },
    },
  }),
}));
jest.mock("../../analytics", () => ({ useOfficeAnalytics: jest.fn() }));
jest.mock("../../tasks", () => ({}));
jest.mock("../../../../platform/config", () => ({
  backendConfig: { webOrigin: "https://eflow.test" },
}));
jest.mock("../exportReport", () => ({}));
jest.mock("../ReportRows", () => ({ ReportRows: () => null }));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));

test("Office Analytics uses an authorized Office and refuses mismatched workspaces", async () => {
  jest.mocked(useOfficeAnalytics).mockReturnValue({
    loading: true,
    stale: false,
    key: "report",
    refresh: async () => {},
    refreshIfStale: async () => {},
  });
  const navigate = jest.fn();
  const view = await render(
    <ReportsScreen navigate={navigate} initialView="reviews" />,
  );
  expect(useOfficeAnalytics).toHaveBeenCalledWith(true, "office", true, true);
  expect(
    screen.getByText(/Review waiting time runs from submission/),
  ).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Open reports in eFlow Web" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "reports",
    view: "web",
    workspaceId: "office-workspace",
  });
  jest.mocked(useOfficeAnalytics).mockClear();
  mockOffice = "other";
  await view.rerender(<ReportsScreen navigate={navigate} />);
  expect(useOfficeAnalytics).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Open reports in eFlow Web" }),
  ).toBeNull();
  mockOffice = "office";
  mockPermission = false;
  await view.rerender(<ReportsScreen navigate={navigate} />);
  expect(useOfficeAnalytics).not.toHaveBeenCalled();
  mockPermission = true;
});
