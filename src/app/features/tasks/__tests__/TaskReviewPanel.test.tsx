import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { TaskReviewPanel } from "../TaskReviewPanel";
import {
  fetchTaskSubmissions,
  fetchSubmissionAttachments,
} from "../../../../core/web/app/features/reviews/services/reviewService";
import { fetchTaskCashBlockers } from "../../../../core/web/app/features/budget/services/taskCashClearanceService";
import { verifyTask } from "../../../../core/web/app/features/tasks/services/taskService";
import { confirmAction } from "../../../shared/confirm";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
import type { ReviewSubmission } from "../../../../core/web/app/features/reviews/types";

let mockActor = "reviewer";
let mockCurrent: Task;
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: mockActor, role: "member" } }),
}));
jest.mock(
  "../../../../core/web/app/features/reviews/services/reviewService",
  () => ({
    fetchTaskSubmissions: jest.fn(),
    fetchSubmissionAttachments: jest.fn(),
  }),
);
jest.mock(
  "../../../../core/web/app/features/budget/services/taskCashClearanceService",
  () => ({ fetchTaskCashBlockers: jest.fn() }),
);
jest.mock(
  "../../../../core/web/app/features/tasks/services/taskService",
  () => ({ verifyTask: jest.fn() }),
);
jest.mock(
  "../../../../core/web/app/features/tasks/services/taskMapper",
  () => ({ rowToTask: () => mockCurrent }),
);
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        is: () => q,
        single: async () => ({ data: {} }),
      };
      return q;
    },
  },
}));
jest.mock("../../../../platform/webRuntime", () => ({
  nativeWindow: { dispatchEvent: jest.fn() },
}));
jest.mock("../taskEvidence", () => ({
  assertEvidenceActor: jest.fn(async () => {}),
}));
jest.mock("../../../shared/confirm", () => ({ confirmAction: jest.fn() }));
const task = {
  id: "root",
  reviewerId: "reviewer",
  status: "for_review",
  latestSubmission: { id: "v1" },
} as Task;
const pending = {
  id: "v1",
  version: 1,
  taskId: "root",
  submitterId: "worker",
  submitterName: "QA worker",
  note: "Safe work",
  status: "pending",
  submittedAt: 10,
} as ReviewSubmission;

beforeEach(() => {
  jest.resetAllMocks();
  mockActor = "reviewer";
  mockCurrent = task;
  jest.mocked(fetchTaskSubmissions).mockResolvedValue([pending]);
  jest.mocked(fetchSubmissionAttachments).mockResolvedValue([]);
  jest.mocked(fetchTaskCashBlockers).mockResolvedValue([]);
  jest.mocked(confirmAction).mockResolvedValue(true);
});

test.each([true, false])(
  "an independent decision confirms only the exact submission, approval %s",
  async (approve) => {
    const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const reason = approve ? "" : "Recheck the fixture note";
    jest.mocked(verifyTask).mockImplementationOnce(async () => {
      jest
        .mocked(fetchTaskSubmissions)
        .mockResolvedValue([
          {
            ...pending,
            status: approve ? "approved" : "changes_requested",
            decidedBy: "reviewer",
            decisionFeedback: reason,
          },
        ]);
    });
    await render(
      <TaskReviewPanel
        task={task}
        initialSubmissionId="v1"
        onSaved={onSaved}
        readOnly={false}
      />,
    );
    const button = approve ? "Approve work" : "Request changes";
    await waitFor(() =>
      expect(screen.getByRole("button", { name: button })).toBeOnTheScreen(),
    );
    if (!approve) {
      expect(screen.getByRole("button", { name: button })).toBeDisabled();
      await fireEvent.changeText(
        screen.getByLabelText("Feedback (required when requesting changes)"),
        reason,
      );
    }
    await waitFor(() =>
      expect(screen.getByRole("button", { name: button })).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: button }));
    await waitFor(() =>
      expect(screen.getByText("Review decision confirmed.")).toBeOnTheScreen(),
    );
    expect(verifyTask).toHaveBeenCalledWith("root", approve, reason);
    expect(fetchSubmissionAttachments).toHaveBeenCalledWith("root", "v1");
    expect(onSaved).toHaveBeenCalledTimes(1);
  },
);

test("the original worker can read the returned feedback but cannot decide their own submission", async () => {
  mockActor = "worker";
  const workerTask = { ...task, reviewerId: "worker" };
  const view = await render(
    <TaskReviewPanel
      task={workerTask}
      initialSubmissionId="v1"
      onSaved={async () => {}}
      readOnly={false}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByText("An independent reviewer must decide your submission."),
    ).toBeOnTheScreen(),
  );
  expect(screen.queryByRole("button", { name: "Approve work" })).toBeNull();
  jest
    .mocked(fetchTaskSubmissions)
    .mockResolvedValue([
      {
        ...pending,
        status: "changes_requested",
        decisionFeedback: "Recheck the fixture note",
        decidedByName: "QA reviewer",
      },
    ]);
  await view.rerender(
    <TaskReviewPanel
      task={{ ...workerTask, updatedAt: 20, status: "changes_requested" }}
      initialSubmissionId="v1"
      onSaved={async () => {}}
      readOnly={false}
    />,
  );
  await waitFor(() =>
    expect(screen.getByText("Recheck the fixture note")).toBeOnTheScreen(),
  );
  expect(screen.getByText("QA reviewer")).toBeOnTheScreen();
  expect(verifyTask).not.toHaveBeenCalled();
});
