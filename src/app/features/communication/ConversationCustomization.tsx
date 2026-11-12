import { useRef, useState } from "react";
import { View } from "react-native";
import { Button, ErrorState, Field } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAction } from "../../shared/useAction";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import { chooseFiles, type PickedFile } from "../../../platform/files";
import {
  chatImageTypes,
  cleanupChatImage,
  uploadChatImage,
} from "./chatImages";
import {
  editConversationGroup,
  loadChannels,
  setConversationNickname,
  type Channel,
  type ChatPerson,
} from "./services";

export function EditChatGroup({
  actor,
  channel,
  onChanged,
}: {
  actor: string;
  channel: Channel;
  onChanged: () => Promise<void>;
}) {
  const action = useAction();
  const assertAccess = useAccountActionAccess();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<PickedFile>();
  const [reset, setReset] = useState(false);
  const upload = useRef<{ file: PickedFile; path: string }>(undefined);
  const baseline = useRef<{ name: string; photo?: string }>(undefined);
  const discardUpload = () => {
    if (upload.current)
      void cleanupChatImage(upload.current.path).catch(() => {});
    upload.current = undefined;
  };
  const start = () => {
    baseline.current = { name: channel.name, photo: channel.avatarPath };
    setName(channel.name === channel.defaultName ? "" : channel.name);
    setPhoto(undefined);
    setReset(false);
    action.clear();
    setOpen(true);
  };
  const close = () => {
    discardUpload();
    setOpen(false);
  };
  const save = () =>
    void action.run(async () => {
      const latest = (await loadChannels()).find(
        (item) => item.id === channel.id,
      );
      if (!latest?.canEditGroup || latest.archived)
        throw new Error("This group can no longer be edited.");
      const before = baseline.current;
      const expectedPath =
        photo && upload.current?.file === photo
          ? upload.current.path
          : reset
            ? null
            : (before?.photo ?? null);
      const expectedName = name.trim() || latest.defaultName;
      if (
        (!photo || upload.current?.file === photo) &&
        latest.name === expectedName &&
        (latest.avatarPath ?? null) === expectedPath
      ) {
        // The prior write may have succeeded even when its response was lost.
        upload.current = undefined;
        setOpen(false);
        await onChanged();
        return;
      }
      if (before?.name !== latest.name || before?.photo !== latest.avatarPath)
        throw new Error(
          "This group changed elsewhere. Reopen the editor before saving.",
        );
      assertAccess(actor);
      if (photo && upload.current?.file !== photo) {
        const path = await uploadChatImage(channel.id, actor, photo, true);
        upload.current = { file: photo, path };
      }
      const next =
        upload.current?.path ?? (reset ? null : (latest.avatarPath ?? null));
      assertAccess(actor);
      await editConversationGroup(channel.id, name, next);
      if (latest.avatarPath && latest.avatarPath !== next)
        void cleanupChatImage(latest.avatarPath).catch(() => {});
      upload.current = undefined;
      setOpen(false);
      await onChanged();
    });
  if (!open)
    return (
      <Button variant="outline" onPress={start}>
        Edit group chat
      </Button>
    );
  return (
    <View style={{ gap: 8 }}>
      <Field
        label="Chat name"
        placeholder={channel.defaultName}
        value={name}
        onChangeText={setName}
        maxLength={100}
        editable={!action.busy}
      />
      <Button
        variant="ghost"
        disabled={action.busy}
        onPress={() => setName("")}
      >
        Use default name
      </Button>
      <Button
        variant="outline"
        disabled={action.busy}
        onPress={() =>
          void action.run(async () => {
            const [file] = await chooseFiles(chatImageTypes);
            if (!file) return;
            discardUpload();
            setPhoto(file);
            setReset(false);
          })
        }
      >
        {photo?.name || "Choose group photo"}
      </Button>
      {!!(channel.avatarPath || photo) && (
        <Button
          variant="ghost"
          disabled={action.busy}
          onPress={() => {
            discardUpload();
            setPhoto(undefined);
            setReset(true);
          }}
        >
          {reset ? "Default photo selected" : "Use default photo"}
        </Button>
      )}
      {!!action.error && <ErrorState error={action.error} />}
      <Button disabled={action.busy} onPress={save}>
        Save group chat
      </Button>
      <Button variant="outline" disabled={action.busy} onPress={close}>
        Cancel group edit
      </Button>
    </View>
  );
}

export function EditChatNickname({
  person,
  channel,
  onChanged,
}: {
  person: ChatPerson;
  channel: string;
  onChanged: () => Promise<void>;
}) {
  const action = useAction();
  const [value, setValue] = useState<string>();
  const name = person.name || "Team member";
  const save = (nickname: string) =>
    void action.run(async () => {
      await setConversationNickname(channel, person.id, nickname);
      setValue(undefined);
      await onChanged();
    });
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "600" }}>
        {person.nickname || name}
        {person.is_lead ? " · Lead" : ""}
      </Text>
      {!!person.nickname && <Text>{name}</Text>}
      {value === undefined ? (
        <Button
          variant="ghost"
          onPress={() => {
            action.clear();
            setValue(person.nickname ?? "");
          }}
        >
          Edit nickname for {name}
        </Button>
      ) : (
        <>
          <Field
            label={`Nickname for ${name}`}
            value={value}
            onChangeText={setValue}
            editable={!action.busy}
            maxLength={40}
          />
          {!!action.error && <ErrorState error={action.error} />}
          <Button disabled={action.busy} onPress={() => save(value)}>
            Save nickname
          </Button>
          {!!person.nickname && (
            <Button
              variant="outline"
              disabled={action.busy}
              onPress={() => save("")}
            >
              Clear nickname
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={action.busy}
            onPress={() => setValue(undefined)}
          >
            Cancel nickname edit
          </Button>
        </>
      )}
    </View>
  );
}
