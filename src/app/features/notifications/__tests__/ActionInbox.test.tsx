import { expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { ActionInbox } from "../ActionInbox";
import {
  markRecentNotificationRead,
  type Notification,
} from "../../../../core/web/app/services/notificationService";
import { fetchInboxUpdatePage } from "../inboxUpdates";
import { getAssignedIndependentReviews } from "../../../../core/web/app/features/budget/services/independentReviewService";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
import type { SectionListProps } from "react-native";

const mockEnd =
  jest.fn<(callback: SectionListProps<unknown>["onEndReached"]) => void>();
jest.mock("../../../components/ui/FolderRefresh", () => {
  const real = jest.requireActual<
    typeof import("../../../components/ui/FolderRefresh")
  >("../../../components/ui/FolderRefresh");
  return {
    ...real,
    RefreshSectionList: (props: SectionListProps<unknown>) => {
      mockEnd(props.onEndReached);
      return <real.RefreshSectionList {...props} />;
    },
  };
});

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
  markRecentNotificationRead: jest.fn(),
}));
jest.mock("../inboxUpdates", () => ({ fetchInboxUpdatePage: jest.fn() }));
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

test("notifications skip review sources and change read state only after a confirmed write", async () => {
  jest
    .mocked(getAssignedIndependentReviews)
    .mockRejectedValue(new Error("Missing backend prerequisite"));
  jest
    .mocked(fetchInboxUpdatePage)
    .mockResolvedValueOnce({
      items: [
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
      ],
    })
    .mockRejectedValue(new Error("Refresh unavailable"));
  jest
    .mocked(markRecentNotificationRead)
    .mockRejectedValueOnce(new Error("Read denied"))
    .mockResolvedValueOnce(undefined);
  const navigate = jest.fn();
  await render(<ActionInbox navigate={navigate} />);
  expect(await screen.findByText("Permit assignment")).toBeOnTheScreen();
  expect(getAssignedIndependentReviews).not.toHaveBeenCalled();
  expect(screen.queryByText("Awaiting your review")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Assigned decisions" }),
  ).toBeNull();
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
    expect(
      screen.getByText("We couldn't load this information. Please try again."),
    ).toBeOnTheScreen(),
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
  jest.mocked(fetchInboxUpdatePage).mockResolvedValue({ items: [] });
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

test("older updates append on scroll, retry without duplicates, and survive a read refresh", async () => {
  const update = (id: string, title: string): Notification => ({
    id,
    title,
    message: "Assignment update",
    type: "assignment",
    read: false,
    createdAt: 1,
  });
  const first = update("first", "First update");
  const older = update("older", "Older update");
  const cursor = { createdAt: "2026-11-09T13:30:00+00:00", id: first.id };
  const read = jest
    .mocked(fetchInboxUpdatePage)
    .mockClear()
    .mockImplementation(async (_actor, unread, before) => {
      if (unread)
        return { items: [update("deep-unread", "Unread update from history")] };
      return before
        ? { items: [first, older] }
        : { items: [first], next: cursor };
    });
  jest.mocked(markRecentNotificationRead).mockResolvedValue(undefined);
  await render(<ActionInbox navigate={jest.fn()} />);
  expect(await screen.findByText("First update")).toBeOnTheScreen();
  expect(read).toHaveBeenCalledTimes(1);
  read.mockRejectedValueOnce(new Error("Offline"));
  const reachEnd = mockEnd.mock.lastCall![0]!;
  await act(async () => {
    reachEnd({ distanceFromEnd: 0 });
    reachEnd({ distanceFromEnd: 0 });
  });
  expect(read).toHaveBeenCalledTimes(2);
  expect(screen.getByText("First update")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Older update")).toBeOnTheScreen();
  expect(screen.getAllByText("First update")).toHaveLength(1);
  expect(read.mock.calls[2]?.[2]).toEqual(cursor);

  await fireEvent.press(
    screen.getAllByRole("button", { name: "Mark read" })[1],
  );
  expect(await screen.findByText("Read")).toBeOnTheScreen();
  expect(screen.getByText("Older update")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Unread notifications" }),
  );
  expect(
    await screen.findByText("Unread update from history"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Older update")).toBeNull();
  expect(read).toHaveBeenLastCalledWith("actor", true);
});
