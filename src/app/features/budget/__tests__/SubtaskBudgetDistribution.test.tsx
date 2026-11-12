import { expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { TaskFundingContext } from "../../../../core/web/app/features/budget/types";
import type { SharedWorkRequest } from "../../../shared/sharedWorkRequest";
import { SubtaskBudgetDistribution } from "../SubtaskBudgetDistribution";

const cap = "f8036406-e2b7-481b-9d68-0d81070ae10f";
let mockPending: SharedWorkRequest | undefined;
const mockSave =
  jest.fn<
    (
      actor: string,
      scope: string,
      operation: string,
      command: SharedWorkRequest,
      receipt: (data: unknown) => boolean,
      recovering: boolean,
    ) => Promise<void>
  >();
const mockRead = jest.fn<() => Promise<TaskFundingContext>>();
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: async () => mockPending },
}));
jest.mock("../../../shared/sharedWorkRequest", () => ({
  saveSharedWork: (...args: Parameters<typeof mockSave>) => mockSave(...args),
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetService",
  () => ({
    fetchTaskFundingContext: () => mockRead(),
  }),
);

const context: TaskFundingContext = {
  taskId: "task-a",
  taskLeaderId: "lead-a",
  funded: true,
  taskBudget: 50000,
  available: 5000,
  lines: [],
  canManageDistribution: true,
  distribution: {
    allocated: 45000,
    unallocated: 5000,
    available: 5000,
    released: 6000,
    spent: 3000,
  },
  parentSources: [{ id: "supplies", name: "Supplies", available: 5000 }],
  subtaskBudgets: [
    {
      id: "subtask-a",
      title: "Print handouts",
      amount: 15000,
      returnable: 12000,
      capId: cap,
      sourceId: "supplies",
      hasHistory: true,
      finished: true,
      blocked: false,
    },
  ],
};
const props = { readOnly: false, taskFinished: false };

test("the task lead can return a finished subtask's unused budget and refresh the parent", async () => {
  mockPending = undefined;
  mockRead.mockResolvedValue({ ...context, subtaskId: "subtask-a" });
  mockSave.mockImplementation(
    async (_actor, _scope, _op, _request, accepts) => {
      expect(accepts(null)).toBe(true);
      expect(accepts(undefined)).toBe(false);
    },
  );
  const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const view = await render(
    <SubtaskBudgetDistribution
      {...props}
      context={context}
      actor="lead-a"
      onSaved={onSaved}
    />,
  );
  expect(screen.getByText("Allocated to subtasks")).toBeOnTheScreen();
  expect(screen.getByText("Actual spent")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Manage budget" }));
  await fireEvent.changeText(
    await screen.findByLabelText("Reason"),
    "Print order finished",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Confirm return" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(mockSave).toHaveBeenCalledWith(
    "lead-a",
    "work-allocation:task-a:subtask-a",
    "remove_subtask_budget_cap",
    expect.objectContaining({
      args: expect.objectContaining({
        p_cap_allocation_id: cap,
        p_reason: "Print order finished",
      }),
    }),
    expect.any(Function),
    false,
  );
  await view.rerender(
    <SubtaskBudgetDistribution
      {...props}
      context={context}
      actor="other"
      onSaved={onSaved}
    />,
  );
  expect(screen.queryByRole("button", { name: "Manage budget" })).toBeNull();
});
