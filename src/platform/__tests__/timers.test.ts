import { test, expect } from "@jest/globals";
import { createTimerBridge } from "../timers";
test("adapted timer calls retain their host when invoked as properties of the compatibility adapter", () => {
  const calls: string[] = [];
  const host = {
    setTimeout: function (this: unknown) {
      expect(this).toBe(host);
      calls.push("timeout");
      return 11;
    },
    clearTimeout: function (this: unknown, id: unknown) {
      expect(this).toBe(host);
      expect(id).toBe(11);
      calls.push("clear timeout");
    },
    setInterval: function (this: unknown) {
      expect(this).toBe(host);
      calls.push("interval");
      return 22;
    },
    clearInterval: function (this: unknown, id: unknown) {
      expect(this).toBe(host);
      expect(id).toBe(22);
      calls.push("clear interval");
    },
  };
  const adapter = {
    ...createTimerBridge(
      host as unknown as Parameters<typeof createTimerBridge>[0],
    ),
  };
  const timeout = adapter.setTimeout(() => {}, 20),
    interval = adapter.setInterval(() => {}, 40);
  adapter.clearTimeout(timeout);
  adapter.clearInterval(interval);
  expect(calls).toEqual([
    "timeout",
    "interval",
    "clear timeout",
    "clear interval",
  ]);
});
