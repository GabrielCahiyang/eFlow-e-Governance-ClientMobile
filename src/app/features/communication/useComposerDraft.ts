import { useEffect, useRef, useState } from "react";
import { draftStore } from "../../../platform/draftStore";
import { useFacts } from "../../shared/useFacts";

// Keep unsent text separate from the immutable request used to recover a send.
const writes = new Map<string, Promise<void>>();

export function useComposerDraft(actor: string, channel?: string) {
  const key = channel ? "chat-composer:" + channel : "";
  const scope = JSON.stringify([actor, key]);
  const [edit, setEdit] = useState<{ scope: string; text: string }>();
  const [failure, setFailure] = useState<{ scope: string; error: Error }>();
  const pending = useRef<
    | { scope: string; text: string; timer: ReturnType<typeof setTimeout> }
    | undefined
  >(undefined);
  const facts = useFacts(
    scope,
    async () => {
      await writes.get(scope)?.catch(() => {});
      const text = await draftStore.get<unknown>(actor, key);
      return typeof text === "string" ? text : "";
    },
    !!key,
  );
  const value = edit?.scope === scope ? edit.text : (facts.data ?? "");

  function save(text: string) {
    if (!key) return Promise.resolve();
    const previous = writes.get(scope);
    const next = (previous ?? Promise.resolve())
      .catch(() => {})
      .then(() =>
        text ? draftStore.set(actor, key, text) : draftStore.remove(actor, key),
      );
    writes.set(scope, next);
    return next.finally(() => {
      if (writes.get(scope) === next) writes.delete(scope);
    });
  }

  function persist(text: string) {
    void save(text).then(
      () =>
        setFailure((current) =>
          current?.scope === scope ? undefined : current,
        ),
      () =>
        setFailure({
          scope,
          error: new Error("Could not save your draft on this device."),
        }),
    );
  }

  function flush() {
    const dirty = pending.current;
    if (dirty?.scope !== scope) return;
    clearTimeout(dirty.timer);
    pending.current = undefined;
    persist(dirty.text);
  }

  useEffect(() => flush, [scope]);

  return {
    value,
    loading: facts.loading,
    error:
      facts.error ?? (failure?.scope === scope ? failure.error : undefined),
    setValue: (text: string) => {
      if (!key) return;
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = { scope, text, timer: setTimeout(flush, 300) };
      setEdit({ scope, text });
    },
    onBlur: flush,
    clear: async () => {
      flush();
      await save("");
      setEdit((current) =>
        current && current.scope !== scope ? current : { scope, text: "" },
      );
    },
  };
}
