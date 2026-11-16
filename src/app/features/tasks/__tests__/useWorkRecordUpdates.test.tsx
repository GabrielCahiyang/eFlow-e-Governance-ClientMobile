import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import { useWorkRecordUpdates } from "../useWorkRecordUpdates";
import { supabase } from "../../../../platform/supabase";

const listeners: Record<string, () => void> = {};
let channelStatus: ((status: string) => void) | undefined;
type ChangeFilter = { event: string; schema: string; table: string; filter: string };
const mockChannel: {
  on: jest.Mock<(_event: string, filter: ChangeFilter, cb: () => void) => typeof mockChannel>;
  subscribe: jest.Mock<(callback?: (status: string) => void) => typeof mockChannel>;
} = {
  on: jest.fn((_event: string, filter: ChangeFilter, cb: () => void) => {
    listeners[filter.table] = cb;
    return mockChannel;
  }),
  subscribe: jest.fn((callback?: (status: string) => void) => {
    channelStatus = callback;
    return mockChannel;
  }),
};

jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: jest.fn(() => mockChannel),
}));

jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    removeChannel: jest.fn(),
  },
}));

function Harness({ rootId, onRefresh, personal = false }: {
  rootId?: string;
  onRefresh: () => void;
  personal?: boolean;
}) {
  useWorkRecordUpdates(rootId, onRefresh, personal);
  return null;
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
  jest.clearAllMocks();
  for (const key of Object.keys(listeners)) delete listeners[key];
  channelStatus = undefined;
});

afterEach(() => {
  jest.useRealTimers();
});

test("useWorkRecordUpdates subscribes to tasks, subtasks, task_progress_updates, and subtask_progress_updates and cleans up on unmount", async () => {
  const onRefresh = jest.fn();
  const view = await render(<Harness rootId="root-1" onRefresh={onRefresh} />);

  expect(mockChannel.on).toHaveBeenCalledWith(
    "postgres_changes",
    { event: "*", schema: "public", table: "tasks", filter: "id=eq.root-1" },
    expect.any(Function),
  );
  expect(mockChannel.on).toHaveBeenCalledWith(
    "postgres_changes",
    { event: "*", schema: "public", table: "subtasks", filter: "task_id=eq.root-1" },
    expect.any(Function),
  );
  expect(mockChannel.on).toHaveBeenCalledWith(
    "postgres_changes",
    { event: "*", schema: "public", table: "task_progress_updates", filter: "task_id=eq.root-1" },
    expect.any(Function),
  );
  expect(mockChannel.on).toHaveBeenCalledWith(
    "postgres_changes",
    { event: "*", schema: "public", table: "subtask_progress_updates", filter: "task_id=eq.root-1" },
    expect.any(Function),
  );

  // Trigger task_progress_updates event and verify debounced refresh
  await act(async () => {
    listeners.task_progress_updates();
    jest.advanceTimersByTime(150);
  });
  expect(onRefresh).toHaveBeenCalledTimes(1);

  // Trigger subtask_progress_updates event and verify debounced refresh
  await act(async () => {
    listeners.subtask_progress_updates();
    jest.advanceTimersByTime(150);
  });
  expect(onRefresh).toHaveBeenCalledTimes(2);

  await view.unmount();
  expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel as never);
});

test("a healthy socket cannot leave unpublished Task blocker updates stale indefinitely", async () => {
  const onRefresh = jest.fn();
  const view = await render(<Harness rootId="root-1" onRefresh={onRefresh} />);
  await act(async () => {
    channelStatus?.("SUBSCRIBED");
    jest.advanceTimersByTime(30_150);
  });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await view.unmount();
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(onRefresh).toHaveBeenCalledTimes(1);
});
