/** Public feedback only. Never interpolate a transport, database or provider error. */
export class PublicMessageError extends Error {}
export const feedback = {
  invalidCredentials: "Email or password is incorrect.",
  load: "We couldn't load this information. Please try again.",
  action:
    "We couldn't confirm your changes. Refresh this page and check before trying again.",
  connection:
    "Connection unavailable. Try again when the service is reachable.",
  timeout: "Request timed out. Please try again.",
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
    "Choose a start date within the parent schedule, or reschedule the parent first",
    "Choose a start date within the parent schedule, or reschedule the parent first.",
  ],
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
  "Choose a review decision and enter a reason for requested changes.",
  "Enter a work note of up to 3000 characters.",
  "Choose up to ten unique evidence files.",
  "Enter a purpose or reference and a valid date.",
  "Enter an amount within the available office balance.",
  "Enter a valid email.",
  "Choose an access end date.",
  "Email is required.",
  "Office name is required.",
  "Refresh the prerequisite tasks before saving.",
  "This message cannot be deleted.",
  "A reason is required to adjust a locked budget.",
  "Enter a project title.",
  "Enter a project title and description.",
  "Enter the project scope.",
  "Choose each account only once.",
  "Choose an account and enter a positive amount.",
  "Enter a reason for the funding.",
  "Add funding or choose No funding required.",
  "Project name is required.",
  "Reason for deletion is required.",
  "Refresh to verify current funding access.",
  "Choose each annual account once.",
  "Declared spending cannot exceed released cash.",
  "Enter the cash-return receipt number and date.",
  "Enter a reason before saving.",
  "Enter an amount within the unused balance.",
  "Choose accounts from the same fiscal year.",
];
for (const message of validations) known.set(message, message);
// Exact server reasons map to reviewed copy. Database details and hints stay private.
const workReasons: Record<string, string> = {
  "start work is available on the planned start date": "Start work is available on the planned start date.",
  "only the appointed subtask lead can start this subtask": "Only the appointed Subtask Lead can start this subtask.",
  "the parent task must be in progress before starting this subtask": "The Task Lead must start the parent Task first.",
  "complete earlier subtasks before starting this subtask": "Complete the earlier dependent Subtasks before starting this Subtask.",
  "choose task dates within the project schedule": "Choose Task dates within the project schedule.",
  "start the parent subtask first": "The parent Subtask must start before this Subtask can start.",
  "choose a due date between the subtask start and the parent deadline": "Choose a due date between the subtask start and the parent deadline.",
  "start or resume the task before posting progress": "The Task Lead must start or resume work before progress can be posted.",
  "start or resume the task before submitting completion": "The Task Lead must start or resume work before completion can be submitted.",
  "start the task before posting progress or submitting completion": "The Task Lead must start work before progress or completion can be submitted.",
  "only a task in to do can be started": "This task is no longer in To do. Refresh to check its current status.",
  "project is on hold": "This project is on hold. Work can continue once the project is resumed.",
  "this subtask has not started": "This subtask hasn't started yet. Wait until the parent task is underway and the planned start date has arrived.",
  "parent is unavailable in this work tree": "The parent subtask is no longer available. Reopen the task and choose a current parent.",
  "a started subtask retains its planned start date": "The planned start date can't change once the subtask has started.",
  "keep a planned start date for scheduled work": "This subtask already has a planned start date. Choose a date to continue.",
  "only the appointed task lead can start this task": "Only the appointed Task Lead can start this task.",
  "only the appointed project lead may allocate project funding": "Only the appointed Project Lead can allocate project funding.",
  "only the project lead or appointed head may allocate project funding": "Only the Project Lead or appointed Head can allocate this funding.",
  "only the appointed task lead may allocate approved funding to this subtask": "Only the appointed Task Lead can allocate approved funding to this subtask.",
  "only the current task lead can manage this subtask budget": "Only the current Task Lead can change this subtask budget.",
  "resolve the open cash request before changing this subtask budget": "Resolve the open cash request before changing this subtask budget.",
  "finished work can only return unused funding": "Finished work can only return unused funding.",
  "this subtask has no unused funding to return": "This subtask has no unused funding to return.",
  "this subtask has cash history on its original funding account": "This subtask has cash history. Keep its original funding account.",
  "this task has no approved proposal budget": "This task needs an approved budget before you can allocate funding to a subtask.",
  "this budget change was already submitted with different details": "A budget change was already submitted with different details. Refresh to see the current budget.",
  "allocation request terms changed": "This allocation was already submitted with different details. Refresh to see the current allocation.",
  "review request terms changed": "This review was already submitted with different details. Refresh to see the current decision.",
  "contributor changes must be submitted for lead review": "Submit your changes to the Lead for review.",
  "submit this subtask for the appointed task lead to review": "Submit this subtask to the appointed Task Lead for review.",
  "submit this work for the appointed lead to review": "Submit this work to the appointed Lead for review.",
  "no eligible lead can review this submission": "No eligible Lead is assigned to review this submission. Contact your Office Head.",
  "independent lead review required": "This submission needs a decision from an independent Lead.",
  "current assigned review required": "Only the currently assigned reviewer can make this decision.",
  "review access or work state changed": "The work or reviewer assignment changed. Refresh before making a decision.",
  "work changed after submission. return it for a current update": "The work changed after submission. Return it for an updated submission.",
  "choose the returned submission for this work": "Choose the returned submission for this work before resubmitting.",
  "current office workspace access required": "Switch to an Office workspace you have access to before continuing.",
  "current branch access required": "You need access to this subtask. Refresh the task or contact the Task Lead.",
  "current work scope required": "Reopen the work from its current project or workspace.",
  "current work access is required": "Reopen the work and check your current assignment before trying again.",
  "current task participation is required": "You need a current assignment on this task to make this change.",
  "current discussion access is required": "You need access to this discussion to post. Refresh the task to check your access.",
  "current project management access is required": "Only someone with current project management access can make this change.",
  "only the office head can authorize project funding": "Only the Office Head can authorize project funding.",
  "current office budget is required": "An approved Office budget is needed before you can authorize this funding.",
  "work changed. review the latest details before saving your draft": "The work changed. Review the latest details before saving your draft.",
  "the original subtask is unavailable": "The original subtask is no longer available. Refresh the task to see the current work.",
  "confirm the current work impact first": "Review and confirm the affected work before saving.",
  "evidence could not be verified": "The evidence couldn't be verified. Check that the files uploaded before submitting.",
  "evidence does not belong to this work request": "Attach the evidence to this submission before saving.",
  "a subitem with this name already exists here. use a different name": "A subtask with this name already exists here. Use a different name.",
};
const internal =
  /https?:\/\/|(?:[a-z\d-]+\.)+(?:com|co|net|org|io|dev)(?:\b|\/)|\b(?:supabase|cloudflare|postgres|postgrest|PGRST\w*|RLS|RPC|SQL|JWT|schema|migration|gateway|endpoint|stack trace|payload|service.role|capabilities?|lease|revision|request ID|server|backend|native build)\b|(?:[A-Z]:\\)|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/i;

export function isConnectionFailure(error: unknown) {
  const item = error as {
    name?: string;
    message?: string;
    status?: number;
  } | null;
  if (item?.status) return false;
  return /^(?:TypeError: )?(?:Network request failed|Failed to fetch|fetch failed|The device is offline)\.?$|UnknownHostException|unable to resolve host|\b(?:ENOTFOUND|ECONNREFUSED)\b|NetworkError when attempting to fetch/i.test(
    item?.message || "",
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
  const reason = text.trim().replace(/\.$/, "").toLowerCase();
  if (Object.hasOwn(workReasons, reason)) return workReasons[reason];
  const available = /^Only ((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?) is available to protect on this budget line\.?$/i.exec(text);
  if (available) return `Only ₱${available[1]} is available on this budget line. Enter a smaller amount or choose another account.`;
  if (/self.review|self.approv|own (?:submission|work)/i.test(text))
    return "Someone else must review your work. Contact your Office Head if a reviewer needs to be assigned.";
  if (
    /^Choose up to (?:[1-9]|10) files\.$/.test(text) ||
    /^Each file must be (?:[1-9]|[12][0-9]) MB or smaller\.$/.test(text) ||
    /^Choose (?:a PDF|an image) (?:up to|smaller than) (?:10|20) MB\.$/.test(text)
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
    item?.status === 401 ||
    item?.code === "PGRST301" ||
    /sign in again|session (?:changed|expired)/i.test(text)
  )
    return feedback.session;
  if (item?.code === "40001" || /revision changed|stale|version changed|item.*changed|no longer editable/i.test(text))
    return feedback.changed;
  if (
    item?.status === 403 ||
    item?.code === "42501" ||
    /permission denied|not authorized|access denied/i.test(text)
  )
    return feedback.access;
  if (item?.status === 404 || item?.code === "PGRST116")
    return feedback.unavailable;
  if (
    item?.status === 408 ||
    /TimeoutError/.test(item?.name || "") ||
    (!item?.status && /timed? out/i.test(text))
  )
    return context === "action"
      ? "The request timed out. Check whether your changes were saved before trying again."
      : feedback.timeout;
  if (isConnectionFailure(error))
    return context === "action"
      ? "The connection was lost. Reconnect and check whether your changes were saved before trying again."
      : feedback.connection;
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
