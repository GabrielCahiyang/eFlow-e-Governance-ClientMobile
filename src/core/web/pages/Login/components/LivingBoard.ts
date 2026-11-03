// Type declarations extracted from the web presentation module.
import type {PanInfo} from "motion/react";
type ColumnId = "todo" | "in_progress" | "done";
interface KanbanCard {
    id: string;
    title: string;
    columnId: ColumnId;
    progress: number;
    avatars: string[];
    statusLabel: string;
    statusColor: string;
    borderColor: string;
}