import { test, expect, jest, beforeEach } from "@jest/globals";
import { TranscriptionQueue } from "../voice/TranscriptionQueue";
import { helpRequest } from "../../../../core/web/app/features/help-assistant/services/helpApi";
jest.mock(
  "../../../../core/web/app/features/help-assistant/services/helpApi",
  () => ({ helpRequest: jest.fn() }),
);
beforeEach(() => {
  jest.mocked(helpRequest).mockReset();
});
const events = () => ({
  text: jest.fn(),
  final: jest.fn(),
  error: jest.fn(),
  busy: jest.fn(),
});
test("a final supersedes a preview and late preview text is ignored", async () => {
  const calls: {
    signal: AbortSignal;
    resolve: (v: { text: string }) => void;
  }[] = [];
  jest.mocked(helpRequest).mockImplementation(
    (_operation, signal) =>
      new Promise((resolve) =>
        calls.push({
          signal,
          resolve: resolve as (v: { text: string }) => void,
        }),
      ),
  );
  const e = events(),
    queue = new TranscriptionQueue(e, false);
  queue.push(new Uint8Array([1]), false);
  queue.push(new Uint8Array([2]), false);
  queue.push(new Uint8Array([3]), true);
  expect(calls[0].signal.aborted).toBe(true);
  calls[0].resolve({ text: "stale preview" });
  await Promise.resolve();
  await Promise.resolve();
  expect(calls).toHaveLength(2);
  calls[1].resolve({ text: "Open project table" });
  await queue.finish();
  expect(e.text).toHaveBeenCalledTimes(1);
  expect(e.final).toHaveBeenCalledWith("Open project table");
  expect(e.error).not.toHaveBeenCalled();
});
test("accepted final turns stay serial and dictation accumulates instead of replacing earlier speech", async () => {
  const calls: {
    signal: AbortSignal;
    resolve: (v: { text: string }) => void;
  }[] = [];
  jest.mocked(helpRequest).mockImplementation(
    (_operation, signal) =>
      new Promise((resolve) =>
        calls.push({
          signal,
          resolve: resolve as (v: { text: string }) => void,
        }),
      ),
  );
  const e = events(),
    queue = new TranscriptionQueue(e, true);
  queue.push(new Uint8Array([1]), true);
  queue.push(new Uint8Array([2]), true);
  expect(calls).toHaveLength(1);
  expect(calls[0].signal.aborted).toBe(false);
  calls[0].resolve({ text: "Open the project" });
  await Promise.resolve();
  await Promise.resolve();
  expect(calls).toHaveLength(2);
  calls[1].resolve({ text: "and check its tasks" });
  await queue.finish();
  expect(e.text).toHaveBeenLastCalledWith(
    "Open the project and check its tasks",
  );
  expect(e.final).toHaveBeenCalledTimes(2);
});
test("cancelling a scope ignores a response even when the transport completes after abort", async () => {
  let finish!: (v: { text: string }) => void;
  let signal!: AbortSignal;
  jest.mocked(helpRequest).mockImplementation((_operation, s) => {
    signal = s;
    return new Promise((resolve) => {
      finish = resolve as typeof finish;
    });
  });
  const e = events(),
    queue = new TranscriptionQueue(e, false);
  queue.push(new Uint8Array([1]), true);
  queue.cancel();
  finish({ text: "old private project" });
  await Promise.resolve();
  await Promise.resolve();
  expect(signal.aborted).toBe(true);
  expect(e.text).not.toHaveBeenCalled();
  expect(e.final).not.toHaveBeenCalled();
});
test("the final silence boundary reuses an identical preview transcript without a second ASR request", async () => {
  jest
    .mocked(helpRequest)
    .mockResolvedValue({ text: "Check the Office Budget" });
  const e = events(),
    queue = new TranscriptionQueue(e, false),
    audio = new Uint8Array([1, 2]);
  queue.push(audio, false);
  await queue.finish();
  queue.push(audio, true);
  await queue.finish();
  expect(helpRequest).toHaveBeenCalledTimes(1);
  expect(e.final).toHaveBeenCalledWith("Check the Office Budget");
});
