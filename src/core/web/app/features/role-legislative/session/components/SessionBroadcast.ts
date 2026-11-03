// Type declarations extracted from the web presentation module.

export interface BroadcastEvent {
    id: number;
    itemId: number;
    itemTitle: string;
    itemRef?: string;
    action: "broadcast" | "paused" | "resumed" | "concluded" | "suspended" | "session_resumed" | "adjourned" | "undo_adjourn";
    timestamp: string;
}
// ==================== MOCK DATA ====================
import type { AgendaItem } from "./agendaModel";