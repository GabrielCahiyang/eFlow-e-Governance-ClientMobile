export function conversationLoadState({
  loaded,
  hasMessages,
  checking,
  readError,
  sendError,
}: {
  loaded: boolean;
  hasMessages: boolean;
  checking: boolean;
  readError?: Error;
  sendError?: Error;
}) {
  if (readError) return "unavailable";
  if (!loaded || (!hasMessages && checking)) return "loading";
  return !hasMessages && !sendError ? "empty" : "thread";
}
