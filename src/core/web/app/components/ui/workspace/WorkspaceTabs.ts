// Type declarations extracted from the web presentation module.

import type { ReactNode } from "react";
export interface WorkspaceTab {
    id: string;
    label: string;
    content: ReactNode;
    disabled?: boolean;
}