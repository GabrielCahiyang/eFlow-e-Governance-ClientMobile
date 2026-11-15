import { expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { OfficeSubitemUpdateSheet } from "../OfficeSubitemUpdateSheet";
import { saveSubtaskWorkUpdate } from "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";

jest.mock(
  "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService",
  () => ({
    saveSubtaskWorkUpdate: jest.fn(),
  }),
);
jest.mock(
  "../../../../core/web/app/features/nested-work/services/workTreeService",
  () => ({
    fetchWorkTree: jest.fn(),
  }),
);

const snapshot = (revision: number) =>
  ({
    root: {
      id: "root",
      project: "project",
      office: "office",
      kind: "office",
      open: true,
    },
    revision,
    nodes: [
      {
        id: "node",
        task_id: "root",
        lead_id: "member",
        assigned_to_ids: ["member"],
        capabilities: { execute: { allowed: true, reason_code: null } },
      },
    ],
  }) as WorkTreeSnapshot;

test("Office subitem update checks revision and current actor scope before sending the exact node", async () => {
  const initial = snapshot(4);
  const changed = snapshot(5);
  rememberWorkCapabilityContext(changed, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(changed);
  const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const onClose = jest.fn();
  await render(
    <OfficeSubitemUpdateSheet
      tree={initial}
      nodeId="node"
      actorId="member"
      readOnly={false}
      onSaved={onSaved}
      onClose={onClose}
    />,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Work note"),
    "Safe test note",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Post update" }),
  );
  await waitFor(() =>
    expect(screen.getByText(/This item has changed/)).toBeOnTheScreen(),
  );
  expect(saveSubtaskWorkUpdate).not.toHaveBeenCalled();

  rememberWorkCapabilityContext(initial, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(initial);
  await fireEvent.press(
    screen.getByRole("button", { name: "Post update" }),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledTimes(1);
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      subtaskId: "node",
      state: "in_progress",
      note: "Safe test note",
    }),
  );
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test("a contributor with a current execute grant saves an update directly", async () => {
  const tree = snapshot(4);
  tree.nodes[0].lead_id = "branch-lead";
  tree.nodes[0].assigned_to_ids = ["branch-lead", "member"];
  rememberWorkCapabilityContext(tree, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  await render(
    <OfficeSubitemUpdateSheet
      tree={tree}
      nodeId="node"
      actorId="member"
      readOnly={false}
      onSaved={async () => {}}
      onClose={jest.fn()}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText("Work note"), "Draft");
  await fireEvent.press(
    screen.getByRole("button", { name: "Post update" }),
  );
  await waitFor(() =>
    expect(saveSubtaskWorkUpdate).toHaveBeenCalledWith(expect.objectContaining({
      subtaskId: "node",
      state: "in_progress",
      note: "Draft",
    })),
  );
});

test("defaults to in_progress even when the subtask has an active blocker, while retaining user-edited draft values on reopen", async () => {
  const tree = snapshot(5);
  (tree.nodes[0] as { blocker?: string | null }).blocker = "Existing blocker on record";
  rememberWorkCapabilityContext(tree, "lead");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  const onClose = jest.fn();

  const view = await render(
    <OfficeSubitemUpdateSheet
      tree={tree}
      nodeId="node"
      actorId="lead"
      readOnly={false}
      onSaved={async () => {}}
      onClose={onClose}
    />,
  );
  expect(screen.getByRole("button", { name: "Work state" })).toHaveTextContent("In progress");
  expect(screen.queryByLabelText("Blocker")).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Work state" }));
  expect(screen.queryByLabelText("Search options")).toBeNull();
  await fireEvent.press(await screen.findByRole("radio", { name: "Blocked" }));
  await fireEvent.changeText(await screen.findByLabelText("Blocker"), "New user blocker");
  await fireEvent.changeText(screen.getByLabelText("Work note"), "User draft note");
  await fireEvent.press(screen.getByLabelText("Close dialog"));
  expect(onClose).toHaveBeenCalled();

  await view.unmount();

  const view2 = await render(
    <OfficeSubitemUpdateSheet
      tree={tree}
      nodeId="node"
      actorId="lead"
      readOnly={false}
      onSaved={async () => {}}
      onClose={jest.fn()}
    />,
  );
  expect(await screen.findByDisplayValue("New user blocker")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("User draft note")).toBeOnTheScreen();
  await view2.unmount();
});

test("rejects subtask work update when actor is not Task Lead, Subtask Lead, or Subtask Contributor even if execute is granted", async () => {
  const tree = snapshot(6);
  (tree.root as { lead?: string | null }).lead = "other-task-lead";
  tree.nodes[0].lead_id = "other-sub-lead";
  tree.nodes[0].assigned_to_ids = ["other-worker"];
  rememberWorkCapabilityContext(tree, "project-lead");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  jest.mocked(saveSubtaskWorkUpdate).mockClear();

  const view = await render(
    <OfficeSubitemUpdateSheet
      tree={tree}
      nodeId="node"
      actorId="project-lead"
      readOnly={false}
      onSaved={async () => {}}
      onClose={jest.fn()}
    />,
  );
  await fireEvent.changeText(await view.findByLabelText("Work note"), "Attempted override");
  await fireEvent.press(view.getByRole("button", { name: "Post update" }));

  await waitFor(() =>
    expect(view.getByText(/Work access or revision changed|This item has changed/i)).toBeOnTheScreen(),
  );
  expect(saveSubtaskWorkUpdate).not.toHaveBeenCalled();
});
