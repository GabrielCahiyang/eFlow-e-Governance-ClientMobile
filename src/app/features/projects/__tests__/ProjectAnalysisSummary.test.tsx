import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ProjectAnalysisSummary } from "../ProjectAnalysisSummary";

jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "qa-head" } }),
}));
jest.mock("../subscriptions", () => ({ netProjectUpdates: () => () => {} }));
jest.mock("../services", () => ({
  fetchProjectAnalysisTasks: async () => [
    {
      id: "task",
      linkedProjectId: "project",
      status: "completed",
      title: "Book venue",
      deadline: "2026-11-07T04:00:00Z",
    },
  ],
}));
jest.mock(
  "../../../../core/web/app/features/team-management/services/teamWorkflowFactsService",
  () => ({
    fetchTeamWorkflowFacts: async () => ({
      subtasks: [], progress: [], evidence: [], statusHistory: [],
      submissions: [{
        kind: "task", taskId: "task", status: "approved", version: 1,
        submittedAt: Date.parse("2026-11-07T05:00:00Z"),
        decidedAt: Date.parse("2026-11-07T08:00:00Z"),
      }],
    }),
  }),
);

test("project completion, late submission and review time use separate dates", async () => {
  const onOpenWeb = jest.fn();
  const view = await render(<ProjectAnalysisSummary
    project={{
      id: "project", title: "Community outreach", status: "completed",
      targetDate: "2026-11-11", completedAt: "2026-11-09T04:00:00Z",
      description: "", priority: "medium", createdAt: 1, updatedAt: 2,
    }}
    onOpenWeb={onOpenWeb}
  />);
  expect(await view.findByText("Completed 2 days early")).toBeOnTheScreen();
  expect(view.getByText("1 of 1 with comparable dates")).toBeOnTheScreen();
  expect(view.getByText("3.0 hr")).toBeOnTheScreen();
  await fireEvent.press(view.getByRole("button", { name: "Open full analysis on eFlow Web" }));
  expect(onOpenWeb).toHaveBeenCalledTimes(1);
});
