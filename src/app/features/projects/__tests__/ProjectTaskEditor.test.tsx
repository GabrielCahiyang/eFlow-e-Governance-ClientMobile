import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { rowToTask } from "../../../../core/web/app/features/tasks/services/taskMapper";
import { ProjectTaskEditor } from "../ProjectTaskEditor";
import type { ProjectGroup } from "../../../../core/web/app/features/project-table/types";

const mockProjectOfficeMembers = jest.fn<
  () => Promise<{
    offices: {
      id: string;
      office_id: string;
      invitation_status: string;
      relationship_type: string;
    }[];
    members: {
      project_office_id: string;
      user_id: string;
      can_edit: boolean;
    }[];
  }>
>();
const mockTaskRead =
  jest.fn<() => Promise<{ data: Record<string, unknown>; error: null }>>();

function offsetPhilippineDate(days: number) {
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  return new Date(Date.parse(today + "T00:00:00Z") + days * 86400_000)
    .toISOString()
    .slice(0, 10);
}
const todayDate = () => offsetPhilippineDate(0);
const pastProjectStart = () => offsetPhilippineDate(-13);
const futureProjectDue = () => offsetPhilippineDate(16);
let mockProject = {
  status: "active",
  startDate: pastProjectStart(),
  targetDate: futureProjectDue(),
};
beforeEach(() => {
  mockProject = {
    status: "active",
    startDate: pastProjectStart(),
    targetDate: futureProjectDue(),
  };
});
jest.mock(
  "../../../../core/web/app/features/project-offices/services/projectOfficeService",
  () => ({
    fetchProjectOffices: () => mockProjectOfficeMembers(),
  }),
);

const mockRpc =
  jest.fn<
    (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: null }>
  >();
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ is: () => ({ maybeSingle: mockTaskRead }) }),
      }),
    }),
    rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "head" } } } }),
    },
  },
}));
jest.mock("../services", () => ({
  fetchProject: async () => mockProject,
  fetchProjectAnalysisTasks: async () => [{
    id: "prerequisite", linkedProjectId: "project", title: "Prepare permit", status: "todo",
  }],
}));
jest.mock(
  "../../../../core/web/app/features/project-table/services/workspaceService",
  () => ({
    fetchProjectGroups: async () => mockGroups,
  }),
);
const mockGroups: ProjectGroup[] = [
  {
    id: "group",
    projectId: "project",
    title: "Field work",
    color: "#123456",
    position: 0,
    isDefault: true,
  },
];

test("task creation rechecks both Web permissions and never writes when one is denied", async () => {
  mockRpc.mockReset().mockImplementation(async (name) => ({
    data: name === "can_create_scoped_work",
    error: null,
  }));
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={async () => {}}
    />,
  );
  expect(view.getByText("Task name *")).toBeOnTheScreen();
  expect(view.getByText("Group *")).toBeOnTheScreen();
  await fireEvent.changeText(view.getByLabelText("Task name"), "Survey site");
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    await view.findByText("Current project access does not allow this change."),
  ).toBeOnTheScreen();
  expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
    "can_create_scoped_work",
    "can_manage_project",
  ]);
});

test("an unconfirmed Web create receipt locks submission instead of creating a duplicate", async () => {
  mockRpc.mockReset().mockImplementation(async (name) => ({
    data:
      name === "m7_create_scheduled_task"
        ? null
        : name === "project_flow_snapshot"
          ? { project: { id: "project" }, ready: true }
          : true,
    error: null,
  }));
  const saved = jest.fn(async () => {});
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={saved}
    />,
  );
  await fireEvent.changeText(
    view.getByLabelText("Task name"),
    " Survey site ",
  );
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  await waitFor(() =>
    expect(view.getByRole("button", { name: "Add task" })).toBeDisabled(),
  );
  expect(
    await view.findByText(/The save could not be confirmed/),
  ).toBeOnTheScreen();
  expect(mockRpc).toHaveBeenLastCalledWith("m7_create_scheduled_task", {
    p_project: "project",
    p_group: "group",
    p_title: "Survey site",
    p_start: todayDate(),
    p_due: futureProjectDue(),
  });
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    mockRpc.mock.calls.filter(([name]) => name === "m7_create_scheduled_task"),
  ).toHaveLength(1);
  expect(saved).not.toHaveBeenCalled();
});

test("a saved project editor uses the delegated task command and a revoked editor cannot write", async () => {
  const row = {
    id: "task",
    title: "Survey",
    status: "todo",
    org_id: "office",
    linked_project_id: "project",
    updated_at: "2026-11-13T00:00:00Z",
  };
  mockTaskRead.mockResolvedValue({ data: row, error: null });
  mockRpc.mockReset().mockImplementation(async (name) => ({
    error: null,
    data:
      name === "project_flow_snapshot"
        ? { project: { id: "project" }, ready: true }
        : name === "edit_selected_project_task"
          ? row
          : false,
  }));
  const offices = [
    {
      id: "team",
      office_id: "office",
      invitation_status: "joined",
      relationship_type: "lead",
    },
  ];
  const scope = {
    actor: "head",
    project: "project",
    office: "office",
    task: rowToTask(row),
    canDelegateEdit: true,
  };
  for (const can_edit of [true, false]) {
    mockProjectOfficeMembers.mockResolvedValue({
      offices,
      members: [{ project_office_id: "team", user_id: "head", can_edit }],
    });
    const saved = jest.fn(async () => {});
    const view = await render(
      <ProjectTaskEditor
        scope={scope}
        groups={mockGroups}
        onClose={jest.fn()}
        onSaved={saved}
      />,
    );
    await fireEvent.changeText(
      view.getByLabelText("Task name"),
      "Updated survey",
    );
    await fireEvent.press(view.getByRole("button", { name: "Save task" }));
    if (can_edit) await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    else
      expect(
        await view.findByText(
          "Current project access does not allow this change.",
        ),
      ).toBeOnTheScreen();
    await view.unmount();
  }
  expect(
    mockRpc.mock.calls.filter(
      ([name]) => name === "edit_selected_project_task",
    ),
  ).toEqual([
    [
      "edit_selected_project_task",
      { p_task_id: "task", p_patch: { title: "Updated survey" } },
    ],
  ]);
  expect(
    mockRpc.mock.calls.some(([name]) => name === "phase3_patch_task"),
  ).toBe(false);
});

test("unfinished project setup blocks native task creation", async () => {
  mockRpc.mockReset().mockImplementation(async (name) => ({
    error: null,
    data:
      name === "project_flow_snapshot"
        ? { project: { id: "project" }, ready: false }
        : true,
  }));
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.changeText(view.getByLabelText("Task name"), "Survey site");
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    await view.findByText(/Finish project setup before adding or editing work/),
  ).toBeOnTheScreen();
  expect(
    mockRpc.mock.calls.some(([name]) => name === "m7_create_scheduled_task"),
  ).toBe(false);
});

test("task creation saves optional priority and prerequisites against the confirmed task ID", async () => {
  mockRpc.mockReset().mockImplementation(async (name) => ({
    error: null,
    data: name === "project_flow_snapshot" ? { project: { id: "project" }, ready: true }
      : name === "m7_create_scheduled_task" ? { id: "new-task", linked_project_id: "project" }
      : name === "phase3_patch_task" ? { id: "new-task", priority: "high", dependency_ids: ["prerequisite"] }
      : true,
  }));
  const saved = jest.fn(async () => {});
  const view = await render(<ProjectTaskEditor scope={{ actor: "head", project: "project", office: "office" }}
    groups={mockGroups} onClose={jest.fn()} onSaved={saved} />);
  await fireEvent.changeText(view.getByLabelText("Task name"), "Survey site");
  await fireEvent.press(view.getByRole("button", { name: "Priority" }));
  await fireEvent.press(await view.findByRole("radio", { name: "High" }));
  await fireEvent.press(view.getByRole("button", { name: "Prerequisite tasks" }));
  await fireEvent.press(await view.findByRole("checkbox", { name: "Prepare permit" }));
  const prerequisiteClose = view.getAllByLabelText("Close dialog").at(-1);
  if (prerequisiteClose) await fireEvent.press(prerequisiteClose);
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(mockRpc.mock.calls.filter(([name]) => name === "m7_create_scheduled_task")).toHaveLength(1);
  expect(mockRpc).toHaveBeenLastCalledWith("phase3_patch_task", {
    p_task_id: "new-task", p_patch: { priority: "high", dependency_ids: ["prerequisite"] },
  });
});

test("defaults task start date to today when project already started and surfaces SQL 22023 schedule errors cleanly", async () => {
  mockRpc.mockReset().mockImplementation(async (name) => {
    if (name === "m7_create_scheduled_task")
      return {
        data: null,
        error: { code: "22023", message: "Choose today or a future start date." },
      } as unknown as { data: unknown; error: null };
    return {
      error: null,
      data:
        name === "project_flow_snapshot"
          ? { project: { id: "project" }, ready: true }
          : true,
    };
  });
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.changeText(view.getByLabelText("Task name"), "Field check");
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    await view.findByText("Choose today or a future start date."),
  ).toBeOnTheScreen();
  expect(view.queryByText(/Check before retrying/)).toBeNull();
  expect(mockRpc).toHaveBeenLastCalledWith("m7_create_scheduled_task", {
    p_project: "project",
    p_group: "group",
    p_title: "Field check",
    p_start: todayDate(),
    p_due: futureProjectDue(),
  });
  expect(view.getByRole("button", { name: "Add task" })).not.toBeDisabled();
});

test("blocks past project schedules with exact start date reason instead of falling back to Check before retrying", async () => {
  mockProject = {
    status: "active",
    startDate: offsetPhilippineDate(-10),
    targetDate: offsetPhilippineDate(-1),
  };
  mockRpc.mockReset().mockImplementation(async (name) => ({
    error: null,
    data:
      name === "project_flow_snapshot"
        ? { project: { id: "project" }, ready: true }
        : true,
  }));
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.changeText(view.getByLabelText("Task name"), "Late task");
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    await view.findByText("Choose today or a future start date."),
  ).toBeOnTheScreen();
  expect(view.queryByText(/Check before retrying/)).toBeNull();
  expect(
    mockRpc.mock.calls.some(([name]) => name === "m7_create_scheduled_task"),
  ).toBe(false);
});
