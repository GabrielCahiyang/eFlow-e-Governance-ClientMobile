// Type declarations extracted from the web presentation module.

// ─── Shared workflow status badges & tokens ──────────────────────
// One source of truth for status → color mapping across Dept Head, Admin, and
// Employee screens, so a "for_review" task looks identical everywhere.
export type WorkflowTaskStatus = "pending_assignment" | "todo" | "in_progress" | "for_review" | "changes_requested" | "rejected" | "completed" | "cancelled" | "archived";
interface Tone {
    bg: string;
    text: string;
    border: string;
    dot: string;
    label: string;
}
// ─── Health dot (project health rollups) ─────────────────────────
export type Health = "on_track" | "at_risk" | "delayed" | "complete" | "no_data";