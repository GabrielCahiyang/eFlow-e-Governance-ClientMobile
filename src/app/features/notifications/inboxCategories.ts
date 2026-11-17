/**
 * Inbox update categories. Filtering is a display choice over the actor's own
 * notifications; it never grants or removes access to a record.
 *
 * Categories are mutually exclusive and resolved in this order:
 * messages → finance → collaboration → work. Types outside every category
 * (for example web-only analytics warnings) appear under "All" only.
 * `notificationCategory` and `applyInboxCategory` must stay in step: the
 * server query decides what a filtered page contains, so paging stays exact.
 */
export const inboxCategories = [
  "all",
  "work",
  "messages",
  "finance",
  "collaboration",
] as const;
export type InboxCategory = (typeof inboxCategories)[number];

export const inboxCategoryLabels: Record<InboxCategory, string> = {
  all: "All types",
  work: "Work",
  messages: "Messages",
  finance: "Finance",
  collaboration: "Collaboration",
};

/** Empty-state noun, e.g. "No unread finance updates". */
export const inboxCategoryNoun: Record<InboxCategory, string> = {
  all: "",
  work: "work",
  messages: "message",
  finance: "finance",
  collaboration: "collaboration",
};

export const workNotificationTypes = [
  "assignment",
  "approval_needed",
  "completed",
  "overdue",
  "reassignment",
  "reminder",
  "status_change",
  "undo",
] as const;

type CategorySource = {
  type?: string | null;
  conversationId?: string | null;
  financialRecordType?: string | null;
};

export function notificationCategory(
  item: CategorySource,
): Exclude<InboxCategory, "all"> | undefined {
  const type = item.type ?? null;
  if (item.conversationId || type === "comment") return "messages";
  if (type?.startsWith("petty_cash_") || item.financialRecordType)
    return "finance";
  if (type?.startsWith("collaboration_")) return "collaboration";
  if (type === null || (workNotificationTypes as readonly string[]).includes(type))
    return "work";
  return undefined;
}

type FilterQuery = {
  is(column: string, value: null): FilterQuery;
  like(column: string, pattern: string): FilterQuery;
  or(filters: string): FilterQuery;
};

/** Narrow a `notifications` query to one category, mirroring `notificationCategory`. */
export function applyInboxCategory<Q>(query: Q, category: InboxCategory): Q {
  const q = query as unknown as FilterQuery;
  switch (category) {
    case "messages":
      q.or("conversation_id.not.is.null,type.eq.comment");
      break;
    case "finance":
      q.is("conversation_id", null).or(
        "type.like.petty_cash_*,and(financial_record_type.not.is.null,or(type.is.null,type.neq.comment))",
      );
      break;
    case "collaboration":
      q.is("conversation_id", null)
        .is("financial_record_type", null)
        .like("type", "collaboration_%");
      break;
    case "work":
      q.is("conversation_id", null)
        .is("financial_record_type", null)
        .or(`type.is.null,type.in.(${workNotificationTypes.join(",")})`);
      break;
  }
  return query;
}

/** Longest search text sent to the server. */
export const inboxSearchMaxLength = 80;

/** Normalise free text so it is safe inside a PostgREST logical filter. */
export function normalizeInboxSearch(text: string) {
  return text
    .replace(/["\\,()*%_:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, inboxSearchMaxLength);
}

/**
 * Case-insensitive match on title, message or task title, applied on the
 * server so paging stays exact. Returns undefined for an empty search.
 */
export function inboxSearchFilter(text: string) {
  const term = normalizeInboxSearch(text);
  if (!term) return undefined;
  const value = `"*${term}*"`;
  return `title.ilike.${value},message.ilike.${value},task_title.ilike.${value}`;
}
