import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { WorkProposalReview, WorkProposalSheet } from "../WorkProposalSheet";
import { clearAllFormDrafts } from "../../../shared/formDraftMemory";
import { saveSharedWork } from "../../../shared/sharedWorkRequest";
import { draftStore } from "../../../../platform/draftStore";
import { confirmAction } from "../../../shared/confirm";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import {
  canResubmit,
  fetchWorkProposals,
  sendWorkProposal,
  type WorkProposal,
  type ProposalRequest,
} from "../workProposals";

jest.mock("../workProposals", () => ({
  canResubmit: jest.fn(() => false),
  fetchWorkProposals: jest.fn(),
  sendWorkProposal: jest.fn(),
}));
jest.mock("../../../../core/web/app/features/nested-work/services/workTreeService", () => ({ fetchWorkTree: jest.fn() }));

jest.mock("../../../shared/sharedWorkRequest", () => ({
  saveSharedWork: jest.fn(),
}));

jest.mock("../../../shared/confirm", () => ({
  confirmAction: jest.fn(async () => true),
}));

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    get: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  },
}));

jest.mock("../assignedSubtaskReviews", () => ({
  fetchAssignedSubtaskReviews: jest.fn(async () => []),
}));

jest.mock("../EvidencePicker", () => ({
  evidenceIssue: jest.fn(() => undefined),
  EvidencePicker: () => {
    const { Text } = require("react-native");
    return <Text testID="evidence-picker">Attach evidence</Text>;
  },
}));

jest.mock("../EvidenceAttachment", () => ({
  EvidenceAttachment: ({ name }: { name: string }) => {
    const { Text } = require("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("../../../../platform/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const baseProposal = (overrides: Partial<WorkProposal> = {}): WorkProposal => ({
  id: "prop-1",
  root_id: "task-1",
  node_id: null,
  kind: "progress",
  state: "pending",
  author_id: "member-1",
  reviewer_id: "lead-1",
  submitted_as_lead: false,
  terms: {
    note: "Drafted structural specs",
  },
  submitted_at: "2026-11-14T08:00:00Z",
  decided_at: null,
  decision_note: null,
  supersedes: null,
  canDecide: true,
  ...overrides,
});

beforeEach(() => {
  clearAllFormDrafts();
  jest.clearAllMocks();
  jest.mocked(draftStore.get).mockResolvedValue(undefined);
});

test.each(["progress", "completion"] as const)("Office %s proposals reject revoked exact-node membership before sending", async (kind) => {
  const latest = { revision: 1,
    root: { id: "task-1", kind: "office", project: "project", office: "office", lead: "member-1", open: true },
    nodes: [{ id: "sub-1", task_id: "task-1", lead_id: "sub-lead", assigned_to_ids: [],
      capabilities: { execute: { allowed: true, reason_code: null }, submit: { allowed: true, reason_code: null } } }],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(latest, "member-1");
  jest.mocked(fetchWorkTree).mockResolvedValue(latest);
  jest.mocked(fetchWorkProposals).mockResolvedValue({ items: [], canProposeProgress: true, canProposeCompletion: true });
  await render(<WorkProposalSheet actor="member-1" root="task-1" node="sub-1" kind={kind}
    officeSubtask onClose={jest.fn()} onSaved={async () => {}} />);
  await fireEvent.changeText(await screen.findByLabelText(kind === "progress" ? "Work note" : "Completion note"), "Keep this evidence note");
  await fireEvent.press(screen.getByRole("button", { name: kind === "progress" ? "Submit progress for review" : "Submit for review" }));
  await waitFor(() => expect(screen.getByText(/Current assignment and work access/)).toBeOnTheScreen());
  expect(sendWorkProposal).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("Keep this evidence note")).toBeOnTheScreen();

  // Explicit assignment still requires a current authoritative capability.
  latest.nodes[0].assigned_to_ids = ["member-1"];
  latest.nodes[0].capabilities = {};
  await fireEvent.press(screen.getByRole("button", { name: kind === "progress" ? "Submit progress for review" : "Submit for review" }));
  await waitFor(() => expect(fetchWorkTree).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("button", { name: kind === "progress" ? "Submit progress for review" : "Submit for review" })).toBeEnabled());
  expect(sendWorkProposal).not.toHaveBeenCalled();

  latest.nodes[0].capabilities = { execute: { allowed: true, reason_code: null }, submit: { allowed: true, reason_code: null } };
  await fireEvent.press(screen.getByRole("button", { name: kind === "progress" ? "Submit progress for review" : "Submit for review" }));
  await waitFor(() => expect(sendWorkProposal).toHaveBeenCalledTimes(1));
  expect(sendWorkProposal).toHaveBeenCalledWith("member-1", "task-1", "sub-1", expect.any(String),
    expect.objectContaining({ args: expect.objectContaining({ p_node: "sub-1", p_kind: kind }) }), false);
});

const contributorCompletionTree = (leadId: string, assigned: string[]) => ({ revision: 1,
  root: { id: "task-1", kind: "office", project: "project", office: "office", lead: "task-lead", open: true },
  nodes: [{ id: "sub-1", task_id: "task-1", lead_id: leadId, assigned_to_ids: assigned,
    status: "in_progress", started_at: "2026-11-18T00:00:00Z", percent_complete: 90,
    capabilities: {
      execute: { allowed: true, reason_code: null },
      submit: { allowed: false, reason_code: "branch_denied" },
    } }],
}) as unknown as WorkTreeSnapshot;

test("an assigned Subtask Contributor denied direct submit (branch_denied) still sends a completion proposal", async () => {
  const latest = contributorCompletionTree("sub-lead", ["member-1"]);
  rememberWorkCapabilityContext(latest, "member-1");
  jest.mocked(fetchWorkTree).mockResolvedValue(latest);
  jest.mocked(fetchWorkProposals).mockResolvedValue({ items: [], canProposeProgress: true, canProposeCompletion: true });
  jest.mocked(sendWorkProposal).mockResolvedValue(undefined);
  await render(<WorkProposalSheet actor="member-1" root="task-1" node="sub-1" kind="completion"
    officeSubtask onClose={jest.fn()} onSaved={async () => {}} />);
  await fireEvent.changeText(await screen.findByLabelText("Completion note"), "Finished the scoped work");
  await fireEvent.press(screen.getByRole("button", { name: "Submit for review" }));
  await waitFor(() => expect(sendWorkProposal).toHaveBeenCalledTimes(1));
  expect(sendWorkProposal).toHaveBeenCalledWith("member-1", "task-1", "sub-1", expect.any(String),
    expect.objectContaining({ args: expect.objectContaining({ p_node: "sub-1", p_kind: "completion" }) }), false);
});

test("an assigned Subtask Contributor is still blocked when the fresh m7 context denies completion", async () => {
  const latest = contributorCompletionTree("sub-lead", ["member-1"]);
  rememberWorkCapabilityContext(latest, "member-1");
  jest.mocked(fetchWorkTree).mockResolvedValue(latest);
  jest.mocked(fetchWorkProposals).mockResolvedValue({ items: [], canProposeProgress: true, canProposeCompletion: false });
  await render(<WorkProposalSheet actor="member-1" root="task-1" node="sub-1" kind="completion"
    officeSubtask onClose={jest.fn()} onSaved={async () => {}} />);
  await fireEvent.changeText(await screen.findByLabelText("Completion note"), "Finished the scoped work");
  await fireEvent.press(screen.getByRole("button", { name: "Submit for review" }));
  await waitFor(() => expect(screen.getByText(/no longer have permission/)).toBeOnTheScreen());
  expect(sendWorkProposal).not.toHaveBeenCalled();
});

test("an appointed Subtask Lead still requires direct submit capability for a completion proposal", async () => {
  const latest = contributorCompletionTree("member-1", []);
  rememberWorkCapabilityContext(latest, "member-1");
  jest.mocked(fetchWorkTree).mockResolvedValue(latest);
  jest.mocked(fetchWorkProposals).mockResolvedValue({ items: [], canProposeProgress: true, canProposeCompletion: true });
  await render(<WorkProposalSheet actor="member-1" root="task-1" node="sub-1" kind="completion"
    officeSubtask onClose={jest.fn()} onSaved={async () => {}} />);
  await fireEvent.changeText(await screen.findByLabelText("Completion note"), "Finished the scoped work");
  await fireEvent.press(screen.getByRole("button", { name: "Submit for review" }));
  await waitFor(() => expect(screen.getByText(/Current assignment and work access/)).toBeOnTheScreen());
  expect(sendWorkProposal).not.toHaveBeenCalled();
});

test.each([
  { note: "Work recorded", next_step: "Request sign-off" },
  { note: "Work recorded\n\nNext step: Legacy plan" },
])(
  "recovered progress shows saved terms and verifies the unchanged request: %j",
  async (terms) => {
    const request: ProposalRequest = {
      id: "saved-progress",
      args: {
        p_root: "task-1",
        p_node: "sub-1",
        p_request: "saved-progress",
        p_kind: "progress",
        p_terms: terms,
        p_supersedes: null,
      },
    };
    jest.mocked(draftStore.get).mockResolvedValue(request);
    jest.mocked(sendWorkProposal).mockResolvedValue(undefined);
    await render(
      <WorkProposalSheet
        actor="member-1"
        root="task-1"
        node="sub-1"
        kind="progress"
        onClose={jest.fn()}
        onSaved={jest.fn(async () => {})}
      />,
    );
    await waitFor(() =>
      expect(screen.getByDisplayValue(terms.note)).toHaveProp(
        "editable",
        false,
      ),
    );
    if (terms.next_step) {
      expect(screen.getByLabelText("Next step")).toHaveDisplayValue(
        terms.next_step,
      );
      expect(screen.getByLabelText("Next step")).toHaveProp("editable", false);
    } else {
      expect(screen.queryByLabelText("Next step")).toBeNull();
    }
    await fireEvent.press(
      screen.getByRole("button", { name: "Verify submission" }),
    );
    await waitFor(() =>
      expect(sendWorkProposal).toHaveBeenCalledWith(
        "member-1",
        "task-1",
        "sub-1",
        "work-proposal:task-1:sub-1:progress",
        request,
        true,
      ),
    );
  },
);

test("discarding an unsubmitted saved upload restores its structured next step for editing", async () => {
  const request: ProposalRequest = {
    id: "saved-upload",
    args: {
      p_terms: { note: "Awaiting review", next_step: "Ask for a signature" },
    },
    files: [
      {
        uri: "file:///evidence.pdf",
        name: "evidence.pdf",
        size: 10,
        type: "application/pdf",
      },
    ],
  };
  jest.mocked(draftStore.get).mockResolvedValue(request);
  await render(
    <WorkProposalSheet
      actor="member-1"
      root="task-1"
      kind="progress"
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );
  await screen.findByRole("button", { name: "Discard saved upload" });
  jest
    .mocked(draftStore.get)
    .mockResolvedValueOnce(request)
    .mockResolvedValue(undefined);
  await fireEvent.press(
    screen.getByRole("button", { name: "Discard saved upload" }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Next step")).toHaveProp("editable", true),
  );
  expect(confirmAction).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Next step")).toHaveDisplayValue(
    "Ask for a signature",
  );
  expect(screen.getByLabelText("Work note")).toHaveDisplayValue(
    "Awaiting review",
  );
});

test.each([undefined, "sub-1"])(
  "returned progress retains an editable next step for Task/Subtask %s",
  async (node) => {
    const returned = baseProposal({
      node_id: node ?? null,
      state: "changes_requested",
      canDecide: false,
      terms: { note: "Original note", next_step: "Get a signature" },
    });
    jest.mocked(fetchWorkProposals).mockResolvedValue({
      items: [returned],
      canProposeProgress: true,
      canProposeCompletion: false,
    });
    jest.mocked(canResubmit).mockReturnValue(true);
    jest.mocked(sendWorkProposal).mockResolvedValue(undefined);
    await render(
      <WorkProposalReview
        actor="member-1"
        root="task-1"
        node={node}
        onSaved={jest.fn(async () => {})}
      />,
    );
    await fireEvent.press(
      await screen.findByRole("button", { name: "Resubmit work" }),
    );
    expect(screen.getByLabelText("Next step")).toHaveDisplayValue(
      "Get a signature",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Work note"),
      "Revised evidence ready",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Next step"),
      "Obtain final approval",
    );
    const buttons = screen.getAllByRole("button", { name: "Resubmit work" });
    await fireEvent.press(buttons[buttons.length - 1]);
    await waitFor(() => expect(sendWorkProposal).toHaveBeenCalledTimes(1));
    expect(jest.mocked(sendWorkProposal).mock.calls[0]?.[4].args).toMatchObject(
      {
        p_node: node ?? null,
        p_supersedes: returned.id,
        p_terms: {
          note: "Revised evidence ready",
          next_step: "Obtain final approval",
        },
      },
    );
  },
);

test("work note and next step have separate limits and overlong next step prevents submission", async () => {
  jest.mocked(fetchWorkProposals).mockResolvedValue({
    items: [],
    canProposeProgress: true,
    canProposeCompletion: false,
  });
  jest.mocked(sendWorkProposal).mockResolvedValue(undefined);
  await render(
    <WorkProposalSheet
      actor="member-1"
      root="task-1"
      kind="progress"
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Submit progress for review" }),
    ).toBeEnabled(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Work note"),
    "n".repeat(3000),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Next step"),
    "s".repeat(301),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit progress for review" }),
  );
  expect(
    await screen.findByText("Next step must be 300 characters or fewer."),
  ).toBeOnTheScreen();
  expect(sendWorkProposal).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText("Next step"),
    "s".repeat(300),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit progress for review" }),
  );
  await waitFor(() => expect(sendWorkProposal).toHaveBeenCalledTimes(1));
  expect(
    jest.mocked(sendWorkProposal).mock.calls[0]?.[4].args.p_terms,
  ).toMatchObject({
    note: "n".repeat(3000),
    next_step: "s".repeat(300),
  });
});

test("Task contributor progress proposal uses Work state, Blocker, Work note, Next step, and Evidence without Progress (%)", async () => {
  jest.mocked(fetchWorkProposals).mockResolvedValue({
    items: [],
    canProposeProgress: true,
    canProposeCompletion: true,
  });
  jest.mocked(sendWorkProposal).mockResolvedValue(undefined);

  const onClose = jest.fn();
  const onSaved = jest.fn(async () => {});

  await render(
    <WorkProposalSheet
      actor="member-1"
      root="task-1"
      kind="progress"
      currentProgress={45}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Work state" }),
    ).toBeOnTheScreen();
  });
  expect(screen.queryByText(/Progress \(%\)/)).toBeNull();
  expect(screen.getByRole("button", { name: "Work state" })).toHaveTextContent(
    "In progress",
  );
  expect(screen.getByLabelText("Work note")).toBeOnTheScreen();
  expect(screen.getByLabelText("Next step")).toBeOnTheScreen();
  expect(screen.getByTestId("evidence-picker")).toBeOnTheScreen();
  expect(screen.queryByLabelText("Blocker")).toBeNull();

  // Select Blocked and require Blocker
  await fireEvent.press(screen.getByRole("button", { name: "Work state" }));
  await fireEvent.press(await screen.findByRole("radio", { name: "Blocked" }));
  expect(await screen.findByLabelText("Blocker")).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", { name: "Submit progress for review" }),
  );
  await waitFor(() => {
    expect(
      screen.getByText("Describe what is blocking the work."),
    ).toBeOnTheScreen();
  });

  await fireEvent.changeText(
    screen.getByLabelText("Blocker"),
    "Awaiting soil report",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Work note"),
    "Completed site staking",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Next step"),
    "Request lab follow-up",
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Submit progress for review" }),
  );
  await waitFor(() => {
    expect(sendWorkProposal).toHaveBeenCalledTimes(1);
  });

  const payload = jest.mocked(sendWorkProposal).mock.calls[0]?.[4];
  expect(payload?.args).toMatchObject({
    p_root: "task-1",
    p_node: null,
    p_kind: "progress",
    p_terms: {
      note: "Completed site staking",
      next_step: "Request lab follow-up",
      blocker: "Awaiting soil report",
      progress: 45,
    },
    p_supersedes: null,
  });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test("Subtask contributor progress proposal omits Progress (%), prefills active blocker, and allows switching to In progress to clear", async () => {
  jest.mocked(fetchWorkProposals).mockResolvedValue({
    items: [],
    canProposeProgress: true,
    canProposeCompletion: false,
  });
  jest.mocked(sendWorkProposal).mockResolvedValue(undefined);

  const view = await render(
    <WorkProposalSheet
      actor="member-2"
      root="task-1"
      node="sub-1"
      kind="progress"
      initialBlocker="Permit signature pending"
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Work state" }),
    ).toHaveTextContent("Blocked");
  });
  expect(
    screen.getByDisplayValue("Permit signature pending"),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Progress \(%\)/)).toBeNull();

  // Untouched blocker clears automatically if cleared before editing
  await view.rerender(
    <WorkProposalSheet
      actor="member-2"
      root="task-1"
      node="sub-1"
      kind="progress"
      initialBlocker={null}
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Work state" }),
    ).toHaveTextContent("In progress");
  });
  expect(screen.queryByLabelText("Blocker")).toBeNull();

  await fireEvent.changeText(
    screen.getByLabelText("Work note"),
    "Signature secured",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Next step"),
    "  File signed permit  ",
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Submit progress for review" }),
  );
  await waitFor(() => {
    expect(sendWorkProposal).toHaveBeenCalledTimes(1);
  });

  const payload = jest.mocked(sendWorkProposal).mock.calls[0]?.[4];
  expect(payload?.args.p_node).toBe("sub-1");
  expect(payload?.args.p_terms).toEqual({
    note: "Signature secured",
    next_step: "File signed permit",
  });
});

test("Contributor completion proposal uses Completion note and EvidencePicker without Work state or Next step", async () => {
  jest.mocked(fetchWorkProposals).mockResolvedValue({
    items: [],
    canProposeProgress: false,
    canProposeCompletion: true,
  });

  await render(
    <WorkProposalSheet
      actor="member-1"
      root="task-1"
      node="sub-1"
      kind="completion"
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );

  await waitFor(() => {
    expect(screen.getByLabelText("Completion note")).toBeOnTheScreen();
  });
  expect(screen.queryByLabelText("Work state")).toBeNull();
  expect(screen.queryByLabelText("Next step")).toBeNull();
  expect(screen.queryByText(/Progress \(%\)/)).toBeNull();
  expect(screen.getByTestId("evidence-picker")).toBeOnTheScreen();
});

test("WorkProposalReview displays blocker on proposal and opens Review note for both Approve (optional) and Request changes (required)", async () => {
  const proposal = baseProposal({
    terms: {
      note: "Work paused",
      blocker: "Waiting on structural sign-off",
      next_step: "Ask the engineer to review",
    },
  });
  jest.mocked(fetchWorkProposals).mockResolvedValue({
    items: [proposal],
    canProposeProgress: false,
    canProposeCompletion: false,
  });
  jest.mocked(canResubmit).mockReturnValue(false);
  jest.mocked(saveSharedWork).mockResolvedValue(undefined as never);

  const onSaved = jest.fn(async () => {});
  await render(
    <WorkProposalReview
      actor="lead-1"
      root="task-1"
      people={[{ id: "member-1", name: "Dela Cruz" }]}
      onSaved={onSaved}
    />,
  );

  await waitFor(() => {
    expect(
      screen.getByText("Blocker · Waiting on structural sign-off"),
    ).toBeOnTheScreen();
  });

  // Approve opens Review note optionally and accepts empty note
  expect(
    screen.getByText("Next step · Ask the engineer to review"),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Approve work" }));
  expect(screen.getAllByText("Approve work").length).toBeGreaterThan(0);
  expect(screen.getByLabelText("Review note")).toBeOnTheScreen();

  const approveButtons = screen.getAllByRole("button", {
    name: "Approve work",
  });
  await fireEvent.press(approveButtons[approveButtons.length - 1]);
  await waitFor(() => {
    expect(saveSharedWork).toHaveBeenCalledTimes(1);
  });
  expect(jest.mocked(saveSharedWork).mock.calls[0]?.[3]?.args).toMatchObject({
    p_proposal: "prop-1",
    p_approve: true,
    p_note: null,
  });

  // Wait for card Request changes button to become enabled again after refresh
  const cardReject = await screen.findByRole("button", {
    name: "Request changes",
  });
  await waitFor(() => {
    expect(cardReject).toBeEnabled();
  });

  await fireEvent.press(cardReject);
  expect(await screen.findByLabelText("Review note")).toBeOnTheScreen();

  const getSheetReject = () => {
    const all = screen.getAllByRole("button", { name: "Request changes" });
    return all[all.length - 1];
  };

  await fireEvent.press(getSheetReject());
  await waitFor(() => {
    expect(screen.getByText("Explain what needs to change.")).toBeOnTheScreen();
  });
  expect(saveSharedWork).toHaveBeenCalledTimes(1);

  await fireEvent.changeText(
    screen.getByLabelText("Review note"),
    "Attach revised sketch",
  );
  await fireEvent.press(getSheetReject());

  await waitFor(() => {
    expect(saveSharedWork).toHaveBeenCalledTimes(2);
  });
  expect(jest.mocked(saveSharedWork).mock.calls[1]?.[3]?.args).toMatchObject({
    p_proposal: "prop-1",
    p_approve: false,
    p_note: "Attach revised sketch",
  });
});
