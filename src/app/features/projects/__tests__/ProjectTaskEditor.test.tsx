import { expect, jest, test } from "@jest/globals";
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
jest.mock("../../../components/ui/Sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../services", () => ({
  fetchProject: async () => ({ status: "active" }),
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
  await fireEvent.changeText(view.getByLabelText("Task title"), "Survey site");
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
      name === "phase3_create_task"
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
    view.getByLabelText("Task title"),
    " Survey site ",
  );
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  await waitFor(() =>
    expect(view.getByRole("button", { name: "Add task" })).toBeDisabled(),
  );
  expect(
    await view.findByText(/The save could not be confirmed/),
  ).toBeOnTheScreen();
  expect(mockRpc).toHaveBeenLastCalledWith("phase3_create_task", {
    p_project_id: "project",
    p_group_id: "group",
    p_title: "Survey site",
  });
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    mockRpc.mock.calls.filter(([name]) => name === "phase3_create_task"),
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
      view.getByLabelText("Task title"),
      "Updated survey",
    );
    await fireEvent.press(view.getByRole("button", { name: "Save changes" }));
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
  await fireEvent.changeText(view.getByLabelText("Task title"), "Survey site");
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    await view.findByText(/Finish project setup on eFlow Web/),
  ).toBeOnTheScreen();
  expect(
    mockRpc.mock.calls.some(([name]) => name === "phase3_create_task"),
  ).toBe(false);
});
