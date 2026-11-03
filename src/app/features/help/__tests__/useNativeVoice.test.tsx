import { test, expect, jest, beforeEach } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useNativeVoice } from "../voice/useNativeVoice";
import { createVoiceCapture } from "../voice/capture";
import { helpRequest } from "../../../../core/web/app/features/help-assistant/services/helpApi";
import type { CaptureEvents } from "../voice/captureTypes";
jest.mock("../voice/capture", () => ({ createVoiceCapture: jest.fn() }));
jest.mock(
  "../../../../core/web/app/features/help-assistant/services/helpApi",
  () => ({ helpRequest: jest.fn() }),
);
beforeEach(() => {
  jest.mocked(createVoiceCapture).mockReset();
  jest.mocked(helpRequest).mockReset();
});
test("pausing Live preserves a reply in progress and resumes listening only after that reply finishes", async () => {
  let events!: CaptureEvents;
  const capture = {
    start: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    pause: jest.fn(),
    finish: jest.fn(() => {}),
  };
  jest.mocked(createVoiceCapture).mockImplementation((e) => {
    events = e;
    return capture;
  });
  jest
    .mocked(helpRequest)
    .mockResolvedValue({ text: "Why is this project waiting?" });
  let finish!: (value: boolean) => void;
  const sendLive = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    ),
    stopReply = jest.fn(),
    setDraft = jest.fn();
  const { result } = await renderHook(() =>
    useNativeVoice({
      actor: "a",
      project: "p",
      focused: true,
      draft: "",
      setDraft,
      sendLive,
      stopReply,
    }),
  );
  await act(async () => {
    await result.current.start("live");
    events.audio(new Uint8Array([1]), true);
  });
  expect(sendLive).toHaveBeenCalledTimes(1);
  await act(async () => result.current.pause());
  expect(result.current.paused).toBe(true);
  expect(stopReply).not.toHaveBeenCalled();
  await act(async () => result.current.pause());
  expect(capture.pause).toHaveBeenLastCalledWith(true);
  await act(async () => {
    finish(true);
    await Promise.resolve();
  });
  expect(capture.pause).toHaveBeenLastCalledWith(false);
  expect(stopReply).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.stop();
  });
  expect(capture.stop).toHaveBeenCalledTimes(1);
  expect(stopReply).toHaveBeenCalledTimes(1);
});
test("a pending microphone permission cannot start capture after the user ends Live", async () => {
  let begin!: () => void;
  const capture = {
    start: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          begin = resolve;
        }),
    ),
    stop: jest.fn(async () => {}),
    pause: jest.fn(),
    finish: jest.fn(() => {}),
  };
  jest.mocked(createVoiceCapture).mockReturnValue(capture);
  const { result } = await renderHook(() =>
    useNativeVoice({
      actor: "a",
      project: "p",
      focused: true,
      draft: "",
      setDraft: jest.fn(),
      sendLive: jest.fn(async () => true),
      stopReply: jest.fn(),
    }),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.start("live");
  });
  await act(async () => {
    await result.current.stop();
    begin();
    await pending;
  });
  expect(result.current.mode).toBe("off");
  expect(capture.stop).toHaveBeenCalled();
});
test("stopping dictation waits for final audio conversion before closing capture", async () => {
  let events!: CaptureEvents;
  let converted!: () => void;
  const capture = {
    start: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    pause: jest.fn(),
    finish: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          converted = () => {
            events.audio(new Uint8Array([1]), true);
            resolve();
          };
        }),
    ),
  };
  jest.mocked(createVoiceCapture).mockImplementation((e) => {
    events = e;
    return capture;
  });
  jest.mocked(helpRequest).mockResolvedValue({ text: "check the tasks" });
  const setDraft = jest.fn();
  const { result } = await renderHook(() =>
    useNativeVoice({
      actor: "a",
      project: "p",
      focused: true,
      draft: "Please",
      setDraft,
      sendLive: jest.fn(async () => true),
      stopReply: jest.fn(),
    }),
  );
  await act(async () => {
    await result.current.start("dictation");
  });
  let stopping!: Promise<void>;
  await act(async () => {
    stopping = result.current.finishDictation();
  });
  expect(capture.stop).not.toHaveBeenCalled();
  await act(async () => {
    converted();
    await stopping;
  });
  expect(setDraft).toHaveBeenLastCalledWith("Please check the tasks");
  expect(capture.stop).toHaveBeenCalledTimes(1);
});
test("a microphone permission sheet may be inactive during startup, but backgrounding always ends capture", async () => {
  let change!: (state: AppStateStatus) => void, begin!: () => void;
  const listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_name, callback) => {
      change = callback;
      return { remove: jest.fn() };
    });
  const capture = {
    start: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          begin = resolve;
        }),
    ),
    stop: jest.fn(async () => {}),
    pause: jest.fn(),
    finish: jest.fn(() => {}),
  };
  jest.mocked(createVoiceCapture).mockReturnValue(capture);
  const { result } = await renderHook(() =>
    useNativeVoice({
      actor: "a",
      project: "p",
      focused: true,
      draft: "",
      setDraft: jest.fn(),
      sendLive: jest.fn(async () => true),
      stopReply: jest.fn(),
    }),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.start("live");
  });
  await act(async () => {
    change("inactive");
  });
  expect(result.current.mode).toBe("live");
  expect(capture.stop).not.toHaveBeenCalled();
  await act(async () => {
    change("background");
    begin();
    await pending;
  });
  expect(result.current.mode).toBe("off");
  expect(capture.stop).toHaveBeenCalled();
  listener.mockRestore();
});
