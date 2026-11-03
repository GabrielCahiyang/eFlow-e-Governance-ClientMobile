import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  EMPTY_MICROPHONE,
  type MicrophoneSignal,
} from "../../../../core/web/app/features/help-assistant/types";
import { createVoiceCapture } from "./capture";
import type { VoiceCapture } from "./captureTypes";
import { TranscriptionQueue } from "./TranscriptionQueue";
type Mode = "off" | "dictation" | "live";
type Options = {
  actor: string;
  project: string;
  focused: boolean;
  draft: string;
  setDraft: (text: string) => void;
  sendLive: (text: string) => Promise<boolean>;
  stopReply: () => void;
};
export function useNativeVoice(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [mode, setMode] = useState<Mode>("off"),
    [paused, setPaused] = useState(false),
    [signal, setSignal] = useState<MicrophoneSignal>(EMPTY_MICROPHONE),
    [transcribing, setTranscribing] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState("");
  const state = useRef({
    epoch: 0,
    mode: "off" as Mode,
    paused: false,
    turnBusy: false,
    turnVersion: 0,
    starting: false,
    capture: undefined as VoiceCapture | undefined,
    queue: undefined as TranscriptionQueue | undefined,
  });
  const stop = useCallback(async (stopReply = true) => {
    const s = state.current;
    const wasLive = s.mode === "live";
    s.epoch++;
    s.mode = "off";
    s.paused = false;
    s.turnBusy = false;
    s.starting = false;
    const capture = s.capture;
    s.capture = undefined;
    s.queue?.cancel();
    s.queue = undefined;
    setMode("off");
    setPaused(false);
    setSignal(EMPTY_MICROPHONE);
    setTranscribing(false);
    setStarting(false);
    if (stopReply && wasLive) latest.current.stopReply();
    try {
      await capture?.stop();
    } catch {
      /* Native lifecycle cleanup remains foreground-only. */
    }
  }, []);
  const start = async (next: Exclude<Mode, "off">) => {
    const s = state.current;
    if (
      s.starting ||
      s.mode !== "off" ||
      !latest.current.actor ||
      !latest.current.focused
    )
      return;
    s.starting = true;
    setStarting(true);
    setError("");
    const epoch = ++s.epoch,
      base = next === "dictation" ? latest.current.draft.trim() : "";
    s.mode = next;
    s.paused = false;
    s.turnBusy = false;
    setMode(next);
    setPaused(false);
    const valid = () =>
      state.current.epoch === epoch &&
      state.current.mode === next &&
      latest.current.focused;
    const fail = (message: string) => {
      if (!valid()) return;
      setError(message);
      s.paused = true;
      setPaused(true);
      s.capture?.pause(true);
    };
    const queue = new TranscriptionQueue(
      {
        text: (text) => {
          if (valid())
            latest.current.setDraft(
              [base, text].filter(Boolean).join(" ").slice(0, 2000),
            );
        },
        busy: (value) => {
          if (valid()) setTranscribing(value);
        },
        error: (message, final) => {
          if (valid()) {
            setError(message);
            if (final) {
              s.turnBusy = false;
              fail(message);
            }
          }
        },
        final: (text) => {
          if (!valid() || next !== "live") return;
          if (!text) {
            s.turnBusy = false;
            s.capture?.pause(s.paused);
            return;
          }
          const turn = ++s.turnVersion;
          const validTurn = () => valid() && s.turnVersion === turn;
          void (async () => {
            try {
              const okay = await latest.current.sendLive(text);
              if (!validTurn()) return;
              if (okay) latest.current.setDraft("");
              else {
                fail(
                  "The answer did not finish. Your question is kept. Resume when ready.",
                );
              }
            } catch (cause) {
              if (validTurn())
                fail(
                  cause instanceof Error
                    ? cause.message
                    : "The spoken answer did not finish.",
                );
            } finally {
              if (validTurn()) {
                s.turnBusy = false;
                s.capture?.pause(s.paused);
              }
            }
          })();
        },
      },
      next === "dictation",
    );
    s.queue = queue;
    try {
      const capture = createVoiceCapture({
        holdAfterTurn: next === "live",
        audio: (audio, final) => {
          if (!valid()) return;
          if (final && next === "live") s.turnBusy = true;
          queue.push(audio, final);
        },
        signal: (value) => {
          if (valid()) setSignal(value);
        },
        ended: (message) => {
          if (valid()) {
            setError(message);
            void stop();
          }
        },
      });
      s.capture = capture;
      await capture.start();
      if (!valid()) {
        await capture.stop();
        return;
      }
    } catch (cause) {
      if (valid()) {
        const message =
          cause instanceof Error
            ? cause.message
            : "The microphone could not start.";
        await stop();
        setError(message);
      }
    } finally {
      if (s.epoch === epoch) {
        s.starting = false;
        setStarting(false);
      }
    }
  };
  const pause = () => {
    const s = state.current;
    if (s.mode === "off") return;
    s.paused = !s.paused;
    setPaused(s.paused);
    s.capture?.pause(s.paused || s.turnBusy);
  };
  const interrupt = () => {
    const s = state.current;
    if (s.mode !== "live") return;
    s.turnVersion++;
    s.turnBusy = false;
    latest.current.stopReply();
    latest.current.setDraft("");
    s.capture?.pause(s.paused);
  };
  const finishDictation = async () => {
    const s = state.current;
    if (s.mode !== "dictation") return;
    const finished = s.capture?.finish();
    s.capture?.pause(true);
    await finished;
    await s.queue?.finish();
    if (s.mode === "dictation") await stop(false);
  };
  useEffect(() => {
    void stop();
    return () => {
      void stop();
    };
  }, [options.actor, options.project, options.focused, stop]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (value) => {
      // iOS permission sheets temporarily make the app inactive. Ending an
      // in-flight start there would discard the permission the user just granted.
      if (
        value === "background" ||
        (value === "inactive" && !state.current.starting)
      )
        void stop();
    });
    return () => subscription.remove();
  }, [stop]);
  return {
    mode,
    paused,
    signal,
    transcribing,
    starting,
    error,
    start,
    pause,
    interrupt,
    stop,
    finishDictation,
  };
}
