// Type declarations extracted from the web presentation module.

import type { Employee } from "../../members";
import type { Task } from "../../tasks";
import type { ContributionWorkflowFacts, MonthlyContributionRow } from "../types";
interface MonthlyLeaderboardProps {
    employees: Employee[];
    tasks: Task[];
    facts: ContributionWorkflowFacts;
    currentUserId?: string;
    allowDepartmentFilter?: boolean;
}