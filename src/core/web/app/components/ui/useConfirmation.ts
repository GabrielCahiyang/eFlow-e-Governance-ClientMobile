// Type declarations extracted from the web presentation module.
import type {ReactNode} from "react";
export interface ConfirmationOptions {
    title: string;
    description: string;
    actionLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    impact?: ReactNode;
    blockers?: string[];
    /** Opt in only when a feature's mutation risk requires it. */
    confirmationText?: string;
    reason?: {
        label: string;
        onAccept: (reason: string) => void;
    };
}