import { useEffect, useRef, useState } from "react";
import { draftStore } from "../../../platform/draftStore";
import { useFacts } from "../../shared/useFacts";
import {
  editChatDraft,
  readChatMentions,
  type ChatDraft,
} from "../../../core/web/app/features/chat-calls/services/chatMentions";

const emptyDraft: ChatDraft = { text: "", mentions: [] };

// Keep unsent text separate from the immutable request used to recover a send.
const writes = new Map<string, Promise<void>>();

export function useComposerDraft(actor: string, channel?: string) {
  const key = channel ? "chat-composer:" + channel : "";
  const scope = JSON.stringify([actor, key]);
  const [edit, setEdit] = useState<{ scope: string; draft: ChatDraft }>();
  const [failure, setFailure] = useState<{ scope: string; error: Error }>();
  const pending = useRef<
    | { scope: string; draft: ChatDraft; timer: ReturnType<typeof setTimeout> }
    | undefined
  >(undefined);
  const facts = useFacts(
    scope,
    async () => {
      await writes.get(scope)?.catch(() => {});
      const saved = await draftStore.get<unknown>(actor, key);
      if (typeof saved === "string") return { text: saved, mentions: [] };
      if (
        saved &&
        typeof saved === "object" &&
        "text" in saved &&
        typeof saved.text === "string"
      )
        return {
          text: saved.text,
          mentions: readChatMentions(
            "mentions" in saved ? saved.mentions : [],
            saved.text,
          ),
        };
      return emptyDraft;
    },
    !!key,
  );
  const draft = edit?.scope === scope ? edit.draft : (facts.data ?? emptyDraft);

  function save(value: ChatDraft) {
    if (!key) return Promise.resolve();
    const previous = writes.get(scope);
    const next = (previous ?? Promise.resolve())
      .catch(() => {})
      .then(() =>
        value.text
          ? draftStore.set(
              actor,
              key,
              value.mentions.length ? value : value.text,
            )
          : draftStore.remove(actor, key),
      );
    writes.set(scope, next);
    return next.finally(() => {
      if (writes.get(scope) === next) writes.delete(scope);
    });
  }

  function persist(value: ChatDraft) {
    void save(value).then(
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
    persist(dirty.draft);
  }

  useEffect(() => flush, [scope]);

  const setDraft = (value: ChatDraft) => {
    if (!key) return;
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { scope, draft: value, timer: setTimeout(flush, 300) };
    setEdit({ scope, draft: value });
  };
  return {
    value: draft.text,
    draft,
    setDraft,
    loading: facts.loading,
    error:
      facts.error ?? (failure?.scope === scope ? failure.error : undefined),
    setValue: (text: string) =>
      setDraft(
        editChatDraft(
          pending.current?.scope === scope ? pending.current.draft : draft,
          text,
        ),
      ),
    onBlur: flush,
    clear: async () => {
      flush();
      await save(emptyDraft);
      setEdit((current) =>
        current && current.scope !== scope
          ? current
          : { scope, draft: emptyDraft },
      );
    },
  };
}
