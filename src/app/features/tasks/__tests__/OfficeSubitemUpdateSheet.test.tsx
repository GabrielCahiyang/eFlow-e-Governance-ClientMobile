import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { OfficeSubitemUpdateSheet } from "../OfficeSubitemUpdateSheet";
import { saveSubtaskWorkUpdate, SubtaskWorkUpdateRejectedError } from "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import { clearAllFormDrafts } from "../../../shared/formDraftMemory";
import { asServiceFile, chooseFiles } from "../../../../platform/files";
import { feedback } from "../../../shared/userMessages";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";

jest.mock(
  "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService",
  () => ({
    ...jest.requireActual<typeof import("../../../../core/web/app/features/subtasks/services/subtaskWorkflowService")>("../../../../core/web/app/features/subtasks/services/subtaskWorkflowService"),
    saveSubtaskWorkUpdate: jest.fn(),
  }),
);
jest.mock("../../../../core/web/lib/supabase", () => ({ supabase: {} }));
jest.mock("../../../../platform/files", () => ({ chooseFiles: jest.fn(), asServiceFile: jest.fn() }));
const mockToast = jest.fn();
jest.mock("../../../components/ui/Toast", () => ({ useToast: () => ({ toast: mockToast }) }));
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

beforeEach(() => {
  clearAllFormDrafts();
  jest.mocked(saveSubtaskWorkUpdate).mockReset();
  jest.mocked(fetchWorkTree).mockReset();
  jest.mocked(chooseFiles).mockReset();
  jest.mocked(asServiceFile).mockReset();
  mockToast.mockClear();
  jest.mocked(saveSubtaskWorkUpdate).mockResolvedValue(undefined);
});

test.each(["unassigned-task-lead", "revoked-contributor", "null-membership", "foreign-root", "missing-capability"])(
  "blocks stale direct work/blocker writes despite an older grant: %s", async (scenario) => {
    const initial = snapshot(4);
    initial.root.lead = "member";
    const latest = snapshot(4);
    latest.root.lead = "member";
    latest.nodes[0].lead_id = "subtask-lead";
    if (scenario !== "missing-capability") latest.nodes[0].assigned_to_ids = [];
    if (scenario === "null-membership") latest.nodes[0].assigned_to_ids = null as unknown as string[];
    if (scenario === "foreign-root") latest.nodes[0].task_id = "other-task";
    if (scenario === "missing-capability") latest.nodes[0].capabilities = {};
    rememberWorkCapabilityContext(initial, "member");
    rememberWorkCapabilityContext(latest, "member");
    jest.mocked(fetchWorkTree).mockResolvedValue(latest);
    await render(<OfficeSubitemUpdateSheet tree={initial} nodeId="node" actorId="member"
      readOnly={false} onClose={jest.fn()} onSaved={async () => {}} />);
    await fireEvent.changeText(screen.getByLabelText("Work note"), "Retain this draft");
    await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
    await waitFor(() => expect(fetchWorkTree).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/This item has changed/)).toBeOnTheScreen());
    expect(saveSubtaskWorkUpdate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Retain this draft")).toBeOnTheScreen();
  },
);

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

test("a confirmed blocker change publishes the post-write snapshot rather than its preflight", async () => {
  const initial = snapshot(4);
  initial.nodes[0].blocker = "Permit pending";
  const refreshed = snapshot(5);
  refreshed.nodes[0].blocker = "Signature pending";
  rememberWorkCapabilityContext(initial, "member");
  jest.mocked(fetchWorkTree).mockResolvedValueOnce(initial).mockResolvedValueOnce(refreshed);
  jest.mocked(saveSubtaskWorkUpdate).mockResolvedValueOnce(undefined as never);
  const onSaved = jest.fn(async (_tree: WorkTreeSnapshot) => {});
  const onClose = jest.fn();
  await render(<OfficeSubitemUpdateSheet tree={initial} nodeId="node" actorId="member"
    readOnly={false} onSaved={onSaved} onClose={onClose} />);
  await fireEvent.changeText(screen.getByLabelText("Blocker"), "Signature pending");
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSaved).toHaveBeenCalledWith(refreshed);
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledTimes(1);
});

test.each(["40P01", "42501", "UPLOAD_FAILED"])("structured direct-update rejection %s unlocks correction and a fresh manual attempt", async code => {
  const tree = snapshot(4);
  rememberWorkCapabilityContext(tree, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  jest.mocked(saveSubtaskWorkUpdate).mockRejectedValueOnce(new SubtaskWorkUpdateRejectedError("Rejected", code));
  const onClose = jest.fn();
  await render(<OfficeSubitemUpdateSheet tree={tree} nodeId="node" actorId="member"
    readOnly={false} onClose={onClose} onSaved={async () => {}} />);
  await fireEvent.changeText(screen.getByLabelText("Work note"), "Original draft");
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Post update" })).toBeEnabled());
  expect(screen.getByDisplayValue("Original draft")).toBeOnTheScreen();
  expect(onClose).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledTimes(1);
  await fireEvent.changeText(screen.getByLabelText("Work note"), "Corrected draft");
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledTimes(2);
  expect(saveSubtaskWorkUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ note: "Corrected draft" }));
  expect(fetchWorkTree).toHaveBeenCalledTimes(3); // Both preflights plus confirmed-save refresh.
});

test.each([
  new TypeError("Network request failed"),
  Object.assign(new Error("Connection lost"), { code: "08006" }),
  Object.assign(new Error("Timeout"), { code: "57014" }),
  new Error("Permission denied"),
  Object.assign(new Error("Revision changed"), { code: "42501" }),
])("uncertain result keeps draft, evidence and lock across close/reopen and resume", async error => {
  const tree = snapshot(4);
  tree.nodes[0].blocker = "Waiting for permit";
  rememberWorkCapabilityContext(tree, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  jest.mocked(saveSubtaskWorkUpdate).mockRejectedValueOnce(error);
  const attachment = { name: "proof.pdf", uri: "file:///proof.pdf", type: "application/pdf", size: 1, arrayBuffer: async () => new ArrayBuffer(1) };
  jest.mocked(chooseFiles).mockResolvedValue([attachment]);
  jest.mocked(asServiceFile).mockResolvedValue({ name: "proof.pdf" } as File);
  const props = { tree, nodeId: "node", actorId: "member", readOnly: false, onClose: jest.fn(), onSaved: jest.fn(async () => {}) };
  const view = await render(<OfficeSubitemUpdateSheet {...props} />);
  await fireEvent.changeText(screen.getByLabelText("Work note"), "Uncertain draft");
  await fireEvent.press(screen.getByRole("button", { name: "Attach evidence (optional)" }));
  await waitFor(() => expect(screen.getByText("proof.pdf")).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  await waitFor(() => expect(screen.getByText(/The update may have been saved/)).toBeOnTheScreen());
  expect(screen.getByRole("button", { name: "Post update" })).toBeDisabled();
  expect(mockToast).not.toHaveBeenCalled();
  expect(props.onSaved).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Close dialog"));
  await view.unmount();
  const changed = snapshot(5);
  changed.nodes[0].blocker = "Different current blocker";
  const reopened = await render(<OfficeSubitemUpdateSheet {...props} tree={changed} />);
  expect(screen.getByDisplayValue("Uncertain draft")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Waiting for permit")).toBeOnTheScreen();
  expect(screen.getByText("proof.pdf")).toBeOnTheScreen();
  expect(screen.getByText(/The update may have been saved/)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Post update" })).toBeDisabled();
  await reopened.rerender(<OfficeSubitemUpdateSheet {...props} tree={changed} />);
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledTimes(1);
  expect(chooseFiles).toHaveBeenCalledTimes(1);
  expect(asServiceFile).toHaveBeenCalledTimes(1);
  expect(fetchWorkTree).toHaveBeenCalledTimes(1);
});

test.each(["actor", "root", "office", "project", "capability-context"])("changed %s context denies submission and retains the draft", async scenario => {
  const tree = snapshot(4);
  rememberWorkCapabilityContext(tree, "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  const props = { tree, nodeId: "node", actorId: "member", readOnly: false, onClose: jest.fn(), onSaved: async () => {} };
  const view = await render(<OfficeSubitemUpdateSheet {...props} />);
  await fireEvent.changeText(screen.getByLabelText("Work note"), "Do not lose this");
  const changed = snapshot(4);
  if (scenario === "root") changed.root.id = "other-root";
  if (scenario === "office") changed.root.office = "other-office";
  if (scenario === "project") changed.root.project = "other-project";
  rememberWorkCapabilityContext(changed, scenario === "capability-context" ? "other-actor" : "member");
  jest.mocked(fetchWorkTree).mockResolvedValue(changed);
  if (scenario === "actor") await view.rerender(<OfficeSubitemUpdateSheet {...props} actorId="other-actor" />);
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  await waitFor(() => expect(screen.getByText(/This item has changed/)).toBeOnTheScreen());
  expect(saveSubtaskWorkUpdate).not.toHaveBeenCalled();
  if (scenario !== "actor") expect(screen.getByDisplayValue("Do not lose this")).toBeOnTheScreen();
});

test("a failed refresh after a confirmed write never repeats the write or supplies stale blocker data", async () => {
  const initial = snapshot(4);
  rememberWorkCapabilityContext(initial, "member");
  jest.mocked(fetchWorkTree).mockResolvedValueOnce(initial).mockRejectedValueOnce(new Error("offline"));
  jest.mocked(saveSubtaskWorkUpdate).mockResolvedValueOnce(undefined as never);
  const onSaved = jest.fn(async (_tree: WorkTreeSnapshot) => {});
  const onClose = jest.fn();
  await render(<OfficeSubitemUpdateSheet tree={initial} nodeId="node" actorId="member"
    readOnly={false} onSaved={onSaved} onClose={onClose} />);
  await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSaved).not.toHaveBeenCalled();
  expect(saveSubtaskWorkUpdate).toHaveBeenCalledTimes(1);
  expect(mockToast).toHaveBeenCalledWith("Work update posted.", "success");
  expect(mockToast).toHaveBeenCalledWith(feedback.saved, "info");
});

test("prefills the saved blocker on reopening instead of an abandoned draft and clears remotely resolved blockers", async () => {
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
  expect(screen.getByRole("button", { name: "Work state" })).toHaveTextContent("Blocked");
  expect(await screen.findByDisplayValue("Existing blocker on record")).toBeOnTheScreen();

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
  expect(await screen.findByDisplayValue("Existing blocker on record")).toBeOnTheScreen();
  expect(screen.queryByDisplayValue("New user blocker")).toBeNull();
  expect(screen.queryByDisplayValue("User draft note")).toBeNull();
  await view2.unmount();

  // Reopening with a fresh actor after blocker is cleared resets to In progress
  const clearedTree = snapshot(6);
  clearedTree.nodes[0].blocker = null;
  rememberWorkCapabilityContext(clearedTree, "lead-2");
  const view3 = await render(
    <OfficeSubitemUpdateSheet
      tree={tree}
      nodeId="node"
      actorId="lead-2"
      readOnly={false}
      onSaved={async () => {}}
      onClose={jest.fn()}
    />,
  );
  expect(await screen.findByDisplayValue("Existing blocker on record")).toBeOnTheScreen();
  await view3.rerender(
    <OfficeSubitemUpdateSheet
      tree={clearedTree}
      nodeId="node"
      actorId="lead-2"
      readOnly={false}
      onSaved={async () => {}}
      onClose={jest.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Work state" })).toHaveTextContent("In progress");
  expect(screen.queryByLabelText("Blocker")).toBeNull();
  await view3.unmount();
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
