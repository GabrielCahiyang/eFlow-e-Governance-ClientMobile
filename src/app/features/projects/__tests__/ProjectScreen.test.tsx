import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProjectScreen } from "../ProjectScreen";
import {
  fetchProjectTaskPage,
  fetchProjectBoardPage,
  fetchProjectAgendaPage,
  type ProjectTaskPage,
} from "../services";
import type { SectionListProps } from "react-native";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";

const historicalTask = {
  id: "historic-task",
  title: "Inspect the site",
  status: "completed",
  groupId: "field",
  assigneeName: "QA Owner",
  department: "Planning Office",
  dueDate: "2026-10-30",
  archivedAt: 1,
  createdAt: 1,
  updatedAt: 2,
} satisfies Task;

const mockCaptureEndReached =
  jest.fn<(callback: SectionListProps<Task>["onEndReached"]) => void>();
jest.mock("../../../components/ui/FolderRefresh", () => {
  const real = jest.requireActual<
    typeof import("../../../components/ui/FolderRefresh")
  >("../../../components/ui/FolderRefresh");
  return {
    ...real,
    RefreshSectionList: (props: SectionListProps<Task>) => {
      mockCaptureEndReached(props.onEndReached);
      return <real.RefreshSectionList {...props} />;
    },
  };
});

jest.mock("../services", () => ({
  fetchProject: jest.fn(async () => ({
    title: "Archived field survey",
    status: "archived",
  })),
  fetchProjectBoardPage: jest.fn(),
  fetchProjectAgendaPage: jest.fn(),
  fetchProjectTaskPage: jest.fn(),
  fetchProjectCompletion: jest.fn(async () => ({
    required: 130,
    completed: 52,
  })),
}));
jest.mock(
  "../../../../core/web/app/features/project-table/services/workspaceService",
  () => ({
    fetchProjectGroups: async () => [
      { id: "field", title: "Field work", color: "#579bfc" },
    ],
  }),
);
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "qa-member" } }),
}));
jest.mock("../../workspaces", () => ({ useWorkspace: () => ({}) }));
jest.mock("../subscriptions", () => ({ netProjectUpdates: () => () => {} }));
jest.mock("../projectTaskFinance", () => ({
  fetchProjectTaskFinance: async () =>
    new Map([["historic-task", { budget: 100, expense: 50 }]]),
}));
jest.mock("../ProjectPeople", () => ({ ProjectPeople: () => null }));
jest.mock("../ProjectFiles", () => ({ ProjectFiles: () => null }));
jest.mock("../ProjectOffices", () => ({ ProjectOffices: () => null }));
jest.mock("../ProjectFundingSummary", () => ({
  ProjectFundingSummary: () => null,
}));
jest.mock("../../../components/ui/SelectionSheet", () => ({
  SelectionSheet: () => null,
}));

test("an archived project loads its historical rows, supports manual refresh, and opens the exact task", async () => {
  const readTasks = jest.mocked(fetchProjectTaskPage);
  readTasks.mockImplementation(async (_id, _groups, _closed, search) => ({
    tasks: search ? [] : [historicalTask],
  }));
  const navigate = jest.fn();
  const screen = await render(
    <ProjectScreen id="archive-1" navigate={navigate} />,
  );
  const row = await screen.findByRole("button", { name: historicalTask.title });
  expect(screen.getByText(/This project is read-only/)).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Group: Field work" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Status" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Start date" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Budget" })).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Actual expense" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("header", { name: "Office" })).toBeNull();
  expect(screen.getByText("QA Owner")).toBeOnTheScreen();

  const scroll = screen.container.queryAll(
    (node) => !!node.props.onAccessibilityAction,
  )[0];
  expect(screen.queryByLabelText("Refreshing")).toBeNull();
  let finish!: (page: ProjectTaskPage) => void;
  readTasks.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => {
    scroll.props.onAccessibilityAction({
      nativeEvent: { actionName: "refresh" },
    });
  });
  expect(
    screen.getByRole("progressbar", { name: "Refreshing" }),
  ).toBeOnTheScreen();
  expect(row).toBeOnTheScreen();
  await act(async () => finish({ tasks: [historicalTask] }));
  await waitFor(() => expect(screen.queryByLabelText("Refreshing")).toBeNull());

  await fireEvent.press(
    screen.getByRole("button", { name: historicalTask.title }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "task",
    id: "historic-task",
    projectId: "archive-1",
    title: historicalTask.title,
  });
  await fireEvent.changeText(
    screen.getByPlaceholderText("Search project tasks"),
    "no match",
  );
  expect(
    await screen.findByText("No tasks match this search"),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
  expect(
    await screen.findByRole("button", { name: historicalTask.title }),
  ).toBeOnTheScreen();
});

test("Main table appends only on demand, retries the same page, and searches beyond loaded rows", async () => {
  const cursor = { group: 0, after: { position: 3, id: historicalTask.id } };
  const nextTask = {
    ...historicalTask,
    id: "next",
    title: "Inspect the next site",
  };
  const distantTask = {
    ...historicalTask,
    id: "remote",
    title: "Remote assignment",
  };
  const read = jest.mocked(fetchProjectTaskPage);
  read
    .mockClear()
    .mockImplementation(async (_id, _groups, _closed, search, after) => {
      if (search) return { tasks: [distantTask] };
      return after
        ? { tasks: [historicalTask, nextTask] }
        : { tasks: [historicalTask], next: cursor };
    });
  const screen = await render(
    <ProjectScreen id="large-project" navigate={jest.fn()} />,
  );
  expect(await screen.findByText("52 of 130 · 40%")).toBeOnTheScreen();
  expect(
    await screen.findByRole("button", { name: historicalTask.title }),
  ).toBeOnTheScreen();
  expect(fetchProjectBoardPage).not.toHaveBeenCalled();
  expect(fetchProjectAgendaPage).not.toHaveBeenCalled();
  expect(read).toHaveBeenCalledTimes(1);

  let reject!: (error: Error) => void;
  read.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const nearEnd = mockCaptureEndReached.mock.lastCall![0]!;
  await act(async () => {
    nearEnd({ distanceFromEnd: 0 });
    nearEnd({ distanceFromEnd: 0 });
  });
  expect(read).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Loading more tasks…")).toBeOnTheScreen();
  await act(async () => reject(new Error("Offline")));
  expect(
    screen.getByRole("button", { name: historicalTask.title }),
  ).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("button", { name: nextTask.title }),
  ).toBeOnTheScreen();
  expect(read.mock.calls[2]?.[4]).toBe(cursor);
  expect(
    screen.getAllByRole("button", { name: historicalTask.title }),
  ).toHaveLength(1);
  expect(mockCaptureEndReached.mock.lastCall?.[0]).toBeUndefined();

  await fireEvent.changeText(
    screen.getByPlaceholderText("Search project tasks"),
    "remote",
  );
  expect(
    await screen.findByRole("button", { name: distantTask.title }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: nextTask.title })).toBeNull();
  expect(screen.getByText("52 of 130 · 40%")).toBeOnTheScreen();
  expect(read.mock.calls[3]?.[3]).toBe("remote");
  expect(read.mock.calls[3]?.[4]).toBeUndefined();
});

test.each(["board", "calendar"] as const)(
  "%s requests the next window only near the end and keeps the project total",
  async (view) => {
    const first = { ...historicalTask, title: "First dated task" };
    const second = {
      ...historicalTask,
      id: "later",
      title: "Another dated task",
      dueDate: "2026-11-15",
    };
    const board = jest.mocked(fetchProjectBoardPage);
    const agenda = jest.mocked(fetchProjectAgendaPage);
    if (view === "board")
      board
        .mockReset()
        .mockResolvedValueOnce({ tasks: [first], next: { group: 6 } })
        .mockResolvedValueOnce({ tasks: [second] });
    else
      agenda
        .mockReset()
        .mockResolvedValueOnce({
          tasks: [first],
          next: { index: [], offset: 1 },
        })
        .mockResolvedValueOnce({ tasks: [second] });
    const read = view === "board" ? board : agenda;
    const screen = await render(
      <ProjectScreen id="archive-1" initialView={view} navigate={jest.fn()} />,
    );
    expect(
      await screen.findByRole("button", { name: /First dated task/ }),
    ).toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(1);
    await act(async () =>
      mockCaptureEndReached.mock.lastCall![0]!({ distanceFromEnd: 0 }),
    );
    expect(
      await screen.findByRole("button", { name: /Another dated task/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: /First dated task/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText("52 of 130 · 40%")).toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(2);
  },
);
