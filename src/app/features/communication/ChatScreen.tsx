import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  Sheet,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import { fetchAllProfiles } from "../../../core/web/lib/supabaseService";
import { draftStore } from "../../../platform/draftStore";
import type { Navigate } from "../../shared/routes";
import {
  loadChannels,
  loadMessages,
  sendChat,
  getOrCreateDirectChannel,
  type Channel,
  type Message,
} from "./services";
import { mergeMessages, isMessageDraft } from "./messageHistory";
import { useCalls } from "./CallProvider";
export function ChatScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth(),
    actor = profile!.id,
    calls = useCalls(),
    [channel, setChannel] = useState<Channel>(),
    [draft, setDraft] = useState(""),
    [newChat, setNewChat] = useState(false),
    [recipient, setRecipient] = useState(""),
    [pending, setPending] = useState<{ id: string; text: string }>(),
    action = useAction(),
    channels = useFacts("chat-channels:" + actor, () => loadChannels(actor)),
    people = useFacts("chat-directory:" + actor, fetchAllProfiles, newChat),
    messages = useFacts(
      "chat-messages:" + actor + ":" + channel?.id,
      () => loadMessages(channel!.id),
      !!channel,
    );
  const [history, setHistory] = useState<{
    scope: string;
    rows: Message[];
    exhausted: boolean;
  }>({ scope: "", rows: [], exhausted: false });
  const scope = actor + ":" + channel?.id;
  const historyRows = history.scope === scope ? history.rows : [];
  const shown = mergeMessages(historyRows, messages.data || []);
  useEffect(() => {
    if (messages.data)
      setHistory((previous) => ({
        scope,
        rows: mergeMessages(
          previous.scope === scope ? previous.rows : [],
          messages.data!,
        ),
        exhausted: previous.scope === scope ? previous.exhausted : false,
      }));
  }, [messages.data, scope]);
  const recovery = useFacts(
    "chat-draft:" + actor + ":" + channel?.id,
    async () => {
      const saved = await draftStore.get<unknown>(actor, "chat:" + channel!.id);
      if (saved !== null && !isMessageDraft(saved))
        throw new Error(
          "This saved message is unreadable. Verify its original send before continuing.",
        );
      return saved as { id: string; text: string } | null;
    },
    !!channel,
  );
  const original = pending || recovery.data;
  useEffect(() => {
    setDraft("");
    setPending(undefined);
    if (!channel) return;
    const live = createPostgresChannel("native-chat:" + channel.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: "channel_id=eq." + channel.id,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as any).id;
            setHistory((previous) =>
              previous.scope === scope
                ? {
                    ...previous,
                    rows: previous.rows.filter((row) => row.id !== id),
                  }
                : previous,
            );
          } else if ((payload.new as any).id) {
            setHistory((previous) => ({
              scope,
              rows: mergeMessages(
                previous.scope === scope ? previous.rows : [],
                [payload.new as Message],
              ),
              exhausted: previous.scope === scope && previous.exhausted,
            }));
          }
          void messages.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [channel?.id, actor]);
  const send = () =>
    action.run(async () => {
      if (!channel) return;
      const item = original || { id: crypto.randomUUID(), text: draft };
      if (!item.text.trim()) return;
      await draftStore.set(actor, "chat:" + channel.id, item);
      setPending(item);
      await sendChat(item.id, channel.id, actor, profile!.full_name, item.text);
      await draftStore.remove(actor, "chat:" + channel.id);
      setPending(undefined);
      setDraft("");
      await Promise.all([
        messages.refresh(),
        channels.refresh(),
        recovery.refresh(),
      ]);
    });
  return (
    <Screen
      title={channel?.name || "Messages"}
      onRefresh={() => void (channel ? messages.refresh() : channels.refresh())}
      refreshing={messages.loading || channels.loading}
      actions={
        <Button disabled={action.busy} onPress={() => setNewChat(true)}>
          New conversation
        </Button>
      }
    >
      {!channel ? (
        channels.error ? (
          <ErrorState error={channels.error} />
        ) : !channels.data ? (
          <Loading />
        ) : !channels.data.length ? (
          <Empty title="No conversations yet" />
        ) : (
          channels.data.map((item) => (
            <Card key={item.id} title={item.name}>
              <LabelValue label="Type" value={item.kind} />
              <Button
                disabled={action.busy}
                variant="outline"
                onPress={() => setChannel(item)}
              >
                Open conversation
              </Button>
            </Card>
          ))
        )
      ) : (
        <>
          <Row>
            <Button
              disabled={action.busy}
              variant="outline"
              onPress={() => setChannel(undefined)}
            >
              All conversations
            </Button>
            {!!channel.taskId && (
              <Button
                variant="outline"
                onPress={() => navigate({ name: "task", id: channel.taskId })}
              >
                Open task
              </Button>
            )}
            {!!channel.otherId && (
              <>
                <Button
                  variant="outline"
                  onPress={() => void calls.start(channel!, "audio")}
                >
                  Audio call
                </Button>
                <Button
                  variant="outline"
                  onPress={() => void calls.start(channel!, "video")}
                >
                  Video call
                </Button>
              </>
            )}
          </Row>
          {messages.error ? (
            <ErrorState error={messages.error} />
          ) : !messages.data ? (
            <Loading />
          ) : (
            shown.map((message) => (
              <Card key={message.id} title={message.sender_name}>
                <Text selectable>{message.content}</Text>
                <LabelValue
                  label="Sent"
                  value={dateLabel(message.created_at)}
                />
              </Card>
            ))
          )}
          {!!shown.length &&
            !(history.scope === scope && history.exhausted) && (
              <Button
                variant="outline"
                busy={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    const batch = await loadMessages(channel.id, shown[0]);
                    setHistory((previous) =>
                      previous.scope === scope
                        ? {
                            ...previous,
                            rows: mergeMessages(batch, previous.rows),
                            exhausted: batch.length < 100,
                          }
                        : previous,
                    );
                  })
                }
              >
                Load older messages
              </Button>
            )}
          {original && (
            <Notice>
              A pending message is retained. Retry sends the same message
              identity.
            </Notice>
          )}
          <Field
            label="Message"
            value={original?.text || draft}
            onChangeText={setDraft}
            editable={!original && !action.busy}
            multiline
            maxLength={5000}
          />
          <Button
            busy={action.busy}
            disabled={
              recovery.loading ||
              !!recovery.error ||
              !(original?.text || draft).trim()
            }
            onPress={() => void send()}
          >
            {original ? "Retry original message" : "Send message"}
          </Button>
          {!!recovery.error && <ErrorState error={recovery.error} />}
        </>
      )}
      {!!action.error && <ErrorState error={action.error} />}
      <Sheet
        open={newChat}
        title="New conversation"
        busy={action.busy}
        onClose={() => setNewChat(false)}
        footer={
          <Button
            busy={action.busy}
            disabled={!recipient}
            onPress={() =>
              void action.run(async () => {
                const id = await getOrCreateDirectChannel(actor, recipient);
                await channels.refresh();
                const person = people.data?.find((p) => p.id === recipient);
                setChannel({
                  id,
                  name: person?.full_name || "Direct conversation",
                  kind: "direct",
                  otherId: recipient,
                  otherName: person?.full_name,
                });
                setNewChat(false);
              })
            }
          >
            Open conversation
          </Button>
        }
      >
        {people.error ? (
          <ErrorState error={people.error} />
        ) : (
          <Choice
            label="Colleague"
            value={recipient}
            onChange={setRecipient}
            options={(people.data || [])
              .filter(
                (p) => p.id !== actor && p.is_active && p.role !== "admin",
              )
              .map((p) => ({ value: p.id, label: p.full_name }))}
          />
        )}
      </Sheet>
    </Screen>
  );
}
