import {
  askHelp,
  loadHelpProjects,
  helpRequest,
} from "../../../core/web/app/features/help-assistant/services/helpApi";
import type { HelpReply } from "../../../core/web/app/features/help-assistant/types";
export { loadHelpProjects };
export async function askNativeHelp(
  question: string,
  projectId: string,
  history: string[],
  signal: AbortSignal,
  mode: "chat" | "live" = "chat",
) {
  const reply = await askHelp(question, projectId, history, signal, mode);
  if (
    !reply ||
    typeof reply.answer !== "string" ||
    !reply.answer.trim() ||
    typeof reply.replyId !== "string" ||
    !Array.isArray(reply.sources) ||
    reply.sources.some(
      (s) =>
        !s ||
        !["guide", "project", "task"].includes(s.kind) ||
        typeof s.title !== "string" ||
        typeof s.text !== "string",
    )
  )
    throw new Error(
      "The help service returned an incomplete answer. Please try again.",
    );
  return reply;
}
export async function fetchNativeSpeech(
  reply: HelpReply,
  part: number,
  signal: AbortSignal,
) {
  const result = await helpRequest<{
    audio: string;
    mimeType: string;
    parts?: number;
  }>("speech", signal, { replyId: reply.replyId, part });
  if (
    typeof result.audio !== "string" ||
    !result.audio ||
    result.audio.length > 12_000_000 ||
    result.mimeType !== "audio/wav" ||
    !Number.isSafeInteger(result.parts ?? 1) ||
    (result.parts ?? 1) < 1 ||
    (result.parts ?? 1) > 4
  )
    throw new Error(
      "The spoken answer could not be read. The written answer is still available.",
    );
  return { audio: result.audio, parts: result.parts || 1 };
}
