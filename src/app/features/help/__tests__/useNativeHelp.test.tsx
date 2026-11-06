import { test, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useNativeHelp } from "../useNativeHelp";
import { askNativeHelp } from "../services";
import { playNativeReply } from "../speechPlayback";
import type { HelpReply } from "../../../../core/web/app/features/help-assistant/types";
jest.mock("../services", () => ({ askNativeHelp: jest.fn() }));
jest.mock("../speechPlayback", () => ({ playNativeReply: jest.fn() }));
const reply: HelpReply = {
  answer: "Use the Budget tab.",
  replyId: "reply",
  sources: [],
  notice: "Verify details.",
  model: "configured-model",
  grounded: true,
  observedAt: 1,
  knowledgeVersion: "test",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(askNativeHelp).mockReset();
  jest.mocked(playNativeReply).mockReset();
  jest
    .spyOn(AppState, "addEventListener")
    .mockReturnValue({ remove: jest.fn() });
});
test("repeated send taps share one active request and retain only its confirmed answer", async () => {
  let finish!: (reply: HelpReply) => void;
  jest.mocked(askNativeHelp).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = await renderHook(() => useNativeHelp("actor", "project"));
  let pending!: Promise<boolean>;
  await act(async () => {
    pending = result.current.send("How do I finish?");
    await result.current.send("Duplicate");
  });
  expect(askNativeHelp).toHaveBeenCalledTimes(1);
  expect(result.current.messages).toHaveLength(1);
  await act(async () => {
    finish(reply);
    await pending;
  });
  expect(result.current.messages.map((m) => m.role)).toEqual([
    "user",
    "assistant",
  ]);
  expect(result.current.stage).toBe("idle");
});
test("changing the project aborts the old request and ignores a late response", async () => {
  let finish!: (reply: HelpReply) => void;
  let oldSignal!: AbortSignal;
  jest.mocked(askNativeHelp).mockImplementation((_q, _p, _h, signal) => {
    oldSignal = signal;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const { result, rerender } = await renderHook(
    ({ project }: { project: string }) => useNativeHelp("actor", project),
    { initialProps: { project: "first" } },
  );
  let pending!: Promise<boolean>;
  await act(async () => {
    pending = result.current.send("Private first project question");
  });
  await rerender({ project: "second" });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => {
    finish(reply);
    await pending;
  });
  expect(result.current.messages).toEqual([]);
  jest.mocked(askNativeHelp).mockResolvedValue(reply);
  await act(async () => {
    await result.current.send("Second project question");
  });
  expect(jest.mocked(askNativeHelp).mock.calls.at(-1)?.slice(0, 3)).toEqual([
    "Second project question",
    "second",
    [],
  ]);
});
test("leaving Help stops speech and does not let the old stage overwrite the new screen", async () => {
  let finish!: () => void;
  let speechSignal!: AbortSignal;
  jest
    .mocked(playNativeReply)
    .mockImplementation(async (_reply, signal, stage) => {
      speechSignal = signal;
      stage("speaking");
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
  const { result, rerender } = await renderHook(
    ({ focused }: { focused: boolean }) => useNativeHelp("actor", "", focused),
    { initialProps: { focused: true } },
  );
  let playing!: Promise<void>;
  await act(async () => {
    playing = result.current.speak(reply);
  });
  expect(result.current.stage).toBe("speaking");
  await rerender({ focused: false });
  expect(speechSignal.aborted).toBe(true);
  await act(async () => {
    finish();
    await playing;
  });
  expect(result.current.stage).toBe("idle");
});
test("a failed answer keeps the user question and shows a safe recovery message", async () => {
  jest
    .mocked(askNativeHelp)
    .mockRejectedValue(new Error("Help service unavailable"));
  const { result } = await renderHook(() => useNativeHelp("actor", ""));
  await act(async () => {
    await result.current.send("How do approvals work?");
  });
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.error).toBe("We couldn't load this information. Please try again.");
  expect(result.current.busy).toBe(false);
});
test("Live selects the Live model path and keeps the microphone audio session through synthesis", async () => {
  jest.mocked(askNativeHelp).mockResolvedValue(reply);
  jest.mocked(playNativeReply).mockResolvedValue(undefined);
  const { result } = await renderHook(() => useNativeHelp("actor", "project"));
  await act(async () => {
    await result.current.send("How do I review this?", {
      mode: "live",
      speak: true,
    });
  });
  expect(jest.mocked(askNativeHelp).mock.calls[0][4]).toBe("live");
  expect(jest.mocked(playNativeReply).mock.calls[0][3]).toEqual({
    keepMicrophoneSession: true,
  });
  expect(result.current.messages).toHaveLength(2);
});
