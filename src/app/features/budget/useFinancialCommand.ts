import { useRef, useState } from "react";
import { draftStore } from "../../../platform/draftStore";
import {
  executeFinancialCommand,
  FinancialCancelled,
  type FinancialReceipt,
} from "./financialReceipt";
import * as Crypto from "expo-crypto";
const activeScopes = new Set<string>();
export function useFinancialCommand(actorId: string, scope: string) {
  const pending = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error>(),
    [notice, setNotice] = useState("");
  const run = async (
    key: string,
    command: () => Promise<unknown>,
    refresh?: () => Promise<void>,
    success = "Financial action recorded.",
  ) => {
    const activeScope=actorId+':'+scope;
    if (pending.current||activeScopes.has(activeScope)) return false;
    activeScopes.add(activeScope);
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    let saved = false;
    try {
      if (!actorId) throw new Error("Current work access is required.");
      const scopeHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        scope,
      );
      const prefix = `financial:${scopeHash}:`;
      const receiptKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        scope + ":" + key,
      );
      await executeFinancialCommand(
        {
          get: (key) => draftStore.get<FinancialReceipt>(actorId, prefix + key),
          set: (key, value) => draftStore.set(actorId, prefix + key, value),
          remove: (key) => draftStore.remove(actorId, prefix + key),
        },
        receiptKey,
        command,
      );
      saved = true;
      setNotice(success);
      await refresh?.();
      return true;
    } catch (e) {
      if (e instanceof FinancialCancelled) return false;
      const detail =
        e instanceof Error
          ? e.message
          : "No confirmed financial result was returned.";
      setError(
        new Error(
          saved
            ? `${success} The view could not refresh. Check the current record; do not repeat the write.`
            : detail,
        ),
      );
      return false;
    } finally {
      activeScopes.delete(activeScope);
      pending.current = false;
      setBusy(false);
    }
  };
  return {
    run,
    busy,
    error,
    notice,
    clear: () => {
      setError(undefined);
      setNotice("");
    },
  };
}
export function useFinancialAction(
  actorId: string,
  scope: string,
  fingerprint: string,
) {
  const action = useFinancialCommand(actorId, scope);
  return {
    ...action,
    run: (
      operation: () => Promise<unknown>,
      message = "Financial action recorded.",
    ) => action.run(fingerprint, operation, undefined, message),
  };
}
