import { useState } from "react";

const pageSize = 40;

/** Reveal more rows from an already-authorized and ordered snapshot. */
export function useSnapshotPage(scope: string, total: number) {
  const [page, setPage] = useState({ scope, limit: pageSize });
  if (page.scope !== scope) setPage({ scope, limit: pageSize });
  const limit = page.scope === scope ? page.limit : pageSize;
  return {
    limit,
    onEndReached:
      limit < total
        ? () =>
            setPage((previous) =>
              previous.scope === scope && previous.limit === limit
                ? { scope, limit: Math.min(total, limit + pageSize) }
                : previous,
            )
        : undefined,
  };
}
