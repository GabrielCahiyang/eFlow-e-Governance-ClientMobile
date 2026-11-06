import { useCallback, useEffect, useRef, useState } from "react";

/** Native refresh feedback belongs to a user's pull, not polling or Realtime. */
export function usePullRefresh(load?: () => Promise<unknown>) {
  const loader = useRef(load),
    pending = useRef(false),
    mounted = useRef(true);
  loader.current = load;
  const [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState<Error>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!loader.current || pending.current) return;
    pending.current = true;
    setRefreshing(true);
    setError(undefined);
    try {
      await loader.current();
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason
            : new Error("Could not refresh this page."),
        );
    } finally {
      pending.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, []);
  return { refreshing, refresh, error };
}
