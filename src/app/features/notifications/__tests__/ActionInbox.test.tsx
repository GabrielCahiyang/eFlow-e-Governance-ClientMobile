import { expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { ActionInbox } from "../ActionInbox";
import {
  fetchRecentNotifications,
  markRecentNotificationRead,
} from "../../../../core/web/app/services/notificationService";
import { getAssignedIndependentReviews } from "../../../../core/web/app/features/budget/services/independentReviewService";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor", role: "member" } }),
}));
jest.mock("../../tasks", () => ({
  useTaskFacts: () => ({ ...mockEmpty, data: mockTasks }),
}));
jest.mock("../../personal-work/WorkFeedProvider", () => ({
  useMobileWorkFeed: () => ({
    ...mockEmpty,
    data: { rows: [], issues: [], unavailable: [] },
  }),
}));
jest.mock("../../../../core/web/app/services/notificationService", () => ({
  fetchRecentNotifications: jest.fn(),
  markRecentNotificationRead: jest.fn(),
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/independentReviewService",
  () => ({
    getAssignedIndependentReviews: jest.fn(),
  }),
);
jest.mock(
  "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService",
  () => ({
    fetchPersonalSubtaskReviews: async () => [],
  }),
);
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
const mockEmpty = { data: [], loading: false, refresh: async () => {} };
let mockTasks: Task[] = [];

test("updates survive an unavailable finance source and read state changes only after a confirmed write", async () => {
  jest
    .mocked(getAssignedIndependentReviews)
    .mockRejectedValue(new Error("Missing backend prerequisite"));
  jest
    .mocked(fetchRecentNotifications)
    .mockResolvedValueOnce([
      {
        id: "update",
        title: "Permit assignment",
        message: "New assignment",
        type: "assignment",
        taskId: "root",
        projectId: "project",
        workNodeId: "node",
        read: false,
        createdAt: 1,
      },
    ])
    .mockRejectedValue(new Error("Refresh unavailable"));
  jest
    .mocked(markRecentNotificationRead)
    .mockRejectedValueOnce(new Error("Read denied"))
    .mockResolvedValueOnce(undefined);
  const navigate = jest.fn();
  await render(<ActionInbox navigate={navigate} />);
  await waitFor(() =>
    expect(
      screen.getByText("Assigned financial reviews couldn't load. Please try again."),
    ).toBeOnTheScreen(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Open related item" }),
  );
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "root",
      projectId: "project",
      nodeId: "node",
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Mark read" }));
  await waitFor(() =>
    expect(screen.getByText("We couldn't load this information. Please try again.")).toBeOnTheScreen(),
  );
  expect(screen.getByRole("button", { name: "Mark read" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Mark read" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Mark read" })).toBeNull(),
  );
  expect(screen.getByText("Read")).toBeOnTheScreen();
  expect(markRecentNotificationRead).toHaveBeenLastCalledWith(
    "actor",
    "update",
  );
});

test("the decisions section deduplicates one exact assigned root and excludes the actor's own submission", async () => {
  const assigned = {
    id: "assigned",
    linkedProjectId: "project",
    title: "Independent decision",
    status: "for_review",
    reviewerId: "actor",
    latestSubmission: { submitterId: "worker" },
  } as Task;
  mockTasks = [
    assigned,
    assigned,
    {
      ...assigned,
      id: "self",
      title: "My own evidence",
      latestSubmission: { ...assigned.latestSubmission!, submitterId: "actor" },
    },
  ];
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  jest.mocked(fetchRecentNotifications).mockResolvedValue([]);
  const navigate = jest.fn();
  try {
    await render(<ActionInbox navigate={navigate} initialView="decisions" />);
    expect(
      screen.getAllByRole("button", { name: "Independent decision" }),
    ).toHaveLength(1);
    expect(screen.queryByText("My own evidence")).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "Independent decision" }),
    );
    expect(navigate).toHaveBeenCalledWith({
      name: "task",
      id: "assigned",
      projectId: "project",
      view: "review",
    });
  } finally {
    mockTasks = [];
  }
});
