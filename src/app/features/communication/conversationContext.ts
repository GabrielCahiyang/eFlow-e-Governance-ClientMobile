import type { Channel } from "./services";

export function filterConversationContext(
  channels: Channel[],
  taskId?: string,
  projectTasks?: ReadonlySet<string>,
  projectId?: string,
) {
  if (taskId) return channels.filter((channel) => channel.taskId === taskId);
  if (projectId)
    return channels.filter((channel) => channel.projectId === projectId);
  if (projectTasks)
    return channels.filter(
      (channel) => !!channel.taskId && projectTasks.has(channel.taskId),
    );
  return channels;
}
