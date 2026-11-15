import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { WorkProposalReview, WorkProposalSheet } from "../WorkProposalSheet";
import { clearAllFormDrafts } from "../../../shared/formDraftMemory";
import { saveSharedWork } from "../../../shared/sharedWorkRequest";
import {
  canResubmit,
  fetchWorkProposals,
  sendWorkProposal,
  type WorkProposal,
} from "../workProposals";

jest.mock("../workProposals", () => ({
  canResubmit: jest.fn(() => false),
  fetchWorkProposals: jest.fn(),
  sendWorkProposal: jest.fn(),
}));

jest.mock("../../../shared/sharedWorkRequest", () => ({
  saveSharedWork: jest.fn(),
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
    expect(screen.getByRole("button", { name: "Work state" })).toBeOnTheScreen();
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
    expect(screen.getByText("Describe what is blocking the work.")).toBeOnTheScreen();
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
      note: "Completed site staking\n\nNext step: Request lab follow-up",
      blocker: "Awaiting soil report",
      progress: 45,
    },
    p_supersedes: null,
  });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test("Subtask contributor progress proposal omits Progress (%) and defaults to In progress even with an active blocker", async () => {
  jest.mocked(fetchWorkProposals).mockResolvedValue({
    items: [],
    canProposeProgress: true,
    canProposeCompletion: false,
  });
  jest.mocked(sendWorkProposal).mockResolvedValue(undefined);

  await render(
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
    expect(screen.getByRole("button", { name: "Work state" })).toHaveTextContent(
      "In progress",
    );
  });
  expect(screen.queryByLabelText("Blocker")).toBeNull();
  expect(screen.queryByText(/Progress \(%\)/)).toBeNull();

  await fireEvent.changeText(screen.getByLabelText("Work note"), "Signature secured");

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
    terms: { note: "Work paused", blocker: "Waiting on structural sign-off" },
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
  await fireEvent.press(screen.getByRole("button", { name: "Approve" }));
  expect(await screen.findByText("Approve work")).toBeOnTheScreen();
  expect(screen.getByLabelText("Review note")).toBeOnTheScreen();

  const approveButtons = screen.getAllByRole("button", { name: "Approve" });
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
  const cardReject = await screen.findByRole("button", { name: "Request changes" });
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
