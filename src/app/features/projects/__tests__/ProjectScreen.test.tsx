import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProjectScreen } from "../ProjectScreen";
import { fetchProjectTasks } from "../services";
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

jest.mock("../services", () => ({
  fetchProject: jest.fn(async () => ({
    title: "Archived field survey",
    status: "archived",
  })),
  fetchProjectTasks: jest.fn(),
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
  const readTasks = jest.mocked(fetchProjectTasks);
  readTasks.mockResolvedValue([historicalTask]);
  const navigate = jest.fn();
  const screen = await render(
    <ProjectScreen id="archive-1" navigate={navigate} />,
  );
  const row = await screen.findByRole("button", { name: historicalTask.title });
  expect(screen.getByText(/This project is read-only/)).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Field work" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Status" })).toBeOnTheScreen();
  expect(screen.getByText("QA Owner")).toBeOnTheScreen();

  // React Native throws when onRefresh is supplied without a boolean refreshing prop.
  const refreshControl = () =>
    screen.container.queryAll((node) => !!node.props.refreshControl)[0].props
      .refreshControl;
  expect(refreshControl().props.refreshing).toBe(false);
  let finish!: (tasks: Task[]) => void;
  readTasks.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => {
    void refreshControl().props.onRefresh();
  });
  expect(refreshControl().props.refreshing).toBe(true);
  expect(row).toBeOnTheScreen();
  await act(async () => finish([historicalTask]));
  await waitFor(() => expect(refreshControl().props.refreshing).toBe(false));

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
  expect(screen.getByText("No tasks match this search")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
  expect(
    screen.getByRole("button", { name: historicalTask.title }),
  ).toBeOnTheScreen();
});
