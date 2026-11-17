import { supabase } from "../../../platform/supabase";
import {
  rowToNotif,
  type Notification,
} from "../../../core/web/app/services/notificationService";
import {
  applyInboxCategory,
  inboxSearchFilter,
  type InboxCategory,
} from "./inboxCategories";

export type InboxFilters = {
  category?: InboxCategory;
  search?: string;
  /** Only updates already read. Ignored when `unread` is requested. */
  readOnly?: boolean;
};

export type InboxNotification = Notification & {
  conversationId?: string;
  conversationMessageId?: string;
};

export function readInboxNotification(
  row: Record<string, unknown>,
): InboxNotification {
  return {
    ...rowToNotif(row),
    ...(typeof row.conversation_id === "string" && {
      conversationId: row.conversation_id,
    }),
    ...(typeof row.conversation_message_id === "string" && {
      conversationMessageId: row.conversation_message_id,
    }),
  };
}

type Cursor = { createdAt: string; id: string };
export type InboxUpdatePage = { items: InboxNotification[]; next?: Cursor };
// Small first page; older updates load only when the user taps "View more".
export const inboxPageSize = 20;
const pageSize = inboxPageSize;

export async function fetchInboxUpdatePage(
  actor: string,
  unread: boolean,
  before?: Cursor,
  signal?: AbortSignal,
  filters: InboxFilters = {},
): Promise<InboxUpdatePage> {
  if (!actor) return { items: [] };
  const query = supabase.from("notifications").select("*").eq("user_id", actor);
  if (unread) query.eq("read", false);
  else if (filters.readOnly) query.eq("read", true);
  // Filter on the server so each 50-row page is complete for the view.
  applyInboxCategory(query, filters.category ?? "all");
  const search = inboxSearchFilter(filters.search ?? "");
  if (search) query.or(search);
  if (signal) query.abortSignal(signal);
  if (before) {
    query.or(
      `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
    );
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);
  if (error) throw error;
  const rows = data.slice(0, pageSize);
  const items = rows.map(readInboxNotification);
  if (data.length <= pageSize) return { items };
  const { created_at: createdAt, id } = rows[pageSize - 1];
  // Keep the original timestamp precision and validate both values before
  // inserting them into a PostgREST logical filter on the next request.
  if (
    typeof createdAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(
      createdAt,
    ) ||
    typeof id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
  )
    throw new Error("Could not continue loading updates.");
  return { items, next: { createdAt, id } };
}

/**
 * Mark every unread update of the actor read. Same recipient-scoped write as
 * eFlow Web, but the result is confirmed: a failed or unverified write is
 * reported instead of being shown as success.
 */
export async function markAllInboxUpdatesRead(actor: string): Promise<number> {
  if (!actor) throw new Error("A signed-in recipient is required.");
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", actor)
    .eq("read", false)
    .select("id");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data))
    throw new Error("Could not confirm that your updates were marked read.");
  return data.length;
}
