import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { askNativeHelp } from "./services";
import { playNativeReply } from "./speechPlayback";
import type {
  HelpMessage,
  HelpReply,
  ConversationStage,
} from "../../../core/web/app/features/help-assistant/types";
export function useNativeHelp(
  actorId: string,
  projectId: string,
  focused = true,
) {
  const [messages, setMessages] = useState<HelpMessage[]>([]),
    [stage, setStage] = useState<ConversationStage>("idle"),
    [error, setError] = useState("");
  const runtime = useRef({
    epoch: 0,
    request: null as AbortController | null,
    history: [] as string[],
    active: true,
  });
  const stop = useCallback(() => {
    runtime.current.epoch++;
    runtime.current.request?.abort();
    runtime.current.request = null;
    setStage("idle");
  }, []);
  useEffect(() => {
    stop();
    setMessages([]);
    setError("");
    runtime.current.history = [];
    runtime.current.active = true;
    return () => {
      runtime.current.active = false;
      runtime.current.epoch++;
      runtime.current.request?.abort();
    };
  }, [actorId, projectId, stop]);
  useEffect(() => {
    if (!focused) stop();
    const app = AppState.addEventListener("change", (value) => {
      if (value !== "active") stop();
    });
    return () => app.remove();
  }, [focused, stop]);
  const send = async (
    question: string,
    options?: { mode?: "chat" | "live"; speak?: boolean },
  ) => {
    const state = runtime.current;
    if (!actorId || state.request || !question.trim() || !focused) return false;
    const text = question.trim();
    if (text.length > 2000) {
      setError("Ask a question using up to 2,000 characters.");
      return false;
    }
    const controller = new AbortController(),
      epoch = ++state.epoch;
    state.request = controller;
    setError("");
    setStage("thinking");
    setMessages((old) => [
      ...old,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    try {
      const reply = await askNativeHelp(
        text,
        projectId,
        state.history,
        controller.signal,
        options?.mode || "chat",
      );
      if (controller.signal.aborted || epoch !== state.epoch || !state.active)
        return false;
      state.history = [...state.history, text].slice(-3);
      setMessages((old) => [
        ...old,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply.answer,
          reply,
        },
      ]);
      if (options?.speak) {
        await playNativeReply(
          reply,
          controller.signal,
          (value) => {
            if (state.active && state.epoch === epoch) setStage(value);
          },
          { keepMicrophoneSession: options.mode === "live" },
        );
      }
      return true;
    } catch (reason) {
      if (!controller.signal.aborted && epoch === state.epoch)
        setError(
          reason instanceof Error
            ? reason.message
            : "eFlow Help could not finish.",
        );
      return false;
    } finally {
      if (epoch === state.epoch) {
        state.request = null;
        setStage("idle");
      }
    }
  };
  const speak = async (reply: HelpReply) => {
    const state = runtime.current;
    if (state.request || !focused) return;
    const controller = new AbortController(),
      epoch = ++state.epoch;
    state.request = controller;
    setError("");
    try {
      await playNativeReply(reply, controller.signal, (value) => {
        if (state.active && state.epoch === epoch) setStage(value);
      });
    } catch (reason) {
      if (!controller.signal.aborted && state.epoch === epoch)
        setError(
          reason instanceof Error
            ? reason.message
            : "The spoken answer is unavailable.",
        );
    } finally {
      if (state.epoch === epoch) {
        state.request = null;
        setStage("idle");
      }
    }
  };
  return { messages, stage, error, send, speak, stop, busy: stage !== "idle" };
}
