import { useEffect, useRef, useState } from "react";
import { draftStore } from "../../../platform/draftStore";
import { sendPersonalRequest, PersonalCommandFailure } from "./services";
import type { PersonalCommand } from "../../../core/web/app/features/workspaces/types";
import { isPersonalRequest, type PersonalRequest } from "./requestRecovery";
export function usePersonalActions(
  actor: string,
  project: string,
  onSaved: () => Promise<void>,
) {
  const scope = "personal-command:" + project,
    [pending, setPending] = useState<PersonalRequest | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [recoveryBlocked, setRecoveryBlocked] = useState(false),
    [canDiscard, setCanDiscard] = useState(false);
  const active = useRef(false),
    generation = useRef(0),
    receipt = useRef<PersonalRequest | null>(null);
  const recoveryReady = useRef(false);
  useEffect(() => {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    setNotice("");
    setPending(null);
    receipt.current = null;
    recoveryReady.current = false;
    setRecoveryBlocked(false);
    setCanDiscard(false);
    void draftStore
      .get<unknown>(actor, scope)
      .then((value) => {
        if (version !== generation.current) return;
        if (value !== null && !isPersonalRequest(value, actor, project))
          throw new Error(
            "The saved personal-work request could not be verified. Check its original result before continuing.",
          );
        receipt.current = value as PersonalRequest | null;
        recoveryReady.current = true;
        setPending(receipt.current);
      })
      .catch((reason) => {
        if (version === generation.current) {
          setError(reason.message);
          setRecoveryBlocked(true);
        }
      })
      .finally(() => {
        if (version === generation.current) setLoading(false);
      });
    return () => {
      ++generation.current;
    };
  }, [actor, project]);
  const execute = async (
    command?: PersonalCommand,
    payload?: Record<string, unknown>,
  ) => {
    if (
      active.current ||
      loading ||
      !recoveryReady.current ||
      !actor ||
      !project
    )
      return false;
    if (!receipt.current && !command) return false;
    active.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setCanDiscard(false);
    const version = generation.current;
    try {
      let saved = receipt.current;
      if (saved && command)
        throw new Error(
          "Resolve the saved request before starting another action. Retry sends its original payload and request ID.",
        );
      if (!saved) {
        saved = {
          schema: 1,
          actor,
          project,
          command: command!,
          payload: payload!,
          request: crypto.randomUUID(),
        };
        await draftStore.set(actor, scope, saved);
        if (version !== generation.current) return false;
        receipt.current = saved;
        if (version === generation.current) setPending(saved);
      }
      await sendPersonalRequest(saved);
      await draftStore.remove(actor, scope);
      if (version === generation.current) {
        receipt.current = null;
        setPending(null);
        setNotice("Changes saved.");
        try {
          await onSaved();
        } catch {
          setError(
            "Changes were saved, but the updated view could not load. Refresh this project.",
          );
        }
      }
      return true;
    } catch (reason) {
      if (version === generation.current) {
        setCanDiscard(
          reason instanceof PersonalCommandFailure && reason.confirmedRejected,
        );
        setError(
          reason instanceof Error
            ? reason.message
            : "The request did not finish. Retry keeps its original identity.",
        );
      }
      return false;
    } finally {
      active.current = false;
      if (version === generation.current) setBusy(false);
    }
  };
  return {
    busy,
    loading,
    error,
    notice,
    pending,
    recoveryBlocked,
    canDiscard,
    discard: async () => {
      if (active.current || !canDiscard) return;
      active.current = true;
      setBusy(true);
      const version = generation.current;
      try {
        await draftStore.remove(actor, scope);
        if (version === generation.current) {
          receipt.current = null;
          setPending(null);
          setCanDiscard(false);
          setError("");
        }
      } catch (reason) {
        if (version === generation.current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not clear the rejected request.",
          );
      } finally {
        active.current = false;
        if (version === generation.current) setBusy(false);
      }
    },
    run: (command: PersonalCommand, payload: Record<string, unknown>) =>
      execute(command, payload),
    retry: () => execute(),
  };
}
