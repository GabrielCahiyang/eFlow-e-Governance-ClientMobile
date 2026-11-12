import type { Message } from "./services";
import {
  readChatMentions,
  type ChatMention,
} from "../../../core/web/app/features/chat-calls/services/chatMentions";
import { parseMessage } from "../../../core/web/app/features/chat-calls/services/chatMessageCodec";
export function mergeMessages(...sets: Message[][]): Message[] {
  const rows = new Map<string, Message>();
  for (const messages of sets)
    for (const message of messages) {
      // A delayed page or Realtime event must not restore deleted content.
      if (!rows.get(message.id)?.deleted_at || message.deleted_at)
        rows.set(message.id, message);
    }
  return [...rows.values()].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}
export function encodeChatDraft(draft: string, mentions?: ChatMention[]) {
  const text = draft.trim();
  const offset = draft.length - draft.trimStart().length;
  const tagged = readChatMentions(
    mentions?.map((mention) => ({ ...mention, start: mention.start - offset })),
    text,
  );
  return tagged.length ? JSON.stringify({ text, mentions: tagged }) : text;
}

export function messagePreview(message: Message, actor: string) {
  if (message.deleted_at)
    return message.sender_id === actor
      ? "You deleted a message"
      : "This message was deleted";
  return parseMessage(message.content).text || "Image attachment";
}

export type MessageDraft = {
  id: string;
  text: string;
  imagePath?: string;
  mentions?: ChatMention[];
};
export function isMessageDraft(value: unknown): value is MessageDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    /^[0-9a-f-]{36}$/i.test(v.id) &&
    typeof v.text === "string" &&
    (v.mentions === undefined ||
      (Array.isArray(v.mentions) &&
        readChatMentions(v.mentions, v.text).length === v.mentions.length)) &&
    (v.imagePath === undefined ||
      (typeof v.imagePath === "string" &&
        /^[\w-]+\/[\w-]+\/[\w-]+\.(jpg|png|gif|webp)$/.test(v.imagePath))) &&
    (!!v.text.trim() || !!v.imagePath) &&
    v.text.length <= 5000
  );
}
