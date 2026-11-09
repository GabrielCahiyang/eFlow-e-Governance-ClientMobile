import { supabase } from "../../../platform/supabase";
import { validateOutgoingChatContent } from "../../../core/web/app/features/chat-calls/services/chatModerationService";
export {
  getOrCreateDirectChannel,
  updateMessageContent,
} from "../../../core/web/app/services/chatService";
export type Channel = {
  id: string;
  name: string;
  kind: string;
  taskId?: string;
  projectId?: string;
  projectTitle?: string;
  lastMessage?: string;
  unread?: boolean;
  otherId?: string;
  otherName?: string;
};
export type Message = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  image_path?: string | null;
  pinned_at?: string | null;
  reaction_users?: Record<string, Record<string, string>> | null;
};
export async function loadChannels() {
  const { data, error } = await supabase.rpc("list_message_conversations");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data))
    throw new Error("Could not verify your conversations.");
  return data.map((row): Channel => ({
    id: row.channel_id,
    name: row.name,
    kind: row.channel_type,
    taskId: row.task_id || undefined,
    projectId: row.project_id || undefined,
    projectTitle: row.project_title || undefined,
    otherId: row.other_user_id || undefined,
    otherName: row.other_user_id ? row.name : undefined,
    lastMessage: row.last_message || undefined,
    unread: row.unread === true,
  }));
}

export async function readConversation(channel: string, through: string) {
  const { error } = await supabase.rpc("read_message_conversation", {
    p_channel: channel,
    p_through: through,
  });
  if (error) throw new Error(error.message);
}

export async function listChatPeople(channel?: string) {
  const { data, error } = await supabase.rpc("list_message_people", {
    p_channel: channel || null,
  });
  if (error) throw new Error(error.message);
  return (data || []) as Array<{
    id: string;
    name: string | null;
    is_lead: boolean;
  }>;
}

export async function openDirectConversation(personId: string) {
  const { data, error } = await supabase.rpc("open_direct_conversation", {
    p_person: personId,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function setMessagePin(messageId: string, pin: boolean) {
  const { error } = await supabase.rpc("set_conversation_message_pin", {
    p_message: messageId,
    p_pin: pin,
  });
  if (error) throw new Error(error.message);
}

export async function listPinnedMessages(channel: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,sender_id,sender_name,content,created_at,image_path,pinned_at")
    .eq("channel_id", channel)
    .not("pinned_at", "is", null)
    .order("pinned_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []) as Message[];
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const { error } = await supabase.rpc("toggle_conversation_reaction", {
    p_message: messageId,
    p_emoji: emoji,
  });
  if (error) throw new Error(error.message);
}

export async function loadMessages(channel: string, before?: Message) {
  let query = supabase
    .from("chat_messages")
    .select(
      "id,sender_id,sender_name,content,created_at,image_path,pinned_at,reaction_users",
    )
    .eq("channel_id", channel)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (before) {
    if (
      !/^[0-9a-f-]{36}$/i.test(before.id) ||
      !Number.isFinite(Date.parse(before.created_at))
    )
      throw new Error("Invalid message cursor. Refresh the conversation.");
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  }
  const r = await query.limit(before ? 100 : 300);
  if (r.error) throw r.error;
  return (r.data || []).reverse() as Message[];
}
export async function sendChat(
  id: string,
  channel: string,
  actor: string,
  name: string,
  text: string,
  imagePath?: string,
) {
  const content = text.trim(),
    valid = content
      ? validateOutgoingChatContent(content)
      : { isValid: !!imagePath, reason: "" };
  if (!valid.isValid) throw new Error(valid.reason || "Write a message first.");
  const prior = await supabase
    .from("chat_messages")
    .select("id,channel_id,sender_id,content,image_path")
    .eq("id", id)
    .maybeSingle();
  if (prior.error) throw prior.error;
  if (prior.data) {
    if (
      prior.data.channel_id !== channel ||
      prior.data.sender_id !== actor ||
      prior.data.content !== content ||
      (prior.data.image_path || undefined) !== imagePath
    )
      throw new Error(
        "The original message receipt does not match. Refresh the conversation.",
      );
    return;
  }
  const r = await supabase.from("chat_messages").insert({
    id,
    channel_id: channel,
    sender_id: actor,
    sender_name: name,
    content,
    ...(imagePath ? { image_path: imagePath } : {}),
  });
  if (r.error) throw r.error;
}
