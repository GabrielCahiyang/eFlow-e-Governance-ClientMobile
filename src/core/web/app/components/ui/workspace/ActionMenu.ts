// Type declarations extracted from the web presentation module.
import type {ReactElement} from "react";
import type {ReactNode} from "react";
export interface WorkspaceAction {
    id: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
    disabledReason?: string;
    variant?: "default" | "destructive";
    onSelect: () => void;
}