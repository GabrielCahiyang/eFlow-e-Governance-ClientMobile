import type { Channel } from "./services";

export function filterConversationContext(
  channels: Channel[],
  taskId?: string,
  projectTasks?: ReadonlySet<string>,
) {
  if (taskId) return channels.filter((channel) => channel.taskId === taskId);
  if (projectTasks)
    return channels.filter(
      (channel) => !!channel.taskId && projectTasks.has(channel.taskId),
    );
  return channels;
}
