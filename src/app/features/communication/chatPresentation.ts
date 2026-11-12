import { parseMessage } from "../../../core/web/app/features/chat-calls/services/chatMessageCodec";
import type { Channel, Message } from "./services";

export type ConversationFilter =
  "all" | "people" | "groups" | "office" | "archive";
export const conversationFilters: {
  value: ConversationFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "people", label: "People" },
  { value: "groups", label: "Groups" },
  { value: "office", label: "Office" },
  { value: "archive", label: "Archived" },
];

export const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const GROUP_GAP_MS = 5 * 60 * 1000;
const SEPARATOR_GAP_MS = 60 * 60 * 1000;

export function initials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function conversationGroup(
  kind: string,
): Exclude<ConversationFilter, "all" | "archive"> {
  return kind === "direct" ? "people" : kind === "org" ? "office" : "groups";
}

export function filterConversations(
  channels: Channel[],
  filter: ConversationFilter,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return channels.filter(
    (item) =>
      (filter === "archive"
        ? item.archived
        : !item.archived &&
          (filter === "all" || conversationGroup(item.kind) === filter)) &&
      (!needle ||
        [
          item.name,
          item.defaultName,
          item.projectTitle,
          item.lastMessage && parseMessage(item.lastMessage).text,
        ].some((value) => value?.toLowerCase().includes(needle))),
  );
}

export function pinnedConversation(item: Channel) {
  return !item.archived && (item.kind === "project" || !!item.personalPin);
}

export function conversationKindLabel(kind: string) {
  return kind === "direct"
    ? "Direct message"
    : kind === "org"
      ? "Office"
      : kind === "project"
        ? "Project"
        : "Task";
}

export function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
    : "";
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Messenger-style stamp: time today, "Yesterday", weekday this week, else date. */
export function separatorLabel(value: string, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const time = timeLabel(value);
  if (sameDay(date, now)) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `Yesterday ${time}`;
  const days = (now.getTime() - date.getTime()) / 86_400_000;
  if (days < 7)
    return `${date.toLocaleDateString("en-PH", { weekday: "short" })} ${time}`;
  return `${date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })}, ${time}`;
}

/** Short stamp for list rows. */
export function listStamp(value?: string | null, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  if (sameDay(date, now)) return timeLabel(value);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export type ThreadItem = {
  message: Message;
  mine: boolean;
  /** Stamp rendered above this message when a new day or long pause starts. */
  separator?: string;
  /** First bubble in a run from one sender (shows name, rounds top). */
  first: boolean;
  /** Last bubble in a run (shows avatar, rounds bottom). */
  last: boolean;
};

/** Pure grouping for chronological messages; contents are never altered. */
export function buildThreadItems(
  messages: Message[],
  actor: string,
  now = new Date(),
): ThreadItem[] {
  const items: ThreadItem[] = messages.map((message, index) => {
    const previous = messages[index - 1];
    const at = Date.parse(message.created_at);
    const before = previous ? Date.parse(previous.created_at) : NaN;
    const day = !previous || !sameDay(new Date(at), new Date(before));
    const pause = !previous || at - before > SEPARATOR_GAP_MS;
    const broken =
      !previous ||
      day ||
      pause ||
      !!previous.deleted_at ||
      !!message.deleted_at ||
      !!previous.activity_kind ||
      !!message.activity_kind ||
      previous.sender_id !== message.sender_id ||
      at - before > GROUP_GAP_MS;
    return {
      message,
      mine: message.sender_id === actor,
      separator:
        day || pause ? separatorLabel(message.created_at, now) : undefined,
      first: broken,
      last: true,
    };
  });
  for (let i = 0; i < items.length - 1; i++)
    if (!items[i + 1].first) items[i].last = false;
  return items;
}

export function reactionSummary(message: Message, actor: string) {
  return Object.entries(message.reaction_users || {})
    .map(([emoji, users]) => ({
      emoji,
      count: Object.keys(users || {}).length,
      mine: !!users && actor in users,
    }))
    .filter((item) => item.count > 0);
}
