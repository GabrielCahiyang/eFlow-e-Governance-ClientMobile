import { AppState, type AppStateStatus } from "react-native";

export const FOREGROUND_STALE_AFTER_MS = 2 * 60_000;
export const DEGRADED_REALTIME_POLL_MS = 60_000;
export const FALLBACK_POLL_MS = 3 * 60_000;

function isAppForeground(): boolean {
  const state: unknown = AppState.currentState;
  return typeof state !== "string" || state === "active" || state === "unknown";
}

export type RealtimeChannelStatus = string;

export interface SubscribeAppResumeOptions {
  /** Minimum elapsed background time (ms) before triggering resume refresh. */
  staleAfterMs?: number;
  /** Optional callback when app enters `"background"`. */
  onBackground?: () => void;
  /** Optional callback when app returns to `"active"` (`stale` indicates whether `onResume` fired). */
  onActive?: (stale: boolean) => void;
}

/**
 * Subscribe to genuine background-to-foreground resumes after `staleAfterMs`.
 * Transient `"inactive"` transitions (Control Center, notification shade,
 * permission prompts) and short Home switches stay silent.
 */
export function subscribeAppResume(
  onResume: () => void,
  options?: SubscribeAppResumeOptions,
): () => void {
  const staleAfterMs = options?.staleAfterMs ?? FOREGROUND_STALE_AFTER_MS;
  let backgroundedAt: number | undefined =
    AppState.currentState === "background" ? Date.now() : undefined;

  const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "background") {
      backgroundedAt ??= Date.now();
      options?.onBackground?.();
      return;
    }
    if (state === "active") {
      let stale = false;
      if (backgroundedAt !== undefined) {
        const elapsed = Date.now() - backgroundedAt;
        backgroundedAt = undefined;
        stale = elapsed >= staleAfterMs;
        if (stale) onResume();
      }
      options?.onActive?.(stale);
    }
  });

  return () => {
    sub?.remove?.();
  };
}

export interface LiveRefreshOptions {
  /** Callback to execute when a refresh is needed. */
  onRefresh: () => void;
  /** Trailing debounce window (ms) for bursty change events. Defaults to 0. */
  debounceMs?: number;
  /** Minimum elapsed background time (ms) before auto-refreshing on resume. */
  staleAfterMs?: number;
  /**
   * Set true when backed by a Supabase Realtime channel. Periodic polling stays
   * paused while the channel is healthy and runs only while degraded.
   */
  hasRealtime?: boolean;
  /**
   * Override poll cadence (ms) when Realtime is absent or degraded.
   * Pass 0 to disable fallback polling completely.
   */
  pollIntervalMs?: number;
}

export interface LiveRefreshController {
  /** Schedule an active-state refresh (used by postgres_changes or local events). */
  schedule: () => void;
  /** Status handler for `.subscribe(controller.onChannelStatus)`. */
  onChannelStatus: (status: RealtimeChannelStatus) => void;
  /** Dispose timers and AppState listeners. */
  dispose: () => void;
}

/**
 * Coordinates debounced event refreshes, background-duration-gated resume
 * refreshes, and degraded-only fallback polling for mounted live data hooks.
 */
export function createLiveRefreshController(
  options: LiveRefreshOptions,
): LiveRefreshController {
  const {
    onRefresh,
    debounceMs = 0,
    staleAfterMs = FOREGROUND_STALE_AFTER_MS,
    hasRealtime = false,
    pollIntervalMs,
  } = options;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let degraded = false;
  let needsCatchup = false;
  let lastRefreshAt = Date.now();

  const effectivePollMs =
    pollIntervalMs ??
    (hasRealtime ? DEGRADED_REALTIME_POLL_MS : FALLBACK_POLL_MS);

  const shouldPoll = () =>
    !stopped &&
    effectivePollMs > 0 &&
    isAppForeground() &&
    (!hasRealtime || degraded);

  const clearPoll = () => {
    if (!pollTimer) return;
    clearTimeout(pollTimer);
    pollTimer = undefined;
  };

  const armPoll = (delayMs = effectivePollMs) => {
    clearPoll();
    if (!shouldPoll()) return;
    pollTimer = setTimeout(() => {
      pollTimer = undefined;
      if (!shouldPoll()) return;
      schedule();
    }, delayMs);
  };

  const runNow = () => {
    if (stopped || !isAppForeground()) return;
    lastRefreshAt = Date.now();
    armPoll(effectivePollMs);
    onRefresh();
  };

  const schedule = () => {
    if (stopped || !isAppForeground()) return;
    if (debounceMs <= 0) {
      runNow();
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      runNow();
    }, debounceMs);
  };

  const onChannelStatus = (status: RealtimeChannelStatus) => {
    if (stopped) return;
    if (status === "SUBSCRIBED") {
      degraded = false;
      clearPoll();
      if (needsCatchup) {
        needsCatchup = false;
        schedule();
      }
      return;
    }
    if (
      isAppForeground() &&
      (status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED")
    ) {
      degraded = true;
      needsCatchup = true;
      armPoll(effectivePollMs);
    }
  };

  const unsubResume = subscribeAppResume(
    () => {
      if (stopped) return;
      needsCatchup = false;
      schedule();
    },
    {
      staleAfterMs,
      onBackground: clearPoll,
      onActive: (stale) => {
        if (stopped || stale) return;
        if (shouldPoll() && !pollTimer && !timer) {
          const elapsed = Date.now() - lastRefreshAt;
          const minResumeDelay = Math.min(effectivePollMs, 15_000);
          armPoll(Math.max(minResumeDelay, effectivePollMs - elapsed));
        }
      },
    },
  );

  armPoll(effectivePollMs);

  const dispose = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    clearPoll();
    unsubResume();
  };

  return { schedule, onChannelStatus, dispose };
}
