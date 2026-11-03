// Type declarations extracted from the web presentation module.

// ─── Department Capacity & Load ──────────────────────────────────
interface DeptCapacityItem {
    id: string;
    name: string;
    staff: number;
    activeTasks: number;
    loadPercent: number;
    status: "available" | "balanced" | "overloaded" | "unstaffed" | "details_needed";
}