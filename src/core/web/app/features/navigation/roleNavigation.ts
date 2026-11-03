// Type declarations extracted from the web presentation module.

import type { ReactNode } from "react";
export interface RoleNavItem {
    id: string;
    icon: ReactNode;
    label: string;
    requiresLeadership?: boolean;
    requiresHead?: boolean;
}
export interface RoleNavigation {
    navItems: RoleNavItem[];
    defaultSection: string;
    defaultPages?: Record<string, string>;
}