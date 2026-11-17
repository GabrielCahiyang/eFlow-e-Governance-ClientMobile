import { createContext, useContext } from "react";
import type { InboxCategory } from "./inboxCategories";

// Kept free of network code so navigation can provide it without loading
// the data client.
export type InboxCounts = Record<InboxCategory, number>;

export type InboxCountsState = {
  data?: InboxCounts;
  refresh: () => Promise<void>;
  refreshIfStale: () => Promise<void>;
};

const noop = async () => {};
export const InboxCountsContext = createContext<InboxCountsState>({
  refresh: noop,
  refreshIfStale: noop,
});

/** Shared unread counts provided by the signed-in navigator. */
export function useInboxCounts(): InboxCountsState {
  return useContext(InboxCountsContext);
}
