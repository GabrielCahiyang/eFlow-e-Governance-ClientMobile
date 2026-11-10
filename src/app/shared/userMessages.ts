/** Public feedback only. Never interpolate a transport, database or provider error. */
export class PublicMessageError extends Error {}
export const contributorReviewUnavailable =
  "Work updates that need your Lead’s approval are currently unavailable on mobile.";
export const feedback = {
  invalidCredentials: "Email or password is incorrect.",
  load: "We couldn't load this information. Please try again.",
  action:
    "We couldn't confirm your changes. Refresh this page and check before trying again.",
  connection:
    "We couldn't connect. Check your internet connection and try again.",
  timeout: "This is taking longer than expected. Please try again.",
  access:
    "You don't have access to do this. Refresh the page or contact your Office Head.",
  changed: "This item has changed. Refresh the page before continuing.",
  session: "Please sign in again to continue.",
  unavailable:
    "This information isn't available right now. Please try again later.",
  saved:
    "Your changes were saved, but this page couldn't update. Refresh to see them. Don't submit them again.",
} as const;
export type FeedbackContext = "load" | "action";
const known = new Map<string, string>([
  [contributorReviewUnavailable, contributorReviewUnavailable],
  [
    "Allow camera access",
    "Allow camera access in device settings, or choose a file instead.",
  ],
  [
    "Upload interrupted",
    "The upload stopped before it finished. Check and resume your submission.",
  ],
  [
    "This subtask is outside the linked project context.",
    "This subtask doesn't belong to the selected project. Return to Projects to open it.",
  ],
  [
    "Settlement blocked. An independent Accounting Officer is required. Receipt endorsement or review approval does not settle the advance or grant journal-posting permission. Resolve the appointment through the authorized Office workflow.",
    "An independent Accounting Officer must be assigned before this advance can be settled. Review approval alone does not complete settlement. Contact your Office Head.",
  ],
  [
    "Work access or revision changed. Reopen this subtask and review the current work.",
    feedback.changed,
  ],
  ["The submission outcome could not be confirmed.", feedback.action],
  [
    "This financial action was already saved. Refresh the current record.",
    "This action was already saved. Refresh to see the latest record.",
  ],
  [
    "This action has no confirmed response. Check the current record before repeating the write.",
    feedback.action,
  ],
  [
    "Another financial action in this record has no confirmed response. Verify it before changing the request terms.",
    feedback.action,
  ],
  [
    "Announcement access is unavailable. The service must be restored before notices can load.",
    "Announcements aren't available right now. Please try again later.",
  ],
  [
    "Current independent review access is required.",
    "This review is no longer available to you. Refresh to check your assignments.",
  ],
  [
    "Settle all outstanding task cash before approval.",
    "Outstanding task cash must be settled before approval.",
  ],
]);
const validations = [
  "Enter a completion note.",
  "Enter a work note.",
  "Describe what is blocking the work.",
  "Explain what needs to change.",
  "Enter the reason for your decision.",
  "A work note is required.",
  "Record a reason for this decision.",
  "A review note or required correction is required.",
  "Explain what needs to be purchased.",
  "Needed-by date is required.",
  "Choose funding sources and positive amounts.",
  "Choose each funding source once.",
  "Actual spending cannot exceed released cash.",
  "Record the cash-return receipt number and date.",
  "Attach a receipt image or PDF for every row.",
  "Use 3,000 characters or fewer.",
  "Allow camera access in device settings, or choose a file instead.",
  "The selected file is empty, too large, or changed. Verify the original file.",
  "Each file needs a name of up to 255 characters.",
  "Choose a JPEG, PNG or WebP image.",
  "Choose a supported image, PDF, Word or Excel file.",
  "Enter your password.",
  "Use a password with 12 to 128 characters.",
  "Passwords must match.",
  "Switch accounts to accept this invitation.",
  "Enter your full name (2–160 characters).",
  "Title is required.",
  "Task name is required.",
  "Progress must be a whole number from 0 to 99.",
];
for (const message of validations) known.set(message, message);
const internal =
  /https?:\/\/|(?:[a-z\d-]+\.)+(?:com|co|net|org|io|dev)(?:\b|\/)|\b(?:supabase|cloudflare|postgres|postgrest|PGRST\w*|RLS|RPC|SQL|JWT|schema|migration|gateway|endpoint|stack trace|payload|service.role|capabilities?|lease|revision|request ID|server|backend|native build)\b|(?:[A-Z]:\\)|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/i;

export function isConnectionFailure(error: unknown) {
  const item = error as { name?: string; message?: string } | null;
  return (
    /AbortError|TimeoutError/.test(item?.name || "") ||
    /network|fetch failed|failed to fetch|UnknownHost|unable to resolve|timed? out|connection|offline/i.test(
      item?.message || "",
    )
  );
}
export function userErrorMessage(
  error: unknown,
  context: FeedbackContext = "load",
): string {
  const item = error as {
    message?: unknown;
    name?: string;
    status?: number;
    code?: string;
  } | null;
  const text =
    typeof error === "string"
      ? error
      : typeof item?.message === "string"
        ? item.message
        : "";
  if (known.has(text)) return known.get(text)!;
  if (/self.review|self.approv|own (?:submission|work)/i.test(text))
    return "Someone else must review your work. Contact your Office Head if a reviewer needs to be assigned.";
  if (
    /^Choose up to (?:[1-9]|10) files\.$/.test(text) ||
    /^Each file must be (?:[1-9]|[12][0-9]) MB or smaller\.$/.test(text)
  )
    return text;
  if (/camera.*(?:access|permission)|(?:access|permission).*camera/i.test(text))
    return "Allow camera access in device settings, or choose a file instead.";
  if (item?.name === "AccountSignInError") {
    if (item.status === 401 || item.status === 423)
      return feedback.invalidCredentials;
    if (item.status === 403)
      return "Please confirm your email or contact your Office support team for help signing in.";
    if (item.status === 429)
      return "Please wait a moment before trying to sign in again.";
  }
  if (/account is inactive/i.test(text))
    return "This account is inactive. Contact your Office support team for help.";
  if (error instanceof PublicMessageError && !internal.test(text)) return text;
  if (
    /AbortError|TimeoutError/.test(item?.name || "") ||
    /timed? out/i.test(text)
  )
    return context === "action" ? feedback.action : feedback.timeout;
  if (isConnectionFailure(error))
    return context === "action" ? feedback.action : feedback.connection;
  if (
    item?.status === 401 ||
    /sign in again|session (?:changed|expired)/i.test(text)
  )
    return feedback.session;
  if (
    item?.status === 403 ||
    item?.code === "42501" ||
    /permission denied|not authorized|access denied|current .*access is required/i.test(
      text,
    )
  )
    return feedback.access;
  if (
    /revision changed|stale|version changed|item.*changed|no longer editable/i.test(
      text,
    )
  )
    return feedback.changed;
  // Literal copy supplied by native screens is reviewed separately. All Error /
  // provider objects fail closed to static copy, even if they contain a message.
  if (
    typeof error === "string" &&
    text &&
    text.length <= 400 &&
    !internal.test(text)
  )
    return text;
  return feedback[context];
}
