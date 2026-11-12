import { groupAssignedWork } from "../../personal-work/mobileWork";
import { act, render, screen } from "@testing-library/react-native";
import { expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { WorkStatusProvider } from "../WorkStatusProvider";
import { useWorkStatus } from "../../../shared/workStatusPresentation";
import { rowToTask } from "../../../../core/web/app/features/tasks/services/taskMapper";
import {
  displayWorkSnapshot,
  mobileWorkSnapshot,
} from "../../personal-work/displayWorkSnapshot";

let mockRefresh: () => void;
let mockDefinitions = [
  {
    id: "todo",
    label: "To-do",
    scope: "builtin",
    color: "#117766",
    position: 20,
    retired: false,
  },
  {
    id: "supplier",
    label: "Waiting for supplier",
    scope: "both",
    color: "#1666aa",
    position: 100,
    retired: true,
  },
];
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    from: () => ({
      select: async () => ({ data: mockDefinitions, error: null }),
    }),
    removeChannel: jest.fn(),
  },
}));
jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => ({
    on: (_type: string, _filter: unknown, callback: () => void) => {
      mockRefresh = callback;
      return { subscribe: () => ({}) };
    },
  }),
}));

function TaskStatuses() {
  const status = useWorkStatus();
  return (
    <>
      <Text>{status("todo").label}</Text>
      <Text>{status("in_progress", "supplier").label}</Text>
      <Text>{status("completed", "supplier").label}</Text>
      <Text>{status("in_progress", "supplier").color}</Text>
    </>
  );
}

test("uses Web labels and colors, refreshes on catalog changes, and drops them on sign-out", async () => {
  const result = await render(
    <WorkStatusProvider actor="actor">
      <TaskStatuses />
    </WorkStatusProvider>,
  );
  expect(await screen.findByText("To-do")).toBeTruthy();
  expect(screen.getByText("Waiting for supplier")).toBeTruthy();
  expect(screen.getByText("Completed")).toBeTruthy();
  expect(screen.getByText("#1666aa")).toBeTruthy();
  mockDefinitions = mockDefinitions.map((definition) =>
    definition.id === "todo"
      ? { ...definition, label: "Ready to start" }
      : definition,
  );
  await act(async () => mockRefresh());
  expect(await screen.findByText("Ready to start")).toBeTruthy();
  await result.rerender(
    <WorkStatusProvider>
      <TaskStatuses />
    </WorkStatusProvider>,
  );
  expect(screen.getByText("To Do")).toBeTruthy();
  expect(screen.queryByText("Waiting for supplier")).toBeNull();
});

test("cached Assigned and Leading rows retain the label reference but drop mutation context", () => {
  const task = rowToTask({
    id: "root",
    title: "Supplies",
    assigned_to: "actor",
    status: "in_progress",
    custom_status_id: "supplier",
  });
  const row = {
    key: "office-task:root",
    id: "root",
    rootId: "root",
    kind: "office-task" as const,
    title: task.title,
    projectTitle: "Demo",
    workspaceName: "Office",
    timezone: "Asia/Manila",
    status: task.status,
    progress: 0,
    mine: true,
    leading: true,
    actionable: true,
    history: false,
    relation: "Task Lead",
    task,
  };
  const snapshot = displayWorkSnapshot(
    mobileWorkSnapshot({
      rows: [row],
      projects: [],
      workspaces: [],
      issues: [],
      unavailable: [],
      loadedAt: 0,
    }),
  );
  expect(groupAssignedWork(snapshot.rows).flatMap((group) => group.data)).toEqual(snapshot.rows);
  expect(snapshot.rows[0]).toMatchObject({
    customStatusId: "supplier",
    status: "in_progress",
    listedAsOpen: true,
    actionable: false,
  });
  expect(snapshot.rows[0].task).toBeUndefined();
});
