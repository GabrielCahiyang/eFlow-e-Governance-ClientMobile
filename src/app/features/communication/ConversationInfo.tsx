import {
  Button,
  Card,
  Empty,
  ErrorState,
  Row,
  Loading,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { ChatAvatar } from "./ChatAvatar";
import { EditChatGroup, EditChatNickname } from "./ConversationCustomization";
import { messagePreview } from "./messageHistory";
import { parseMessage } from "../../../core/web/app/features/chat-calls/services/chatMessageCodec";
import { ChatImage } from "./chatImages";
import {
  listChatPeople,
  listPinnedMessages,
  setConversationPin,
  type Channel,
  type Message,
} from "./services";

export function ConversationInfo({
  actor,
  channel,
  messages,
  open,
  onClose,
  onChanged,
}: {
  actor: string;
  channel: Channel;
  messages: Message[];
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const facts = useFacts(
    `chat-info:${actor}:${channel.id}`,
    async () => {
      const [people, pins] = await Promise.all([
        listChatPeople(channel.id),
        listPinnedMessages(channel.id),
      ]);
      return { people, pins };
    },
    open,
  );
  const pin = useAction();
  const changed = async () => {
    await Promise.all([onChanged(), facts.refresh()]);
  };
  const group = channel.kind === "project" || channel.kind === "task";
  const visible = messages.filter(
    (message) => !message.deleted_at && !message.activity_kind,
  );
  const media = visible.filter((message) => !!message.image_path);
  const links = [
    ...new Set(
      visible.flatMap(
        (message) =>
          parseMessage(message.content).text.match(/https?:\/\/[^\s<>"']+/g) ||
          [],
      ),
    ),
  ];
  return (
    <Sheet
      open={open}
      title="Conversation info"
      onClose={onClose}
      busy={pin.busy}
      footer={<Button onPress={onClose}>Done</Button>}
    >
      <Card>
        <Row>
          <ChatAvatar
            name={channel.name}
            kind={channel.kind}
            actor={actor}
            path={channel.avatarPath}
          />
          <Text style={{ flex: 1, fontWeight: "700" }}>{channel.name}</Text>
        </Row>
        {channel.archived ? (
          <Text>Archived project conversation</Text>
        ) : channel.kind === "project" ? (
          <Text>Project chats are pinned automatically.</Text>
        ) : (
          <Button
            variant="outline"
            disabled={pin.busy}
            onPress={() =>
              void pin.run(async () => {
                await setConversationPin(channel.id, !channel.personalPin);
                await changed();
              })
            }
          >
            {channel.personalPin ? "Unpin conversation" : "Pin conversation"}
          </Button>
        )}
        {!!pin.error && <ErrorState error={pin.error} />}
        {!channel.archived && channel.canEditGroup && (
          <EditChatGroup
            key={channel.id}
            actor={actor}
            channel={channel}
            onChanged={changed}
          />
        )}
      </Card>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data ? (
        <Loading label="Loading conversation information" layout="summary" />
      ) : (
        <>
          <Card title="People">
            {facts.data.people.map((person) =>
              group && !channel.archived ? (
                <EditChatNickname
                  key={person.id}
                  person={person}
                  channel={channel.id}
                  onChanged={changed}
                />
              ) : (
                <Text key={person.id}>
                  {person.nickname || person.name || "Colleague"}
                  {person.is_lead ? " · Lead" : ""}
                </Text>
              ),
            )}
            {!facts.data.people.length && (
              <Empty compact title="No members to show" />
            )}
          </Card>
          <Card title="Pinned messages">
            {facts.data.pins.map((message) => (
              <Text selectable key={message.id}>
                {messagePreview(message, actor)}
              </Text>
            ))}
            {!facts.data.pins.length && (
              <Empty compact title="No pinned messages" />
            )}
          </Card>
          <Card title="Shared images and links">
            {media.map((message) => (
              <ChatImage
                key={message.id}
                actor={actor}
                path={message.image_path!}
              />
            ))}
            {links.map((link) => (
              <Text selectable key={link}>
                {link}
              </Text>
            ))}
            {!media.length && !links.length && (
              <Empty compact title="No media or links in loaded messages" />
            )}
          </Card>
        </>
      )}
    </Sheet>
  );
}
