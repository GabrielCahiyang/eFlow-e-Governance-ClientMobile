import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { WorkFeedProvider } from "../WorkFeedProvider";

const mockRpc = jest.fn();
const tableListeners: Array<() => void> = [];
const mockChannel = {
  on: jest.fn((_event: string, _filter: unknown, cb: () => void) => {
    tableListeners.push(cb);
    return mockChannel;
  }),
  subscribe: jest.fn(() => mockChannel),
};

jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: "user-1" }, access_token: "tok-1" } },
        error: null,
      })),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    removeChannel: jest.fn(async () => "ok"),
  },
}));

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "user-1" } }),
}));

jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => mockChannel,
}));

const mockLoadWorkFeed = jest.fn(async (_userId: string) => ({
  rows: [],
  issues: [],
  unavailable: [],
  workspaces: [],
}));

jest.mock(
  "../../../../core/web/app/features/personal-work/services/workFeedService",
  () => ({
    loadWorkFeed: (userId: string) => mockLoadWorkFeed(userId),
  }),
);

describe("Mobile work stabilization", () => {
  afterEach(() => {
    jest.useRealTimers();
    mockRpc.mockReset();
    mockLoadWorkFeed.mockClear();
    tableListeners.length = 0;
  });

  test("fetchWorkTree coalesces concurrent requests for the same root", async () => {
    let resolveRpc!: (value: { data: unknown; error: null }) => void;
    mockRpc.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRpc = resolve;
      }),
    );
    const first = fetchWorkTree("root-1");
    const second = fetchWorkTree("root-1");
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    resolveRpc({
      data: {
        revision: 1,
        root: { id: "root-1", kind: "office", project: "p-1", office: "o-1" },
        nodes: [],
        people: [],
        permissions: {},
      },
      error: null,
    });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });

  test("WorkFeedProvider coalesces bursty realtime table events at 900ms and skips when backgrounded", async () => {
    jest.useFakeTimers();
    const originalState = AppState.currentState;
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: "active",
    });
    try {
      await render(
        <WorkFeedProvider>
          <></>
        </WorkFeedProvider>,
      );
      expect(mockLoadWorkFeed).toHaveBeenCalledTimes(1);

      act(() => {
        tableListeners.forEach((cb) => cb());
        jest.advanceTimersByTime(500);
      });
      expect(mockLoadWorkFeed).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(450);
      });
      expect(mockLoadWorkFeed).toHaveBeenCalledTimes(2);

      Object.defineProperty(AppState, "currentState", {
        configurable: true,
        value: "background",
      });
      await act(async () => {
        tableListeners.forEach((cb) => cb());
        jest.advanceTimersByTime(1200);
      });
      expect(mockLoadWorkFeed).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(AppState, "currentState", {
        configurable: true,
        value: originalState,
      });
    }
  });
});
