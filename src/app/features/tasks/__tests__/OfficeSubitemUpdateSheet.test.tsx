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
    screen.getByRole("button", { name: "Save work update" }),
  );
  await waitFor(() =>
    expect(screen.getByText(/This item has changed/)).toBeOnTheScreen(),
  );
  expect(saveSubtaskWorkUpdate).not.toHaveBeenCalled();

  rememberWorkCapabilityContext(initial, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(initial);
  await fireEvent.press(
    screen.getByRole("button", { name: "Save work update" }),
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

test("a current execute grant does not send a contributor update that needs approval", async () => {
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
    screen.getByRole("button", { name: "Save work update" }),
  );
  await waitFor(() =>
    expect(
      screen.getByText(/Work updates that need your Lead/),
    ).toBeOnTheScreen(),
  );
  expect(saveSubtaskWorkUpdate).not.toHaveBeenCalled();
});
