import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { ChatImage } from "./chatImages";
import {
  listChatPeople,
  listPinnedMessages,
  type Channel,
  type Message,
} from "./services";

export function ConversationInfo({
  actor,
  channel,
  messages,
  open,
  onClose,
}: {
  actor: string;
  channel: Channel;
  messages: Message[];
  open: boolean;
  onClose: () => void;
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
  const media = messages.filter((message) => !!message.image_path);
  const links = [
    ...new Set(
      messages.flatMap(
        (message) => message.content?.match(/https?:\/\/[^\s<>"']+/g) || [],
      ),
    ),
  ];
  return (
    <Sheet
      open={open}
      title="Conversation info"
      onClose={onClose}
      footer={<Button onPress={onClose}>Done</Button>}
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data ? (
        <Loading label="Loading conversation information" layout="summary" />
      ) : (
        <>
          <Card title="People">
            {facts.data.people.map((person) => (
              <Text key={person.id}>
                {person.name || "Colleague"}
                {person.is_lead ? " · Lead" : ""}
              </Text>
            ))}
            {!facts.data.people.length && (
              <Empty compact title="No members to show" />
            )}
          </Card>
          <Card title="Pinned messages">
            {facts.data.pins.map((message) => (
              <Text selectable key={message.id}>
                {message.content || "Image attachment"}
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
