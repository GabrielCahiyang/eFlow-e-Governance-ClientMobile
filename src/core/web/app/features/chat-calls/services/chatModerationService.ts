// ─── Chat Moderation Service ──────────────────────────────────────────────
// Content moderation guardrails for eFlow chat and communications.
// Validates outgoing messages against harassment, profanity, and offensive slurs
// across English, Filipino (Tagalog), and Cebuano (Bisaya).

export interface ModerationResult {
  isValid: boolean;
  reason?: string;
  sanitizedText: string;
}

// Prohibited terms across English, Tagalog, and Cebuano/Bisaya
const DISALLOWED_PATTERNS: string[] = [
  // English profanity / slurs / harassment
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "motherfucker",
  "cunt",
  "dickhead",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "pussy",
  "cock",
  "whore",
  "slut",

  // Tagalog / Filipino profanity & slurs
  "putangina",
  "tangina",
  "puta",
  "gago",
  "gaga",
  "tarantado",
  "tarantada",
  "bwisit",
  "buwisit",
  "ulol",
  "pakyu",
  "leche",
  "letse",
  "inutil",
  "hinayupak",
  "hayop ka",
  "bayag",
  "kantot",
  "pekpek",
  "puke",
  "kupal",

  // Cebuano / Bisaya profanity & slurs
  "yawa",
  "yaw-a",
  "buang",
  "boang",
  "bilat",
  "bilatibay",
  "bilat si nanay",
  "peste",
  "piste",
  "giatay",
  "atay",
  "burikat",
  "kolera",
  "kagwang",
  "kayat",
  "otog",
  "iyot",
  "pisting yawa",
];

// Leetspeak substitutions map for normalization
const LEET_REPLACEMENTS: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
};

/**
 * Normalizes text to catch obfuscated profanity:
 * - Converts to lowercase
 * - Replaces leetspeak characters
 * - Compresses repeated consecutive letters (e.g. "yaaaawa" -> "yawa", "fuuuck" -> "fuck")
 */
function normalizeForCheck(text: string): string {
  let normalized = text.toLowerCase();

  for (const [leet, char] of Object.entries(LEET_REPLACEMENTS)) {
    normalized = normalized.split(leet).join(char);
  }

  // Reduce 3 or more repeated consecutive identical letters to a single letter
  normalized = normalized.replace(/(.)\1{2,}/g, "$1");

  return normalized;
}

/**
 * Validates chat content against harassment, profanity, and length restrictions.
 */
export function validateChatMessage(text: string): ModerationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      isValid: true,
      sanitizedText: "",
    };
  }

  if (trimmed.length > 1000) {
    return {
      isValid: false,
      reason: `Message exceeds the 1,000-character limit (${trimmed.length}/1000). Please shorten your message.`,
      sanitizedText: trimmed.slice(0, 1000),
    };
  }

  const normalized = normalizeForCheck(trimmed);
  let sanitized = trimmed;
  let hasViolation = false;

  for (const term of DISALLOWED_PATTERNS) {
    // Word boundary or isolated expression match
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\W)(${escapedTerm})(\\W|$)`, "gi");

    if (regex.test(normalized)) {
      hasViolation = true;
      // Sanitize the original text replacing matching tokens
      const maskRegex = new RegExp(escapedTerm, "gi");
      sanitized = sanitized.replace(maskRegex, (m) => "*".repeat(m.length));
    }
  }

  if (hasViolation) {
    return {
      isValid: false,
      reason: "Your message contains words that violate the eFlow workplace communication standards. Please revise.",
      sanitizedText: sanitized,
    };
  }

  return {
    isValid: true,
    sanitizedText: trimmed,
  };
}

/** Validate the authored text, not quoted reply metadata in a message envelope. */
export function validateOutgoingChatContent(content: string): ModerationResult {
  let text = content;
  try {
    const payload: unknown = JSON.parse(content);
    if (payload && typeof payload === "object" && "text" in payload && typeof payload.text === "string") {
      text = payload.text;
    }
  } catch {
    // Plain messages are not JSON.
  }
  return validateChatMessage(text);
}
