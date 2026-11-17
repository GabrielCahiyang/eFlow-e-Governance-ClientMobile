import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ReportsScreen } from "../ReportsScreen";
import { useOfficeAnalytics } from "../../analytics";
import { exportNativeReport } from "../exportReport";

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
jest.mock("../exportReport", () => ({ exportNativeReport: jest.fn() }));
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
  expect(
    screen.getByTestId("skeleton-reports"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Open reports in eFlow Web" }),
  ).toBeNull();
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

test("Office Analytics switches report tabs, opens filters and saves a report with viewer guidance", async () => {
  jest.mocked(exportNativeReport).mockResolvedValue("Open the saved report in Excel.");
  jest.mocked(useOfficeAnalytics).mockReturnValue({
    loading: false,
    stale: false,
    key: "report-ready",
    refresh: async () => {},
    refreshIfStale: async () => {},
    data: {
      profiles: [],
      organizations: [],
      projects: [
        {
          id: "proj-1",
          title: "Digital Registry",
          description: "Registry modernization",
          status: "active",
          priority: "high",
          orgId: "office",
          ownerId: "head",
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ],
      tasks: [
        {
          id: "task-1",
          title: "Procure Field Kits",
          status: "in_progress",
          priority: "high",
          orgId: "office",
          assigneeId: "head",
          assigneeName: "QA Head",
          linkedProjectId: "proj-1",
          projectTitle: "Digital Registry",
          percentComplete: 50,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ],
      employees: [
        {
          id: "head",
          name: "QA Head",
          email: "head@example.com",
          jobTitle: "Office Head",
          jobDescription: "Office Lead",
          currentWorkload: 1,
          department: "Planning Office",
        },
      ],
      facts: {
        subtasks: [],
        progress: [],
        submissions: [],
        statusHistory: [],
        evidence: [],
      },
      attention: [],
      health: {
        activeTasks: 1,
        activeSubtasks: 0,
        completedTasks: 0,
        overdue: 0,
        blocked: 0,
        stalled: 0,
        awaitingReview: 0,
        changesRequested: 0,
        vagueSchedules: 0,
        firstPassApprovalRate: null,
        averageReviewHours: null,
      },
      memberMetrics: [],
    },
  });

  const navigate = jest.fn();
  await render(<ReportsScreen navigate={navigate} />);

  expect(
    screen.getByRole("header", { name: "Office operations" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Visible records")).toBeOnTheScreen();
  expect(screen.getByText("People")).toBeOnTheScreen();

  expect(screen.queryByRole("button", { name: /View Office budget/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /management brief/i })).toBeNull();

  await fireEvent.press(
    screen.getByRole("button", { name: "Reviews and revisions" }),
  );
  expect(
    screen.getByRole("header", { name: "Reviews and revisions" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(/Review waiting time runs from submission/),
  ).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", { name: "Office operations" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Period: Last 7 days" }),
  );
  expect(screen.getByText("1 applied")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Filters, 1 active" }));
  expect(screen.getByText("Filter records")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Reset all filters" }));

  await fireEvent.press(screen.getByRole("button", { name: "Export CSV" }));
  await waitFor(() =>
    expect(screen.getByText("Open the saved report in Excel.")).toBeOnTheScreen(),
  );
  expect(exportNativeReport).toHaveBeenCalledWith(
    "csv", expect.any(Array), "Office operations", expect.any(String), "save",
  );
});
