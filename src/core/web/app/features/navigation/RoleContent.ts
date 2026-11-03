// Type declarations extracted from the web presentation module.
import type {ReactNode} from "react";
interface RoleContentProps {
    role: string;
    activeSection: string;
    activePage?: string;
    hasLeadingWork?: boolean;
    leadershipLoading?: boolean;
    onNavigate?: (section: string, page: string, projectId?: string) => void;
}