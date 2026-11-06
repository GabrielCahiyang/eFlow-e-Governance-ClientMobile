import { useRef, useState } from "react";
import { useAccountActionAccess } from "./AccountActionAccess";
export function useAction({ requireAccess = true } = {}) {
  const assertAccess = useAccountActionAccess();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error>(),
    [notice, setNotice] = useState("");
  const run = async (
    action: () => Promise<unknown>,
    message = "",
    onDone?: () => void,
  ) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      if (requireAccess) assertAccess();
      await action();
      setNotice(message);
      onDone?.();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error("The operation did not finish."),
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return {
    busy,
    error,
    notice,
    run,
    clear: () => {
      setError(undefined);
      setNotice("");
    },
  };
}
