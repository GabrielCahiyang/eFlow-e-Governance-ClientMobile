import { useEffect, useRef, useState } from "react";
import { authoritativeReadEpoch } from "../../shared/displayCache";
import { readWithTimeout } from "../../shared/readTimeout";
import { useFacts } from "../../shared/useFacts";
import { fetchInboxUpdatePage, type InboxUpdatePage } from "./inboxUpdates";

type History = InboxUpdatePage & {
  head: InboxUpdatePage;
  epoch: number;
  actor: string;
};
const cursorKey = (page?: InboxUpdatePage) => page?.next?.id;

function rebase(
  history: History | undefined,
  head: InboxUpdatePage | undefined,
  epoch: number,
  actor: string,
) {
  if (
    !history ||
    !head?.next ||
    history.epoch !== epoch ||
    history.actor !== actor
  )
    return;
  if (history.head === head) return history;
  // The fresh first page replaces everything through its last row. Keep the
  // loaded suffix only when that boundary is present in the previous window.
  const boundary = history.items.findIndex((item) => item.id === head.next!.id);
  if (boundary < 0 || boundary === history.items.length - 1) return;
  return {
    ...history,
    head,
    items: [...head.items, ...history.items.slice(boundary + 1)],
  };
}

export function useInboxUpdatePages(
  actor: string,
  unread: boolean,
  enabled: boolean,
) {
  const first = useFacts(
    `inbox-update-page:${actor}:${unread}`,
    () => fetchInboxUpdatePage(actor, unread),
    !!actor && enabled,
    { actor, select: (page) => page },
  );
  const epoch = authoritativeReadEpoch();
  const [history, setHistory] = useState<History>();
  const [status, setStatus] = useState<{
    cursor: string;
    loading: boolean;
    error?: Error;
  }>();
  const tail = rebase(history, first.data, epoch, actor);
  const page = tail ?? first.data;
  const current = useRef({ actor, enabled, head: first.data, page });
  current.current = { actor, enabled, head: first.data, page };
  const request = useRef<{
    cursor: string;
    controller: AbortController;
    failed?: boolean;
  }>(undefined);

  useEffect(() => {
    setHistory((previous) => rebase(previous, first.data, epoch, actor));
  }, [first.data, epoch, actor]);

  function discardHistory() {
    request.current?.controller.abort();
    request.current = undefined;
    setHistory(undefined);
    setStatus(undefined);
  }

  useEffect(() => {
    setStatus(undefined);
    return () => {
      request.current?.controller.abort();
      request.current = undefined;
    };
  }, [actor, enabled, epoch, cursorKey(page)]);

  async function loadMore(retry = false) {
    const before = current.current.page?.next;
    if (!current.current.enabled || current.current.actor !== actor || !before)
      return;
    if (
      request.current?.cursor === before.id &&
      !(retry && request.current.failed)
    )
      return;
    const loading = {
      cursor: before.id,
      controller: new AbortController(),
      failed: false,
    };
    request.current = loading;
    setStatus({ cursor: before.id, loading: true });
    const stillCurrent = () =>
      request.current === loading &&
      epoch === authoritativeReadEpoch() &&
      cursorKey(current.current.page) === before.id;
    try {
      const older = await readWithTimeout(() =>
        fetchInboxUpdatePage(actor, unread, before, loading.controller.signal),
      );
      const { head, page: visible } = current.current;
      if (!stillCurrent() || !head || !visible) return;
      const existing = new Set(visible.items.map((item) => item.id));
      setHistory({
        ...older,
        head,
        epoch,
        actor,
        items: [
          ...visible.items,
          ...older.items.filter((item) => !existing.has(item.id)),
        ],
      });
      setStatus(undefined);
    } catch (error) {
      loading.controller.abort();
      if (!stillCurrent()) return;
      loading.failed = true;
      setStatus({
        cursor: before.id,
        loading: false,
        error:
          error instanceof Error
            ? error
            : new Error("Could not load more updates."),
      });
    }
  }

  return {
    ...first,
    items: page?.items ?? [],
    hasMore: !!page?.next,
    loadMore,
    discardHistory,
    loadingMore: status?.cursor === page?.next?.id && !!status?.loading,
    moreError: status?.cursor === page?.next?.id ? status?.error : undefined,
  };
}
