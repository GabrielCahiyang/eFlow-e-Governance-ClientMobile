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
import { fetchInboxUpdatePage, markAllInboxUpdatesRead } from "../inboxUpdates";
import { confirmAction } from "../../../shared/confirm";
import { getAssignedIndependentReviews } from "../../../../core/web/app/features/budget/services/independentReviewService";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
import type { SectionListProps } from "react-native";
import { fetchAssignedSubtaskReviews } from "../../tasks/assignedSubtaskReviews";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";

jest.mock("../../tasks/assignedSubtaskReviews", () => ({
  ...jest.requireActual<typeof import("../../tasks/assignedSubtaskReviews")>("../../tasks/assignedSubtaskReviews"),
  fetchAssignedSubtaskReviews: jest.fn(async () => []),
}));
jest.mock("../../../../core/web/app/features/nested-work/services/workTreeService", () => ({
  fetchWorkTree: jest.fn(),
}));

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
jest.mock("../inboxUpdates", () => ({
  fetchInboxUpdatePage: jest.fn(),
  markAllInboxUpdatesRead: jest.fn(),
}));
jest.mock("../../../shared/confirm", () => ({ confirmAction: jest.fn() }));
jest.mock("../useInboxCounts", () => ({
  useInboxCounts: () => ({
    data: { all: 3, work: 2, messages: 0, finance: 1, collaboration: 0 },
    refresh: async () => {},
    refreshIfStale: async () => {},
  }),
}));
// The native bottom sheet ignores presses under test; render plain options.
jest.mock("../../../components/ui/SelectionSheet", () => ({
  SelectionSheet: ({
    open,
    options,
    onSelect,
  }: React.ComponentProps<
    typeof import("../../../components/ui/SelectionSheet").SelectionSheet
  >) => {
    const { Pressable, Text } = require("react-native");
    return open
      ? options.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.title}
            onPress={() => onSelect(option.id)}
          >
            <Text>{option.title}</Text>
          </Pressable>
        ))
      : null;
  },
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

test("a cash-blocked assigned proposal survives an empty notification feed and opens its exact branch", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  jest.mocked(fetchAssignedSubtaskReviews).mockResolvedValueOnce([{
    id: "proposal", root_id: "root", node_id: "node", task_title: "Task title",
    subtask_title: "Submit receipts", kind: "completion", submitted_at: "2026-11-14", cash_blocked: true,
  }]);
  jest.mocked(fetchWorkTree).mockResolvedValueOnce({
    root: { id: "root", kind: "office", project: "project" },
    nodes: [{ id: "node", task_id: "root" }],
  } as Awaited<ReturnType<typeof fetchWorkTree>>);
  const navigate = jest.fn();
  await render(<ActionInbox navigate={navigate} initialView="decisions" />);
  expect(await screen.findByText("Task title · Waiting for cash settlement")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Submit receipts"));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
    name: "task", id: "root", projectId: "project", nodeId: "node",
    recordType: "work_proposal", recordId: "proposal",
  })));
});

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
    .mockReset()
    .mockRejectedValueOnce(new Error("Read denied"))
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
  // Tapping the card opens the exact record and marks it read in the
  // background; a failed background write stays silent and keeps the dot.
  const card = screen.getByRole("button", { name: /Permit assignment/ });
  expect(card.props.accessibilityHint).toBe("View subtask");
  await fireEvent.press(card);
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "root",
      projectId: "project",
      nodeId: "node",
    }),
  );
  await waitFor(() =>
    expect(markRecentNotificationRead).toHaveBeenCalledTimes(1),
  );
  expect(
    screen.queryByText("We couldn't load this information. Please try again."),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Mark as read" }));
  await waitFor(() =>
    expect(
      screen.getByText("We couldn't load this information. Please try again."),
    ).toBeOnTheScreen(),
  );
  expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Mark as read" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Mark as read" })).toBeNull(),
  );
  expect(screen.getByText("Permit assignment")).toBeOnTheScreen();
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
  // Older updates load only on request, never automatically on scroll.
  expect(mockEnd.mock.lastCall?.[0]).toBeUndefined();
  await fireEvent.press(screen.getByRole("button", { name: "View more" }));
  expect(read).toHaveBeenCalledTimes(2);
  expect(screen.getByText("First update")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Older update")).toBeOnTheScreen();
  expect(screen.getAllByText("First update")).toHaveLength(1);
  expect(read.mock.calls[2]?.[2]).toEqual(cursor);

  await fireEvent.press(
    screen.getAllByRole("button", { name: "Mark as read" })[1],
  );
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "Mark as read" })).toHaveLength(
      1,
    ),
  );
  expect(screen.getByText("Older update")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Show: All updates" }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Unread" }));
  expect(
    await screen.findByText("Unread update from history"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Older update")).toBeNull();
  expect(read).toHaveBeenLastCalledWith(
    "actor",
    true,
    undefined,
    undefined,
    { category: "all", search: "" },
  );
});

test("type chips load server-filtered pages and combine with Unread", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  const item = (id: string, title: string, type: string): Notification => ({
    id,
    title,
    message: "",
    type: type as Notification["type"],
    read: false,
    createdAt: 1,
  });
  jest.mocked(fetchInboxUpdatePage).mockReset();
  jest
    .mocked(fetchInboxUpdatePage)
    .mockImplementation(async (_actor, unread, _before, _signal, filters) =>
      unread
        ? { items: [] }
        : filters?.category === "finance"
          ? { items: [item("cash", "Cash approved", "petty_cash_decision")] }
          : {
              items: [
                item("work", "Permit assignment", "assignment"),
                item("cash", "Cash approved", "petty_cash_decision"),
              ],
            },
    );
  await render(<ActionInbox navigate={jest.fn()} />);
  expect(await screen.findByText("Permit assignment")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "All updates" })).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", { name: "Finance notifications, 1 unread" }),
  );
  expect(await screen.findByText("Finance updates")).toBeOnTheScreen();
  expect(screen.getByText("Cash approved")).toBeOnTheScreen();
  expect(screen.queryByText("Permit assignment")).toBeNull();
  expect(fetchInboxUpdatePage).toHaveBeenCalledWith(
    "actor",
    false,
    undefined,
    undefined,
    { category: "finance", search: "" },
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Show: All updates" }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Unread" }));
  expect(
    await screen.findByText("No unread finance updates"),
  ).toBeOnTheScreen();
  expect(fetchInboxUpdatePage).toHaveBeenCalledWith(
    "actor",
    true,
    undefined,
    undefined,
    { category: "finance", search: "" },
  );

  // Returning to the defaults shows the unfiltered feed again.
  await fireEvent.press(
    screen.getByRole("button", { name: "All notification types, 3 unread" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Show: Unread" }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "All updates" }));
  expect(await screen.findByText("Permit assignment")).toBeOnTheScreen();

  // "Read" asks the server for read updates only.
  await fireEvent.press(
    screen.getByRole("button", { name: "Show: All updates" }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Read" }));
  // The fixture only has unread rows, so even a stray unread row is kept out.
  expect(await screen.findByText("No read updates")).toBeOnTheScreen();
  expect(screen.queryByText("Permit assignment")).toBeNull();
  expect(fetchInboxUpdatePage).toHaveBeenCalledWith(
    "actor",
    false,
    undefined,
    undefined,
    { category: "all", search: "", readOnly: true },
  );
});

test("review type chips narrow assigned reviews without changing their destinations", async () => {
  mockTasks = [
    {
      id: "assigned",
      linkedProjectId: "project",
      title: "Independent decision",
      status: "for_review",
      reviewerId: "actor",
      latestSubmission: { submitterId: "worker" },
    } as Task,
  ];
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  jest.mocked(fetchInboxUpdatePage).mockResolvedValue({ items: [] });
  jest.mocked(fetchAssignedSubtaskReviews).mockResolvedValueOnce([
    {
      id: "proposal",
      root_id: "root",
      node_id: "node",
      task_title: "Task title",
      subtask_title: "Submit receipts",
      kind: "completion",
      submitted_at: "2026-11-14",
      cash_blocked: false,
    },
  ]);
  const navigate = jest.fn();
  try {
    await render(<ActionInbox navigate={navigate} initialView="decisions" />);
    expect(await screen.findByText("Submit receipts")).toBeOnTheScreen();
    expect(screen.getByText("Independent decision")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Subtasks reviews" }),
    );
    expect(screen.getByText("Submit receipts")).toBeOnTheScreen();
    expect(screen.queryByText("Independent decision")).toBeNull();

    await fireEvent.press(
      screen.getByRole("button", { name: "Financial reviews" }),
    );
    expect(
      screen.getByText("No financial reviews assigned to you"),
    ).toBeOnTheScreen();
    // Chips stay available so the reviewer can switch back.
    await fireEvent.press(screen.getByRole("button", { name: "Tasks reviews" }));
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

test("older pages loaded under one filter never leak into another filter's list", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  const update = (id: string, title: string, type = "assignment"): Notification => ({
    id,
    title,
    message: "",
    type: type as Notification["type"],
    read: false,
    createdAt: 1,
  });
  const shared = update("shared", "Shared boundary", "petty_cash_decision");
  const older = update("older", "Older work update");
  const cursor = { createdAt: "2026-11-09T13:30:00+00:00", id: shared.id };
  jest.mocked(fetchInboxUpdatePage).mockReset();
  jest
    .mocked(fetchInboxUpdatePage)
    .mockImplementation(async (_actor, _unread, before, _signal, filters) =>
      filters?.category === "finance"
        ? // Same boundary row as the Work view's first page.
          { items: [shared], next: cursor }
        : before
          ? { items: [older] }
          : { items: [shared], next: cursor },
    );
  await render(<ActionInbox navigate={jest.fn()} />);
  expect(await screen.findByText("Shared boundary")).toBeOnTheScreen();
  // Visit Finance first so its page is cached and returns instantly later.
  await fireEvent.press(
    screen.getByRole("button", { name: "Finance notifications, 1 unread" }),
  );
  expect(await screen.findByText("Finance updates")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Work notifications, 2 unread" }),
  );
  expect(await screen.findByText("Work updates")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "View more" }));
  expect(await screen.findByText("Older work update")).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", { name: "Finance notifications, 1 unread" }),
  );
  expect(await screen.findByText("Finance updates")).toBeOnTheScreen();
  expect(screen.getByText("Shared boundary")).toBeOnTheScreen();
  expect(screen.queryByText("Older work update")).toBeNull();
});

test("search waits for typing to pause, filters on the server, and can be cleared", async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
    jest.mocked(fetchInboxUpdatePage).mockReset();
    jest
      .mocked(fetchInboxUpdatePage)
      .mockImplementation(async (_actor, _unread, _before, _signal, filters) =>
        filters?.search
          ? { items: [] }
          : {
              items: [
                {
                  id: "u1",
                  title: "Permit assignment",
                  message: "",
                  type: "assignment",
                  read: true,
                  createdAt: 1,
                },
              ],
            },
      );
    await render(<ActionInbox navigate={jest.fn()} />);
    expect(await screen.findByText("Permit assignment")).toBeOnTheScreen();
    const field = screen.getByLabelText("Search updates");
    await fireEvent.changeText(field, "zoning (draft)");
    // No request until typing pauses.
    expect(
      jest.mocked(fetchInboxUpdatePage).mock.calls.some((call) => !!call[4]?.search),
    ).toBe(false);
    await act(async () => jest.advanceTimersByTime(300));
    expect(await screen.findByText("No matching updates")).toBeOnTheScreen();
    expect(fetchInboxUpdatePage).toHaveBeenCalledWith(
      "actor",
      false,
      undefined,
      undefined,
      { category: "all", search: "zoning draft" },
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Clear search and filters" }),
    );
    expect(await screen.findByText("Permit assignment")).toBeOnTheScreen();
    expect(field.props.value).toBe("");
  } finally {
    jest.useRealTimers();
  }
});

test("mark all read asks first, confirms the server write, and reports failures", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  jest.mocked(fetchInboxUpdatePage).mockReset();
  let read = false;
  jest.mocked(fetchInboxUpdatePage).mockImplementation(async () => ({
    items: [
      {
        id: "u1",
        title: "Permit assignment",
        message: "",
        type: "assignment",
        read,
        createdAt: 1,
      },
    ],
  }));
  jest
    .mocked(confirmAction)
    .mockResolvedValueOnce(false)
    .mockResolvedValue(true);
  jest
    .mocked(markAllInboxUpdatesRead)
    .mockReset()
    .mockRejectedValueOnce(new Error("Write denied"))
    .mockImplementationOnce(async () => {
      read = true;
      return 1;
    });
  await render(<ActionInbox navigate={jest.fn()} />);
  expect(await screen.findByText("Permit assignment")).toBeOnTheScreen();

  // Declining the confirmation writes nothing.
  await fireEvent.press(screen.getByRole("button", { name: "Mark all read" }));
  expect(markAllInboxUpdatesRead).not.toHaveBeenCalled();

  // A failed write is reported and the update stays unread.
  await fireEvent.press(screen.getByRole("button", { name: "Mark all read" }));
  await waitFor(() =>
    expect(
      screen.getByText("We couldn't load this information. Please try again."),
    ).toBeOnTheScreen(),
  );
  expect(screen.getByRole("button", { name: "Mark as read" })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Mark all read" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Mark as read" })).toBeNull(),
  );
  expect(markAllInboxUpdatesRead).toHaveBeenLastCalledWith("actor");
});

test("reviews renders summary hero counts, Waiting cash pill, and searchable recovery", async () => {
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  jest.mocked(fetchAssignedSubtaskReviews).mockResolvedValueOnce([
    {
      id: "prop-1",
      root_id: "root-1",
      node_id: "node-1",
      task_title: "Site Fiber Upgrade",
      subtask_title: "Configure floor 2 rack",
      kind: "completion",
      submitted_at: "2026-11-14",
      cash_blocked: true,
    },
  ]);
  await render(<ActionInbox navigate={jest.fn()} initialView="decisions" />);
  expect(await screen.findByText("WORK REVIEWS")).toBeOnTheScreen();
  expect(screen.getByText("FINANCIAL REVIEWS")).toBeOnTheScreen();
  expect(screen.getByText("Waiting cash")).toBeOnTheScreen();

  await fireEvent.changeText(
    screen.getByPlaceholderText("Search reviews"),
    "no-such-review",
  );
  expect(screen.getByText("No matching reviews")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByText("Configure floor 2 rack")).toBeOnTheScreen();
});

test("empty updates and reviews views render caught-up states without refresh buttons", async () => {
  jest.mocked(fetchInboxUpdatePage).mockResolvedValueOnce({ items: [] });
  jest.mocked(getAssignedIndependentReviews).mockResolvedValue([]);
  jest.mocked(fetchAssignedSubtaskReviews).mockResolvedValueOnce([]);

  await render(<ActionInbox navigate={jest.fn()} initialView="notifications" />);
  expect(await screen.findByText("You're all caught up")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Refresh updates" })).toBeNull();

  await render(<ActionInbox navigate={jest.fn()} initialView="decisions" />);
  expect(await screen.findByText("You're all caught up")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Refresh reviews" })).toBeNull();
});
