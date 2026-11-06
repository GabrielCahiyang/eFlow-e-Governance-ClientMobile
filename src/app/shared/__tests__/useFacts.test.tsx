import { afterEach, expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useFacts } from "../useFacts";
import {
  clearDisplayCache,
  loadDisplayData,
  readDisplayCache,
  setDisplayCacheActor,
} from "../displayCache";
import { readWithTimeout } from "../readTimeout";
const deferred = <T,>() => {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
afterEach(() => {
  setDisplayCacheActor(null);
  clearDisplayCache();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
const policy = {
  actor: "qa-a",
  select: (data: { title: string; allowed?: boolean }) => ({
    title: data.title,
  }),
};

test("a remounted display read reuses only projected data, revalidates and retains a marked last update on connection failure", async () => {
  setDisplayCacheActor("qa-a");
  const first = await renderHook(() =>
    useFacts<{ title: string; allowed?: boolean }>(
      "qa-a:work",
      async () => ({ title: "Assignment", allowed: true }),
      true,
      policy,
    ),
  );
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  expect(first.result.current.data?.allowed).toBe(true);
  await first.unmount();
  jest.spyOn(Date, "now").mockReturnValue(Date.now() + 31_000);
  const next = deferred<{ title: string; allowed?: boolean }>();
  const second = await renderHook(() =>
    useFacts<{ title: string; allowed?: boolean }>(
      "qa-a:work",
      () => next.promise,
      true,
      policy,
    ),
  );
  expect(second.result.current.data).toEqual({ title: "Assignment" });
  expect(second.result.current.stale).toBe(true);
  expect(second.result.current.loading).toBe(true);
  await act(async () => next.reject(new TypeError("Network request failed")));
  expect(second.result.current.loading).toBe(false);
  expect(second.result.current.stale).toBe(true);
  expect(second.result.current.data).toEqual({ title: "Assignment" });
});

test("a different record never receives an earlier record's delayed response, and disabled reads hide data", async () => {
  const old = deferred<string>(),
    fresh = deferred<string>();
  const view = await renderHook(
    ({ key, enabled }: { key: string; enabled: boolean }) =>
      useFacts(
        key,
        () => (key === "old" ? old.promise : fresh.promise),
        enabled,
      ),
    { initialProps: { key: "old", enabled: true } },
  );
  await view.rerender({ key: "fresh", enabled: true });
  expect(view.result.current.data).toBeUndefined();
  await act(async () => fresh.resolve("current record"));
  await act(async () => old.resolve("wrong record"));
  expect(view.result.current.data).toBe("current record");
  await view.rerender({ key: "fresh", enabled: false });
  expect(view.result.current.data).toBeUndefined();
  expect(view.result.current.loading).toBe(false);
});

test("sign-out clears mounted display data and late responses cannot repopulate a different account's cache", async () => {
  setDisplayCacheActor("qa-a");
  const pending = deferred<{ title: string }>();
  const view = await renderHook(() =>
    useFacts("qa-a:pending", () => pending.promise, true, policy),
  );
  await act(async () => setDisplayCacheActor("qa-b"));
  expect(view.result.current.data).toBeUndefined();
  expect(view.result.current.loading).toBe(false);
  await act(async () => pending.resolve({ title: "old private record" }));
  expect(view.result.current.data).toBeUndefined();
  setDisplayCacheActor("qa-a");
  expect(readDisplayCache("qa-a:pending", policy)).toBeUndefined();
});

test("concurrent display reads share one request, expire within five minutes and are bounded", async () => {
  setDisplayCacheActor("qa-a");
  const pending = deferred<{ title: string }>(),
    load = jest.fn(() => pending.promise);
  const one = loadDisplayData("qa-a:one", load, policy),
    two = loadDisplayData("qa-a:one", load, policy);
  expect(one).toBe(two);
  pending.resolve({ title: "One" });
  await one;
  expect(load).toHaveBeenCalledTimes(1);
  const now = Date.now();
  jest.spyOn(Date, "now").mockReturnValue(now + 300_001);
  expect(readDisplayCache("qa-a:one", policy)).toBeUndefined();
  jest.restoreAllMocks();
  for (let i = 0; i < 25; i++)
    await loadDisplayData(
      "qa-a:" + i,
      async () => ({ title: String(i) }),
      policy,
    );
  expect(readDisplayCache("qa-a:0", policy)).toBeUndefined();
  expect(readDisplayCache("qa-a:24", policy)).toEqual({ title: "24" });
});

test("authoritative reads do not enter the display cache and read timeout never retries", async () => {
  setDisplayCacheActor("qa-a");
  await loadDisplayData("authority", async () => ({ allowed: true }));
  expect(
    readDisplayCache("authority", { actor: "qa-a", select: (data) => data }),
  ).toBeUndefined();
  jest.useFakeTimers();
  const load = jest.fn(() => new Promise<never>(() => {}));
  const assertion = expect(readWithTimeout(load, 25_000)).rejects.toMatchObject(
    { name: "TimeoutError" },
  );
  await jest.advanceTimersByTimeAsync(25_000);
  await assertion;
  expect(load).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

test("access or work-change invalidation cannot be undone by an older in-flight response", async () => {
  setDisplayCacheActor("qa-a");
  const old = deferred<{ title: string }>();
  const before = loadDisplayData("qa-a:work", () => old.promise, policy);
  clearDisplayCache();
  await loadDisplayData(
    "qa-a:work",
    async () => ({ title: "new authorized result" }),
    policy,
  );
  old.resolve({ title: "obsolete result" });
  await before;
  expect(readDisplayCache("qa-a:work", policy)).toEqual({
    title: "new authorized result",
  });
});

test("fresh projected display reads skip a remount request; manual refresh still fetches", async () => {
  setDisplayCacheActor("qa-a");
  await loadDisplayData(
    "qa-a:fresh",
    async () => ({ title: "Cached", allowed: true }),
    policy,
  );
  const load = jest.fn(async () => ({ title: "New", allowed: true }));
  const view = await renderHook(() =>
    useFacts("qa-a:fresh", load, true, policy),
  );
  expect(view.result.current.data).toEqual({ title: "Cached" });
  expect(view.result.current.loading).toBe(false);
  expect(load).not.toHaveBeenCalled();
  await act(async () => view.result.current.refreshIfStale());
  expect(load).not.toHaveBeenCalled();
  await act(async () => view.result.current.refresh());
  expect(load).toHaveBeenCalledTimes(1);
  expect(view.result.current.data?.title).toBe("New");
});

test("work invalidation retains display while refreshing; access invalidation removes it", async () => {
  setDisplayCacheActor("qa-a");
  const next = deferred<{ title: string }>();
  const load = jest
    .fn<() => Promise<{ title: string }>>()
    .mockResolvedValueOnce({ title: "Shown" })
    .mockImplementation(() => next.promise);
  const view = await renderHook(() =>
    useFacts("qa-a:continuity", load, true, policy),
  );
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  await act(async () => clearDisplayCache("data"));
  expect(view.result.current.data?.title).toBe("Shown");
  expect(view.result.current.loading).toBe(true);
  await act(async () => clearDisplayCache("access"));
  expect(view.result.current.data).toBeUndefined();
  await act(async () => next.resolve({ title: "Authorized" }));
});

test("concurrent authoritative reads coalesce without caching the result", async () => {
  const next = deferred<string>(),
    load = jest.fn(() => next.promise);
  const one = loadDisplayData("authority:coalesced", load),
    two = loadDisplayData("authority:coalesced", load);
  expect(one).toBe(two);
  next.resolve("current authority");
  await one;
  expect(load).toHaveBeenCalledTimes(1);
  await loadDisplayData("authority:coalesced", load);
  expect(load).toHaveBeenCalledTimes(2);
});
