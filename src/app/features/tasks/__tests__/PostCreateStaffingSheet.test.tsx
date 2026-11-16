import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import {
  fetchWorkTree,
  saveWorkTree,
} from "../../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { draftStore } from "../../../../platform/draftStore";
import {
  PostCreateStaffingSheet,
  resolvePostCreateSubtaskStaffing,
  resolvePostCreateTaskStaffing,
} from "../PostCreateStaffingSheet";
import { WorkEditorSheet } from "../WorkEditorSheet";
import { clearAllFormDrafts } from "../../../shared/formDraftMemory";

let mockProfile: { id: string; role: string } = { id: "actor", role: "head" };

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: mockProfile }),
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), remove: jest.fn(), set: jest.fn() },
}));
jest.mock("../../../../core/web/app/features/nested-work/services/workTreeService", () => ({
  fetchWorkTree: jest.fn(),
  saveWorkTree: jest.fn(),
}));

beforeEach(() => {
  clearAllFormDrafts();
  mockProfile = { id: "actor", role: "head" };
  jest.clearAllMocks();
  jest.mocked(draftStore.get).mockResolvedValue(null);
});

function buildTaskSnapshot(overrides?: Partial<WorkTreeSnapshot["root"]>): WorkTreeSnapshot {
  const snapshot = {
    revision: 2,
    root: { status: "in_progress",
      id: "task-1",
      kind: "office",
      office: "office-1",
      project: "project-1",
      lead: null,
      open: true,
      people: [],
      capabilities: {
        appoint_lead: { allowed: true, reason_code: null },
        manage_contributors: { allowed: false, reason_code: "lifecycle_blocked" },
        create_child: { allowed: true, reason_code: null },
      },
      ...overrides,
    },
    nodes: [],
    people: [
      { id: "worker-1", name: "Elena Cruz", eligible: true },
      { id: "worker-2", name: "Marco Diaz", eligible: true },
    ],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(snapshot, mockProfile.id);
  return snapshot;
}

test("resolvePostCreateTaskStaffing fails closed when denied, closed, empty, or read-only", async () => {
  const denied = buildTaskSnapshot({
    capabilities: {
      appoint_lead: { allowed: false, reason_code: "branch_denied" },
      manage_contributors: { allowed: false, reason_code: "branch_denied" },
    },
  });
  jest.mocked(fetchWorkTree).mockResolvedValueOnce(denied);
  await expect(
    resolvePostCreateTaskStaffing({
      taskId: "task-1",
      title: "Survey",
      actorId: "actor",
    }),
  ).resolves.toBeUndefined();

  const closedTask = buildTaskSnapshot({ open: false });
  jest.mocked(fetchWorkTree).mockResolvedValueOnce(closedTask);
  await expect(
    resolvePostCreateTaskStaffing({
      taskId: "task-1",
      title: "Survey",
      actorId: "actor",
    }),
  ).resolves.toBeUndefined();

  jest.mocked(fetchWorkTree).mockRejectedValueOnce(new Error("Network error"));
  await expect(
    resolvePostCreateTaskStaffing({
      taskId: "task-1",
      title: "Survey",
      actorId: "actor",
    }),
  ).resolves.toBeUndefined();

  await expect(
    resolvePostCreateTaskStaffing({
      taskId: "task-1",
      title: "Survey",
      actorId: "actor",
      readOnly: true,
    }),
  ).resolves.toBeUndefined();
});

test("Task post-create staffing prompt opens Task lead and contributors and saves the team", async () => {
  const snapshot = buildTaskSnapshot();
  jest.mocked(fetchWorkTree).mockResolvedValue(snapshot);
  jest.mocked(saveWorkTree).mockResolvedValue({ ...snapshot, revision: 3 });

  const target = await resolvePostCreateTaskStaffing({
    taskId: "task-1",
    title: "Site inspection",
    actorId: "actor",
  });
  expect(target?.kind).toBe("task");

  const onClose = jest.fn();
  const onSaved = jest.fn(async () => {});
  await render(
    <PostCreateStaffingSheet
      target={target!}
      projectStatus="active"
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  expect(screen.getByText("Choose people for this task?")).toBeOnTheScreen();
  expect(screen.getByText("Site inspection")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Choose people" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Leave unassigned" })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Choose people" }));

  expect(screen.queryByText("Checking saved work changes")).toBeNull();
  expect(screen.getByText("Task lead and contributors")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Appointed Lead" }));
  await fireEvent.press(await screen.findByRole("radio", { name: "Elena Cruz" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm Lead" }));

  await fireEvent.press(screen.getByRole("button", { name: "Contributors" }));
  await fireEvent.press(await screen.findByRole("checkbox", { name: "Marco Diaz" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm contributors" }));

  await fireEvent.press(screen.getByRole("button", { name: "Save team" }));

  await waitFor(() =>
    expect(saveWorkTree).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        command: "root_lead",
        revision: 2,
        payload: {
          lead: "worker-1",
          people: expect.arrayContaining(["worker-1", "worker-2"]),
        },
      }),
    ),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test("Task post-create Leave unassigned dismisses cleanly without saving", async () => {
  const snapshot = buildTaskSnapshot();
  jest.mocked(fetchWorkTree).mockResolvedValueOnce(snapshot);

  const target = await resolvePostCreateTaskStaffing({
    taskId: "task-1",
    title: "Site inspection",
    actorId: "actor",
  });

  const onClose = jest.fn();
  const onSaved = jest.fn(async () => {});
  await render(
    <PostCreateStaffingSheet
      target={target!}
      projectStatus="active"
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  await fireEvent.press(screen.getByRole("button", { name: "Leave unassigned" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(saveWorkTree).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});

test("an ordinary project Member without either staffing capability cannot open Task people", async () => {
  mockProfile = { id: "actor", role: "member" };
  const denied = buildTaskSnapshot({
    lead: "actor",
    capabilities: {
      appoint_lead: { allowed: false, reason_code: "appointment_denied" },
      manage_contributors: { allowed: false, reason_code: "branch_denied" },
    },
  });
  jest.mocked(fetchWorkTree).mockResolvedValue(denied);
  await expect(resolvePostCreateTaskStaffing({
    taskId: "task-1", title: "Survey", actorId: "actor",
  })).resolves.toBeUndefined();
  await render(<WorkEditorSheet data={denied} edit={{ command: "contributors", root: true }}
    skipRecovery onClose={jest.fn()} onSaved={jest.fn(async () => {})} />);
  expect(screen.queryByRole("button", { name: "Appointed Lead" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Contributors" })).toBeNull();
  expect(screen.getByRole("button", { name: "Save team" })).toBeDisabled();
  expect(screen.getByText("You do not have permission for this action on this work.")).toBeOnTheScreen();
  expect(saveWorkTree).not.toHaveBeenCalled();
});

test("Task contributor changes recheck contributor authority before saving", async () => {
  mockProfile = { id: "actor", role: "member" };
  const allowed = buildTaskSnapshot({
    lead: "worker-1", people: ["worker-1"],
    capabilities: {
      appoint_lead: { allowed: true, reason_code: null },
      manage_contributors: { allowed: true, reason_code: null },
    },
  });
  const denied = buildTaskSnapshot({
    ...allowed.root,
    capabilities: {
      appoint_lead: { allowed: false, reason_code: "appointment_denied" },
      manage_contributors: { allowed: false, reason_code: "branch_denied" },
    },
  });
  jest.mocked(fetchWorkTree).mockResolvedValue(denied);
  await render(<WorkEditorSheet data={allowed} edit={{ command: "contributors", root: true }}
    projectStatus="active" skipRecovery onClose={jest.fn()} onSaved={jest.fn(async () => {})} />);
  await fireEvent.press(screen.getByRole("button", { name: "Contributors" }));
  await fireEvent.press(await screen.findByRole("checkbox", { name: "Marco Diaz" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm contributors" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save team" }));
  expect(await screen.findByText("You do not have permission for this action on this work.")).toBeOnTheScreen();
  expect(fetchWorkTree).toHaveBeenCalledWith("task-1");
  expect(saveWorkTree).not.toHaveBeenCalled();
  expect(draftStore.set).not.toHaveBeenCalled();
});

test.each(["task", "subtask"] as const)("%s Lead can edit contributors without seeing or transferring their own Lead entry", async (kind) => {
  mockProfile = { id: "actor", role: "member" };
  const capabilities = {
    appoint_lead: { allowed: false, reason_code: "appointment_denied" as const },
    manage_contributors: { allowed: true, reason_code: null },
  } as const;
  const tree = {
    ...buildTaskSnapshot({ lead: kind === "task" ? "actor" : "upper-lead", people: ["actor"], capabilities }),
    nodes: kind === "subtask" ? [{
      id: "sub-1", task_id: "task-1", parent_subtask_id: null, lead_id: "actor",
      assigned_to_ids: ["actor"], title: "Prepare permit", status: "todo", capabilities,
    }] : [],
  } as unknown as WorkTreeSnapshot;
  tree.people = [{ id: "actor", name: "Assigned Lead", eligible: true }, ...tree.people];
  rememberWorkCapabilityContext(tree, "actor");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  jest.mocked(saveWorkTree).mockResolvedValue(tree);
  if (kind === "task") {
    const target = await resolvePostCreateTaskStaffing({ taskId: "task-1", title: "Task", actorId: "actor" });
    expect(target?.kind === "task" && target.command).toBe("contributors");
  }
  await render(<WorkEditorSheet data={tree}
    edit={kind === "task" ? { command: "contributors", root: true } : { command: "staff", node: tree.nodes[0] }}
    projectStatus="active" projectLeadId={kind === "subtask" ? "actor" : "project-lead"}
    skipRecovery onClose={jest.fn()} onSaved={jest.fn(async () => {})} />);
  expect(screen.getByRole("button", { name: "Appointed Lead" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Contributors" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Contributors" }));
  expect(screen.queryByRole("checkbox", { name: "Assigned Lead" })).toBeNull();
  await fireEvent.press(await screen.findByRole("checkbox", { name: "Elena Cruz" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm contributors" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save team" }));
  await waitFor(() => expect(saveWorkTree).toHaveBeenCalledTimes(1));
  const request = jest.mocked(saveWorkTree).mock.calls[0][1];
  expect(request.command).toBe(kind === "task" ? "contributors" : "staff");
  expect(request.payload.people).toEqual(expect.arrayContaining(["actor", "worker-1"]));
  if (kind === "task") expect(request.payload).not.toHaveProperty("lead");
  else expect(request.payload).toMatchObject({ id: "sub-1", lead: "actor" });
});

test("Subtask creation submits unassigned and transitions to Choose people when permitted", async () => {
  const initialTree = buildTaskSnapshot({ lead: "actor" });
  jest.mocked(fetchWorkTree).mockImplementation(async () => initialTree);

  let createdSnapshot: WorkTreeSnapshot | undefined;
  jest
    .mocked(saveWorkTree)
    .mockImplementationOnce(async (_rootId, req) => {
      const createdId = String((req.payload as Record<string, unknown>).id);
      createdSnapshot = {
        ...initialTree,
        revision: 3,
        nodes: [
          {
            id: createdId,
            task_id: "task-1",
            parent_subtask_id: null,
            title: "Draft permit",
            sibling_order: 0,
            status: "todo",
            lead_id: null,
            assigned_to_ids: [],
            capabilities: {
              appoint_lead: { allowed: true, reason_code: null },
              manage_contributors: {
                allowed: false,
                reason_code: "lifecycle_blocked",
              },
            },
          },
        ],
      } as unknown as WorkTreeSnapshot;
      rememberWorkCapabilityContext(createdSnapshot, "actor");
      jest.mocked(fetchWorkTree).mockResolvedValue(createdSnapshot);
      return createdSnapshot;
    })
    .mockImplementationOnce(async () => createdSnapshot!);

  const onClose = jest.fn();
  const onSaved = jest.fn(async () => {});

  await render(
    <WorkEditorSheet
      data={initialTree}
      edit={{ command: "create" }}
      projectStatus="active"
      promptPostCreateStaffing
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  expect(await screen.findByRole("button", { name: "Add subtask" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Appointed Lead" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Contributors" })).toBeNull();

  await fireEvent.changeText(screen.getByLabelText("Subtask name"), "Draft permit");
  await fireEvent.press(screen.getByRole("button", { name: "Add subtask" }));

  // Transitions instantaneously inside the same sheet host without tearing down the Modal.
  expect(screen.getByText("Choose people for this subtask?")).toBeOnTheScreen();
  expect(onClose).not.toHaveBeenCalled();
  expect(saveWorkTree).toHaveBeenCalledWith(
    "task-1",
    expect.objectContaining({
      command: "create",
      payload: expect.objectContaining({
        title: "Draft permit",
        lead: null,
        people: [],
      }),
    }),
  );

  await fireEvent.press(screen.getByRole("button", { name: "Choose people" }));

  expect(screen.queryByText("Checking saved work changes")).toBeNull();
  expect(screen.getByRole("header", { name: "Choose people" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Appointed Lead" }));
  await fireEvent.press(await screen.findByRole("radio", { name: "Marco Diaz" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm Lead" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save team" }));

  await waitFor(() =>
    expect(saveWorkTree).toHaveBeenNthCalledWith(
      2,
      "task-1",
      expect.objectContaining({
        command: "staff",
        revision: 3,
        payload: expect.objectContaining({
          lead: "worker-2",
          people: ["worker-2"],
        }),
      }),
    ),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test("Subtask post-create Leave unassigned dismisses cleanly without an extra save", async () => {
  const initialTree = buildTaskSnapshot({ lead: "actor" });
  jest.mocked(fetchWorkTree).mockResolvedValue(initialTree);
  jest.mocked(saveWorkTree).mockImplementationOnce(async (_rootId, req) => {
    const createdId = String((req.payload as Record<string, unknown>).id);
    const createdSnapshot = {
      ...initialTree,
      revision: 3,
      nodes: [
        {
          id: createdId,
          task_id: "task-1",
          parent_subtask_id: null,
          title: "Unassigned step",
          sibling_order: 0,
          status: "todo",
          lead_id: null,
          assigned_to_ids: [],
          capabilities: {
            appoint_lead: { allowed: true, reason_code: null },
            manage_contributors: { allowed: false, reason_code: "lifecycle_blocked" },
          },
        },
      ],
    } as unknown as WorkTreeSnapshot;
    rememberWorkCapabilityContext(createdSnapshot, "actor");
    return createdSnapshot;
  });

  const onClose = jest.fn();
  const onSaved = jest.fn(async () => {});
  await render(
    <WorkEditorSheet
      data={initialTree}
      edit={{ command: "create" }}
      projectStatus="active"
      promptPostCreateStaffing
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  await fireEvent.changeText(
    await screen.findByLabelText("Subtask name"),
    "Unassigned step",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add subtask" }));

  expect(screen.getByText("Choose people for this subtask?")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Leave unassigned" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(saveWorkTree).toHaveBeenCalledTimes(1);
});

test("resolvePostCreateSubtaskStaffing fails closed when active Project Lead planning block applies", () => {
  mockProfile = { id: "project-lead", role: "head" };
  const snapshot = {
    ...buildTaskSnapshot({ lead: "other-task-lead" }),
    nodes: [
      {
        id: "node-1",
        task_id: "task-1",
        parent_subtask_id: null,
        title: "Nested item",
        sibling_order: 0,
        status: "todo",
        lead_id: null,
        assigned_to_ids: [],
        capabilities: {
          appoint_lead: { allowed: true, reason_code: null },
        },
      },
    ],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(snapshot, "project-lead");

  expect(
    resolvePostCreateSubtaskStaffing({
      tree: snapshot,
      node: snapshot.nodes[0],
      actorId: "project-lead",
      actorRole: "head",
      projectStatus: "active",
      projectLeadId: "project-lead",
    }),
  ).toBeUndefined();

  mockProfile = { id: "actor", role: "head" };
  const deniedSubtask = {
    ...buildTaskSnapshot({ lead: "actor" }),
    nodes: [
      {
        id: "node-denied",
        task_id: "task-1",
        parent_subtask_id: null,
        title: "Denied item",
        sibling_order: 0,
        status: "todo",
        lead_id: null,
        assigned_to_ids: [],
        capabilities: {
          appoint_lead: { allowed: false, reason_code: "branch_denied" },
          manage_contributors: { allowed: false, reason_code: "branch_denied" },
        },
      },
    ],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(deniedSubtask, "actor");
  expect(
    resolvePostCreateSubtaskStaffing({
      tree: deniedSubtask,
      node: deniedSubtask.nodes[0],
      actorId: "actor",
      actorRole: "head",
      projectStatus: "active",
    }),
  ).toBeUndefined();

  const personalEmpty = {
    ...buildTaskSnapshot({
      kind: "personal",
      office: null,
      lead: "actor",
    }),
    people: [],
    nodes: [
      {
        id: "node-personal",
        task_id: "task-1",
        parent_subtask_id: null,
        title: "Personal item",
        sibling_order: 0,
        status: "todo",
        lead_id: null,
        assigned_to_ids: [],
        capabilities: {
          appoint_lead: { allowed: true, reason_code: null },
        },
      },
    ],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(personalEmpty, "actor");
  expect(
    resolvePostCreateSubtaskStaffing({
      tree: personalEmpty,
      node: personalEmpty.nodes[0],
      actorId: "actor",
    }),
  ).toBeUndefined();
});
