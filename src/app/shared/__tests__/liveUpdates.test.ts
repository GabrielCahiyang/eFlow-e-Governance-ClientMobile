import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { AppState, type AppStateStatus } from "react-native";
import {
  BULK_REFRESH_DEBOUNCE_MS,
  BULK_REFRESH_MAX_WAIT_MS,
  createLiveRefreshController,
  DEGRADED_REALTIME_POLL_MS,
  FALLBACK_POLL_MS,
  FOREGROUND_STALE_AFTER_MS,
  subscribeAppResume,
} from "../liveUpdates";

let appStateListener: ((state: AppStateStatus) => void) | undefined;
let currentState: AppStateStatus = "active";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-14T12:00:00Z"));
  currentState = "active";
  appStateListener = undefined;
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    get: () => currentState,
  });
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function setAppState(next: AppStateStatus) {
  currentState = next;
  appStateListener?.(next);
}

test("subscribeAppResume ignores inactive flickers and brief background trips under threshold", () => {
  const onResume = jest.fn();
  const dispose = subscribeAppResume(onResume);

  setAppState("inactive");
  jest.advanceTimersByTime(10_000);
  setAppState("active");
  expect(onResume).not.toHaveBeenCalled();

  setAppState("background");
  jest.advanceTimersByTime(30_000);
  setAppState("active");
  expect(onResume).not.toHaveBeenCalled();

  setAppState("background");
  jest.advanceTimersByTime(FOREGROUND_STALE_AFTER_MS);
  setAppState("active");
  expect(onResume).toHaveBeenCalledTimes(1);

  dispose();
});

test("realtime controller skips initial subscribe, suppresses healthy idle polling, and catches up on foreground drop recovery", () => {
  const onRefresh = jest.fn();
  const controller = createLiveRefreshController({
    onRefresh,
    debounceMs: 250,
    hasRealtime: true,
  });

  // Initial subscribe must not double-fetch immediately after mount.
  controller.onChannelStatus("SUBSCRIBED");
  jest.advanceTimersByTime(5 * 60_000);
  expect(onRefresh).not.toHaveBeenCalled();

  // Brief background + OS socket close + quick return stays silent.
  setAppState("background");
  controller.onChannelStatus("CLOSED");
  jest.advanceTimersByTime(30_000);
  setAppState("active");
  controller.onChannelStatus("SUBSCRIBED");
  jest.advanceTimersByTime(1_000);
  expect(onRefresh).not.toHaveBeenCalled();

  // Foreground realtime outage activates degraded poll and triggers catchup once recovered.
  controller.onChannelStatus("CHANNEL_ERROR");
  jest.advanceTimersByTime(DEGRADED_REALTIME_POLL_MS + 300);
  expect(onRefresh).toHaveBeenCalledTimes(1);

  controller.onChannelStatus("SUBSCRIBED");
  jest.advanceTimersByTime(300);
  expect(onRefresh).toHaveBeenCalledTimes(2);

  controller.dispose();
});

test("non-realtime controller uses calm polling only while active", () => {
  const onRefresh = jest.fn();
  const controller = createLiveRefreshController({ onRefresh });

  jest.advanceTimersByTime(30_000);
  expect(onRefresh).not.toHaveBeenCalled();

  setAppState("background");
  jest.advanceTimersByTime(FALLBACK_POLL_MS);
  expect(onRefresh).not.toHaveBeenCalled();

  setAppState("active");
  // Returned right at threshold -> triggers resume refresh.
  expect(onRefresh).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(FALLBACK_POLL_MS);
  expect(onRefresh).toHaveBeenCalledTimes(2);

  controller.dispose();
});

test("partial publications keep foreground catch-up polling while subscribed and stop in background", () => {
  const onRefresh = jest.fn();
  const controller = createLiveRefreshController({
    onRefresh, hasRealtime: true, pollWhileSubscribed: true, pollIntervalMs: 30_000,
  });
  controller.onChannelStatus("SUBSCRIBED");
  jest.advanceTimersByTime(30_000);
  expect(onRefresh).toHaveBeenCalledTimes(1);
  setAppState("background");
  jest.advanceTimersByTime(60_000);
  expect(onRefresh).toHaveBeenCalledTimes(1);
  setAppState("active");
  controller.onChannelStatus("SUBSCRIBED");
  jest.advanceTimersByTime(30_000);
  expect(onRefresh).toHaveBeenCalledTimes(2);
  controller.dispose();
  jest.advanceTimersByTime(60_000);
  expect(onRefresh).toHaveBeenCalledTimes(2);
});

test("bulk change bursts coalesce into one refresh and never wait past the max wait", () => {
  const onRefresh = jest.fn();
  const controller = createLiveRefreshController({
    onRefresh,
    debounceMs: BULK_REFRESH_DEBOUNCE_MS,
    maxWaitMs: BULK_REFRESH_MAX_WAIT_MS,
    hasRealtime: true,
    pollIntervalMs: 0,
  });
  controller.onChannelStatus("SUBSCRIBED");

  // 20 system-wide changes within the debounce window cost one reload.
  for (let i = 0; i < 20; i++) {
    controller.schedule();
    jest.advanceTimersByTime(50);
  }
  expect(onRefresh).not.toHaveBeenCalled();
  jest.advanceTimersByTime(BULK_REFRESH_DEBOUNCE_MS);
  expect(onRefresh).toHaveBeenCalledTimes(1);

  // A continuous stream cannot starve the refresh beyond the max wait.
  for (let elapsed = 0; elapsed < BULK_REFRESH_MAX_WAIT_MS; elapsed += 500) {
    controller.schedule();
    jest.advanceTimersByTime(500);
  }
  expect(onRefresh).toHaveBeenCalledTimes(2);

  controller.dispose();
  jest.advanceTimersByTime(BULK_REFRESH_MAX_WAIT_MS);
  expect(onRefresh).toHaveBeenCalledTimes(2);
});

test("changes received while backgrounded refresh once on return, and quiet trips stay silent", () => {
  const onRefresh = jest.fn();
  const controller = createLiveRefreshController({
    onRefresh,
    debounceMs: BULK_REFRESH_DEBOUNCE_MS,
    hasRealtime: true,
    pollIntervalMs: 0,
  });
  controller.onChannelStatus("SUBSCRIBED");

  // No reload work while the app is not visible.
  setAppState("background");
  controller.schedule();
  controller.schedule();
  jest.advanceTimersByTime(BULK_REFRESH_DEBOUNCE_MS * 3);
  expect(onRefresh).not.toHaveBeenCalled();

  // A brief trip still catches up on the missed change exactly once.
  setAppState("active");
  jest.advanceTimersByTime(BULK_REFRESH_DEBOUNCE_MS);
  expect(onRefresh).toHaveBeenCalledTimes(1);

  // A pending trailing refresh that fires in the background is deferred.
  controller.schedule();
  setAppState("background");
  jest.advanceTimersByTime(BULK_REFRESH_DEBOUNCE_MS);
  expect(onRefresh).toHaveBeenCalledTimes(1);
  setAppState("active");
  jest.advanceTimersByTime(BULK_REFRESH_DEBOUNCE_MS);
  expect(onRefresh).toHaveBeenCalledTimes(2);

  // A brief trip with no changes does not reload.
  setAppState("background");
  jest.advanceTimersByTime(10_000);
  setAppState("active");
  jest.advanceTimersByTime(BULK_REFRESH_DEBOUNCE_MS);
  expect(onRefresh).toHaveBeenCalledTimes(2);

  controller.dispose();
});
