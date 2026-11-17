import { supabase } from "../../../platform/supabase";
import { inboxCategories, notificationCategory } from "./inboxCategories";
import type { InboxCounts } from "./inboxCountsContext";
export type { InboxCounts } from "./inboxCountsContext";

/** Counts above this show as "99+"; we never read more unread rows. */
export const inboxCountCap = 100;

/**
 * Unread updates per category in ONE small request: at most 100 unread rows,
 * three short columns, no message text. The tab badge and the Inbox chips
 * share this result, so the Inbox adds no extra count requests.
 */
export async function fetchInboxUnreadCounts(actor: string): Promise<InboxCounts> {
  const { data, error } = await supabase
    .from("notifications")
    .select("type,conversation_id,financial_record_type")
    .eq("user_id", actor)
    .eq("read", false)
    .limit(inboxCountCap);
  if (error) throw new Error(error.message);
  const counts = Object.fromEntries(
    inboxCategories.map((category) => [category, 0]),
  ) as InboxCounts;
  for (const row of data ?? []) {
    counts.all++;
    const category = notificationCategory({
      type: row.type as string | null,
      conversationId: row.conversation_id as string | null,
      financialRecordType: row.financial_record_type as string | null,
    });
    if (category) counts[category]++;
  }
  return counts;
}

export {
  InboxCountsContext,
  useInboxCounts,
  type InboxCountsState,
} from "./inboxCountsContext";
