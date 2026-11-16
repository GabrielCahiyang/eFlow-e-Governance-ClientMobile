import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { WorkEditorSheet } from "../WorkEditorSheet";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import {
  fetchWorkTree,
  fetchWorkImpact,
  saveWorkTree,
} from "../../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor", role: "member" } }),
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));
jest.mock("../../../shared/confirm", () => ({
  confirmAction: jest.fn(async () => true),
}));
jest.mock(
  "../../../../core/web/app/features/nested-work/services/workTreeService",
  () => ({
    fetchWorkTree: jest.fn(),
    fetchWorkImpact: jest.fn(),
    saveWorkTree: jest.fn(),
  }),
);
function snapshot(status = "todo") {
  const tree = {
    revision: 1,
    root: {
      id: "task",
      kind: "office",
      project: "project",
      office: "office",
      lead: "actor",
      status: "in_progress",
      open: true,
      people: [],
    },
    nodes: [
      {
        id: "sub",
        task_id: "task",
        title: "Prepare agenda",
        status,
        percent_complete: 0,
        lead_id: "worker",
        assigned_to_ids: ["worker"],
        capabilities: { delete: { allowed: true, reason_code: null } },
      },
    ],
    people: [],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(tree, "actor");
  return tree;
}
test("a Subtask that starts while Delete is open cannot be deleted", async () => {
  jest.clearAllMocks();
  const initial = snapshot();
  jest.mocked(fetchWorkTree).mockResolvedValue(snapshot("in_progress"));
  await render(
    <WorkEditorSheet
      data={initial}
      edit={{ command: "delete", node: initial.nodes[0] }}
      skipRecovery
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Delete subtask" }));
  expect(
    await screen.findByText(
      "Only the Task Lead can delete an unstarted subtask. Refresh the work before continuing.",
    ),
  ).toBeOnTheScreen();
  expect(saveWorkTree).not.toHaveBeenCalled();
});
test("unstarted Subtask deletion checks impact and preserves the original server command", async () => {
  jest.clearAllMocks();
  const initial = snapshot();
  jest.mocked(fetchWorkTree).mockResolvedValue(initial);
  jest
    .mocked(fetchWorkImpact)
    .mockResolvedValue({
      allowed: true,
      current_revision: 1,
      fingerprint: "reviewed",
      selected_count: 1,
      descendant_count: 0,
      affected_appointment_count: 1,
      before_path: ["Task", "Prepare agenda"],
      after_path: [],
    } as never);
  const receipt = { ...initial, nodes: [] };
  jest.mocked(saveWorkTree).mockResolvedValue(receipt);
  const onSaved = jest.fn(async (_receipt: WorkTreeSnapshot) => {});
  await render(
    <WorkEditorSheet
      data={initial}
      edit={{ command: "delete", node: initial.nodes[0] }}
      skipRecovery
      onClose={jest.fn()}
      onSaved={onSaved}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Delete subtask" }));
  expect(saveWorkTree).toHaveBeenCalledWith(
    "task",
    expect.objectContaining({
      command: "delete",
      revision: 1,
      impactFingerprint: "reviewed",
      payload: { id: "sub" },
    }),
  );
  expect(onSaved).toHaveBeenCalledWith(receipt);
});
