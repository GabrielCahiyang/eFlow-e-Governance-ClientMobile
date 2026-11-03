import {
  fetchAllOrgs,
  getAncestorOrgIds,
} from "../../../core/web/lib/supabaseService";
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
  otherId?: string;
  otherName?: string;
};
export type Message = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};
export async function loadChannels(actor: string) {
  const r = await supabase
    .from("chat_channel_members")
    .select("channel_id,chat_channels(id,name,task_id,channel_type)")
    .eq("user_id", actor);
  if (r.error) throw r.error;
  const out: Channel[] = [];
  for (const row of r.data || []) {
    const channel: any = row.chat_channels;
    if (!channel) continue;
    let name = channel.name || "Task conversation",
      otherId,
      otherName;
    if (channel.channel_type === "direct") {
      const p = await supabase
        .from("chat_channel_members")
        .select("user_id,profiles(full_name)")
        .eq("channel_id", row.channel_id)
        .neq("user_id", actor)
        .maybeSingle();
      if (p.error) throw p.error;
      otherId = p.data?.user_id;
      otherName = (p.data?.profiles as any)?.full_name;
      name = otherName || "Direct conversation";
    }
    out.push({
      id: channel.id,
      name,
      kind: channel.channel_type,
      taskId: channel.task_id,
      otherId,
      otherName,
    });
  }
  const person = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", actor)
    .single();
  if (person.error) throw person.error;
  if (person.data.org_id) {
    const orgs = await fetchAllOrgs(),
      ids = getAncestorOrgIds(orgs, person.data.org_id);
    const standing = await supabase
      .from("chat_channels")
      .select("id,name")
      .eq("channel_type", "org")
      .in("org_id", ids);
    if (standing.error) throw standing.error;
    for (const channel of standing.data || [])
      if (!out.some((item) => item.id === channel.id))
        out.push({
          id: channel.id,
          name: channel.name || "Office conversation",
          kind: "org",
        });
  }
  return out;
}
export async function loadMessages(channel: string, before?: Message) {
  let query = supabase
    .from("chat_messages")
    .select("id,sender_id,sender_name,content,created_at")
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
) {
  const content = text.trim(),
    valid = validateOutgoingChatContent(content);
  if (!content || !valid.isValid)
    throw new Error(valid.reason || "Write a message first.");
  const prior = await supabase
    .from("chat_messages")
    .select("id,channel_id,sender_id,content")
    .eq("id", id)
    .maybeSingle();
  if (prior.error) throw prior.error;
  if (prior.data) {
    if (
      prior.data.channel_id !== channel ||
      prior.data.sender_id !== actor ||
      prior.data.content !== content
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
  });
  if (r.error) throw r.error;
}
