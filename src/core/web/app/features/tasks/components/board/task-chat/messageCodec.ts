export interface ParsedMessage {
  text: string;
  replyToName?: string;
  replyToText?: string;
  reactions?: Record<string, string[]>;
}

export function parseMessage(content: string): ParsedMessage {
  try {
    if (content.startsWith("{") && content.endsWith("}")) {
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null && "text" in parsed) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore
  }
  return { text: content };
}
