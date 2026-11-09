import type { Message } from "./services";
export function mergeMessages(...sets: Message[][]): Message[] {
  return [
    ...new Map(sets.flat().map((message) => [message.id, message])).values(),
  ].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}
export type MessageDraft = { id: string; text: string; imagePath?: string };
export function isMessageDraft(value: unknown): value is MessageDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    /^[0-9a-f-]{36}$/i.test(v.id) &&
    typeof v.text === "string" &&
    (v.imagePath === undefined ||
      (typeof v.imagePath === "string" &&
        /^[\w-]+\/[\w-]+\/[\w-]+\.(jpg|png|gif|webp)$/.test(v.imagePath))) &&
    (!!v.text.trim() || !!v.imagePath) &&
    v.text.length <= 5000
  );
}
