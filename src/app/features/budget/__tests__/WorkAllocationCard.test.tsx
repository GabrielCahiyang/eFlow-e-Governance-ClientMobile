import { expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { TaskFundingContext } from "../../../../core/web/app/features/budget/types";
import type { SharedWorkRequest } from "../../../shared/sharedWorkRequest";
import { TaskFundingCard } from "../TaskFundingCard";
import { WorkAllocationCard } from "../WorkAllocationCard";

const mockRpc =
  jest.fn<(fn: string, args?: Record<string, unknown>) => Promise<unknown>>();
const mockSaveSharedWork =
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
const mockFetchTaskFundingContext =
  jest.fn<() => Promise<TaskFundingContext>>();
let mockBudgetBundle: unknown = undefined;

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor-1", org_id: "office-1" } }),
}));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: async () => undefined },
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    channel: () => {
      const channel = { on: () => channel, subscribe: () => channel };
      return channel;
    },
    removeChannel: async () => "ok",
  },
}));
jest.mock("../../../shared/sharedWorkRequest", () => ({
  sharedWorkRpc: (fn: string, args?: Record<string, unknown>) =>
    mockRpc(fn, args),
  saveSharedWork: (...args: Parameters<typeof mockSaveSharedWork>) =>
    mockSaveSharedWork(...args),
}));
jest.mock(
  "../../../../core/web/app/features/budget/services/budgetService",
  () => ({
    fetchTaskFundingContext: () => mockFetchTaskFundingContext(),
  }),
);
jest.mock("../useBudget", () => ({
  useBudget: () => ({
    data: mockBudgetBundle,
    loading: false,
    error: undefined,
    refresh: async () => {},
  }),
}));
jest.mock("../focusedSubtaskFunding", () => ({
  readFocusedSubtaskFunding: async () => ({
    summary: { perReceiptLimit: 5000 },
    requests: [],
    requestAttachments: [],
    releases: [],
    liquidations: [],
    allocationLines: [],
  }),
}));
jest.mock("../workExpenseTotals", () => ({
  fetchWorkExpenseTotals: async () => new Map(),
}));
let mockCashReload: (() => Promise<unknown>) | undefined;
jest.mock("../useCashRequestUpdates", () => ({
  useCashRequestUpdates: (
    _taskId: string,
    enabled: boolean,
    reload: () => Promise<unknown>,
  ) => {
    if (enabled) mockCashReload = reload;
  },
}));

test("WorkAllocationCard does not flicker Set up funding in eFlow Web while read-only or unavailable", async () => {
  mockRpc.mockResolvedValue({ canAllocate: false });
  const readOnlyView = await render(
    <WorkAllocationCard
      task="task-1"
      readOnly
      onSaved={async () => {}}
    />,
  );
  expect(readOnlyView.queryByText(/eFlow Web/i)).toBeNull();

  const view = await render(
    <WorkAllocationCard
      task="task-1"
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  await waitFor(() => expect(mockRpc).toHaveBeenCalled());
  expect(view.queryByText(/eFlow Web/i)).toBeNull();
});

test("TaskFundingCard never shows Set up funding in eFlow Web while funding skeleton is loading", async () => {
  let resolveFunding!: (value: TaskFundingContext) => void;
  mockFetchTaskFundingContext.mockReturnValue(
    new Promise<TaskFundingContext>((resolve) => {
      resolveFunding = resolve;
    }),
  );
  await render(
    <TaskFundingCard
      task={{ id: "task-1", orgId: "office-1", status: "in_progress" }}
      canManage
      readOnly={false}
    />,
  );
  expect(await screen.findByLabelText("Loading funding")).toBeOnTheScreen();
  expect(screen.queryByText(/Set up funding/i)).toBeNull();
  expect(screen.queryByText(/eFlow Web/i)).toBeNull();
  resolveFunding({
    taskId: "task-1",
    taskLeaderId: "actor-1",
    funded: false,
    taskBudget: 0,
    available: 0,
    lines: [],
  });
  await waitFor(() =>
    expect(
      screen.getByText("This work has no authorized funding yet."),
    ).toBeOnTheScreen(),
  );
  expect(screen.queryByText(/Set up funding/i)).toBeNull();
});

test("WorkAllocationCard lets the Project Lead return unused task funding even after the task is closed", async () => {
  const lineId = "2b1b2b34-1234-4123-8123-1234567890ab";
  mockRpc.mockImplementation(async (fn) => {
    if (fn === "m7_work_allocation_context")
      return { canAllocate: false, reason: "task_closed" };
    if (fn === "project_flow_snapshot")
      return {
        canAllocate: true,
        ready: true,
        taskFunding: [
          {
            id: lineId,
            taskId: "task-closed",
            source: "MOOE · Supplies",
            fiscalYear: 2026,
            amount: 20000,
            available: 7500,
          },
        ],
      };
    return {};
  });
  mockSaveSharedWork.mockImplementation(
    async (_actor, _scope, _op, _req, accepts) => {
      expect(accepts({ released: true, amount: 7500 })).toBe(true);
    },
  );
  const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  await render(
    <WorkAllocationCard
      task="task-closed"
      projectId="proj-1"
      taskFinished
      readOnly={false}
      onSaved={onSaved}
    />,
  );
  expect(await screen.findByText("MOOE · Supplies · FY 2026")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Return unused funding" }),
  );
  await fireEvent.changeText(
    await screen.findByLabelText("Reason"),
    "Task completed under budget",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Confirm return" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(mockSaveSharedWork).toHaveBeenCalledWith(
    "actor-1",
    "work-allocation-return:task-closed:",
    "release_project_task_funding",
    expect.objectContaining({
      args: expect.objectContaining({
        p_line: lineId,
        p_reason: "Task completed under budget",
      }),
    }),
    expect.any(Function),
    false,
  );
});

test("TaskFundingCard prompts for a subtask budget cap when unallocated and enables Request task cash for an assigned subtask member once capped", async () => {
  mockFetchTaskFundingContext.mockResolvedValueOnce({
    taskId: "task-1",
    subtaskId: "sub-1",
    taskLeaderId: "lead-1",
    funded: true,
    taskBudget: 40000,
    available: 10000,
    lines: [],
    distribution: {
      allocated: 0,
      unallocated: 40000,
      available: 40000,
      released: 0,
      spent: 0,
    },
  });
  const view = await render(
    <TaskFundingCard
      task={{ id: "task-1", orgId: "office-1", status: "in_progress" }}
      subtaskId="sub-1"
      canManage
      readOnly={false}
    />,
  );
  expect(
    await screen.findByText(
      "Ask the task lead to allocate a budget to this subtask before requesting cash.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Request task cash" }),
  ).toBeNull();

  mockFetchTaskFundingContext.mockResolvedValueOnce({
    taskId: "task-1",
    subtaskId: "sub-2",
    taskLeaderId: "lead-1",
    funded: true,
    taskBudget: 40000,
    available: 8000,
    lines: [],
    cap: {
      id: "cap-1",
      amount: 8000,
      available: 8000,
      allocationLineId: "line-1",
      reason: "Field survey",
    },
    distribution: {
      allocated: 8000,
      unallocated: 32000,
      available: 8000,
      released: 0,
      spent: 0,
    },
  });
  await view.rerender(
    <TaskFundingCard
      task={{ id: "task-1", orgId: "office-1", status: "in_progress" }}
      subtaskId="sub-2"
      canManage
      readOnly={false}
    />,
  );
  expect(
    await screen.findByRole("button", { name: "Request task cash" }),
  ).toBeOnTheScreen();
});

test("TaskFundingCard keeps Allocate from the project and Allocate Task funding visible during background reloads", async () => {
  mockBudgetBundle = {
    perReceiptLimit: 5000,
    requests: [],
    liquidations: [],
    releases: [],
  };
  mockFetchTaskFundingContext.mockResolvedValue({
    taskId: "task-alloc",
    funded: true,
    taskBudget: 40000,
    available: 40000,
    lines: [],
  });
  const loadedContext = {
    canAllocate: true,
    ready: true,
    lines: [
      {
        id: "line-1",
        sourceId: "fund-1",
        name: "Field budget",
        fiscalYear: 2026,
        amount: 20000,
        available: 20000,
      },
    ],
    funds: [
      {
        id: "fund-2",
        source: "Contingency fund",
        fiscal_year: 2026,
        available: 50000,
      },
    ],
  };
  mockRpc.mockResolvedValue(loadedContext);

  await render(
    <TaskFundingCard
      task={{
        id: "task-alloc",
        orgId: "office-1",
        linkedProjectId: "proj-1",
        status: "in_progress",
      }}
      canManage
      readOnly={false}
    />,
  );

  expect(await screen.findByText("Allocate from the project")).toBeOnTheScreen();
  expect(
    await screen.findByRole("button", { name: "Allocate Task funding" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Request task cash" }),
  ).toBeOnTheScreen();

  let resolveFunding!: (value: TaskFundingContext) => void;
  mockFetchTaskFundingContext.mockImplementationOnce(
    () =>
      new Promise<TaskFundingContext>((resolve) => {
        resolveFunding = resolve;
      }),
  );

  let reloadPromise!: Promise<unknown>;
  await act(async () => {
    reloadPromise = mockCashReload ? mockCashReload() : Promise.resolve();
  });

  expect(screen.getByText("Allocate from the project")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Allocate Task funding" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Request task cash" }),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Loading funding")).toBeNull();
  expect(
    screen.queryByText("No eligible funding account is available."),
  ).toBeNull();

  await act(async () => {
    resolveFunding({
      taskId: "task-alloc",
      funded: true,
      taskBudget: 40000,
      available: 40000,
      lines: [],
    });
    await reloadPromise;
  });
});

test("WorkAllocationCard keeps Allocate Task funding visible while its own allocation context refreshes", async () => {
  const baseContext = {
    canAllocate: true,
    ready: true,
    lines: [
      {
        id: "line-1",
        sourceId: "fund-2",
        name: "Returnable MOOE",
        fiscalYear: 2026,
        amount: 10000,
        available: 5000,
      },
    ],
    funds: [
      {
        id: "fund-1",
        name: "Project MOOE",
        fiscal_year: 2026,
        available: 30000,
      },
    ],
  };
  mockRpc.mockResolvedValueOnce(baseContext);
  const view = await render(
    <WorkAllocationCard
      task="task-alloc-self"
      projectId="proj-1"
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  expect(
    await screen.findByRole("button", { name: "Allocate Task funding" }),
  ).toBeOnTheScreen();

  let resolveRefresh!: (value: unknown) => void;
  mockRpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
  );
  mockSaveSharedWork.mockResolvedValueOnce(undefined);

  await fireEvent.press(
    screen.getByRole("button", { name: "Return unused funding" }),
  );
  await fireEvent.changeText(
    await screen.findByLabelText("Reason"),
    "Return unused balance after completion",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Confirm return" }));

  await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(2));

  expect(screen.getByText("Allocate from the project")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Allocate Task funding" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("No eligible funding account is available."),
  ).toBeNull();

  await act(async () => {
    resolveRefresh(baseContext);
  });
  await view.unmount();
});

test("WorkAllocationCard displays fiscal year, validates missing schedule or FY mismatch, and surfaces SQL 23514 allocation errors cleanly", async () => {
  const funds = [
    {
      id: "fund-1",
      name: "Project Budjet 2",
      fiscal_year: 2026,
      available: 10000,
    },
  ];
  mockRpc.mockReset().mockResolvedValueOnce({
    canAllocate: true,
    ready: true,
    lines: [],
    funds,
  });
  const missingSchedule = await render(
    <WorkAllocationCard
      task="task-no-dates"
      projectId="proj-1"
      taskSchedule={{}}
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Allocate Task funding" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: /Funding account/i }),
  );
  await fireEvent.press(
    await screen.findByRole("radio", { name: "Project Budjet 2 · FY 2026" }),
  );
  expect(screen.getByText("FY 2026")).toBeOnTheScreen();
  expect(screen.queryByText("Task schedule")).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Amount to allocate"),
    "5000",
  );
  await fireEvent.changeText(screen.getByLabelText("Reason"), "ress");
  await fireEvent.press(screen.getByRole("button", { name: "Save allocation" }));
  expect(
    await screen.findByText(
      "Set the task start and due dates before allocating funding.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Check before retrying/)).toBeNull();
  expect(mockSaveSharedWork).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Close dialog"));
  expect(
    screen.queryByText(
      "Set the task start and due dates before allocating funding.",
    ),
  ).toBeNull();
  expect(screen.queryByText(/Couldn't complete this/)).toBeNull();
  await missingSchedule.unmount();

  mockRpc.mockReset().mockResolvedValueOnce({
    canAllocate: true,
    ready: true,
    lines: [],
    funds: [{ ...funds[0], fiscal_year: 2027 }],
  });
  const wrongFy = await render(
    <WorkAllocationCard
      task="task-wrong-fy"
      projectId="proj-1"
      taskSchedule={{ start: "2026-11-01", end: "2026-11-30" }}
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Allocate Task funding" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: /Funding account/i }),
  );
  await fireEvent.press(
    await screen.findByRole("radio", { name: "Project Budjet 2 · FY 2027" }),
  );
  expect(screen.getByText("FY 2027")).toBeOnTheScreen();
  expect(screen.queryByText("Task schedule")).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Amount to allocate"),
    "5000",
  );
  await fireEvent.changeText(screen.getByLabelText("Reason"), "ress");
  await fireEvent.press(screen.getByRole("button", { name: "Save allocation" }));
  expect(
    await screen.findByText(
      "Selected FY 2027 funding does not overlap this task's start and due dates.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Check before retrying/)).toBeNull();
  expect(mockSaveSharedWork).not.toHaveBeenCalled();
  await wrongFy.unmount();

  mockRpc.mockReset().mockResolvedValueOnce({
    canAllocate: true,
    ready: true,
    lines: [],
    funds,
  });
  mockSaveSharedWork.mockRejectedValueOnce({
    code: "23514",
    message: "Selected FY 2026 funding does not overlap this task timeline",
  });
  const serverReject = await render(
    <WorkAllocationCard
      task="task-server-reject"
      projectId="proj-1"
      taskSchedule={{ start: "2026-11-01", end: "2026-11-30" }}
      readOnly={false}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Allocate Task funding" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: /Funding account/i }),
  );
  await fireEvent.press(
    await screen.findByRole("radio", { name: "Project Budjet 2 · FY 2026" }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Amount to allocate"),
    "5000",
  );
  await fireEvent.changeText(screen.getByLabelText("Reason"), "ress");
  await fireEvent.press(screen.getByRole("button", { name: "Save allocation" }));
  expect(
    await screen.findByText(
      "Selected FY 2026 funding does not overlap this task's start and due dates.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Check before retrying/)).toBeNull();
  await serverReject.unmount();
});
