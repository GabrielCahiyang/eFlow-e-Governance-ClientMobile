import { useCallback, useEffect, useRef, useState } from "react";
export function useFacts<T>(
  key: string,
  load: () => Promise<T>,
  enabled = true,
) {
  const loader = useRef(load);
  loader.current = load;
  const sequence = useRef(0);
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error?: Error;
    loading: boolean;
  }>({ key, loading: enabled });
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const generation = ++sequence.current;
    setState((old) => ({
      key,
      data: old.key === key ? old.data : undefined,
      loading: true,
    }));
    try {
      const data = await loader.current();
      if (generation === sequence.current)
        setState({ key, data, loading: false });
    } catch (e) {
      if (generation === sequence.current)
        setState((old) => ({
          key,
          data: old.key === key ? old.data : undefined,
          loading: false,
          error:
            e instanceof Error ? e : new Error("Could not load this view."),
        }));
    }
  }, [key, enabled]);
  useEffect(() => {
    setState({ key, loading: enabled });
    void refresh();
    return () => {
      ++sequence.current;
    };
  }, [refresh, key, enabled]);
  return {
    ...(state.key === key ? state : { key, loading: enabled }),
    refresh,
  };
}
