import { useEffect, useRef, useState } from "react";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { readWithTimeout } from "../../shared/readTimeout";
import { authoritativeReadEpoch } from "../../shared/displayCache";
import {
  fetchWorkEvents,
  type WorkEvent,
} from "../../../core/web/app/features/nested-work/services/workTreeService";

type Page = Awaited<ReturnType<typeof fetchWorkEvents>>;

export function useWorkActivityPages(
  scope: string,
  rootId: string,
  enabled: boolean,
) {
  const facts = useFacts(
    "work-activity:" + scope,
    () => fetchWorkEvents([rootId]),
    enabled,
  );
  const paging = useAction({ requireAccess: false });
  const [older, setOlder] = useState<{
    scope: string;
    first: Page;
    events: WorkEvent[];
    tail: Page;
  }>();
  const first = facts.error ? undefined : facts.data;
  const appended =
    older?.scope === scope && older.first === first ? older : undefined;
  const tail = appended?.tail ?? first;
  const events = appended
    ? [
        ...new Map(
          [...first!.events, ...appended.events].map((event) => [
            event.id,
            event,
          ]),
        ).values(),
      ]
    : (first?.events ?? []);
  const current = useRef({ scope, first });
  current.current = { scope, first };
  useEffect(() => paging.clear(), [scope, first]);

  const loadOlder = () =>
    paging.run(async () => {
      const last = tail?.events.at(-1);
      if (!first || !last || !tail?.more) return;
      const epoch = authoritativeReadEpoch();
      const result = await readWithTimeout(() =>
        fetchWorkEvents([rootId], { time: last.occurred_at, id: last.id }),
      );
      if (
        current.current.scope !== scope ||
        current.current.first !== first ||
        epoch !== authoritativeReadEpoch()
      )
        return;
      const cursor = result.events.at(-1);
      setOlder({
        scope,
        first,
        events: [...(appended?.events ?? []), ...result.events],
        tail: {
          ...result,
          more: result.more && !!cursor && cursor.id !== last.id,
        },
      });
    });
  return { ...facts, events, more: !!tail?.more, loadOlder, paging };
}
