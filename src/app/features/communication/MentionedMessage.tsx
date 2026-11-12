import { View } from "react-native";
import { Button, Card } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { ChatImage } from "./chatImages";
import { messagePreview } from "./messageHistory";
import { listStamp } from "./chatPresentation";
import type { Message } from "./services";

export function MentionedMessage({
  actor,
  message,
  pending,
  unavailable,
  onClose,
}: {
  actor: string;
  message?: Message | null;
  pending: boolean;
  unavailable: boolean;
  onClose: () => void;
}) {
  return (
    <View style={{ marginHorizontal: 12, marginTop: 8 }}>
      <Card title="Message from your notification">
        {message ? (
          <>
            <Text>
              {message.sender_name} · {listStamp(message.created_at)}
            </Text>
            <Text selectable>{messagePreview(message, actor)}</Text>
            {!!message.image_path && !message.deleted_at && (
              <ChatImage
                actor={actor}
                path={message.image_path}
                style={{ height: 100 }}
              />
            )}
          </>
        ) : (
          <Text>
            {pending && !unavailable
              ? "Finding the message…"
              : "This message is unavailable."}
          </Text>
        )}
        <Button variant="outline" onPress={onClose}>
          Dismiss highlighted message
        </Button>
      </Card>
    </View>
  );
}
