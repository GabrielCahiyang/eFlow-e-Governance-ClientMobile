import { useState } from "react";
import { File } from "expo-file-system";
import type { PickedFile } from "../../../platform/files";
import { draftStore } from "../../../platform/draftStore";
import { useFacts } from "../../shared/useFacts";

type FileInfo = Omit<PickedFile, "arrayBuffer">;

export function useChatAttachment(actor: string, channel?: string) {
  const key = "chat-attachment:" + channel;
  const scope = JSON.stringify([actor, channel]);
  const [edit, setEdit] = useState<{ scope: string; file?: PickedFile }>();
  const facts = useFacts(
    key + ":" + actor,
    async () => {
      const info = await draftStore.get<FileInfo>(actor, key);
      return (
        info && { ...info, arrayBuffer: () => new File(info.uri).arrayBuffer() }
      );
    },
    !!channel,
  );
  return {
    file: edit?.scope === scope ? edit.file : (facts.data ?? undefined),
    loading: facts.loading,
    error: facts.error,
    set: async (file?: PickedFile) => {
      if (!channel) return;
      setEdit({ scope, file });
      if (file) {
        const { uri, name, type, size } = file;
        await draftStore.set(actor, key, { uri, name, type, size });
      } else await draftStore.remove(actor, key);
    },
  };
}
