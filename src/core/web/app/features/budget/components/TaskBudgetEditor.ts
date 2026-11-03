// Type declarations extracted from the web presentation module.

import type { ReactNode } from "react";
import type { BudgetLineInput, BudgetSection, TaskBudgetDecision } from "../types";
export interface TaskBudgetValue {
    decision: TaskBudgetDecision;
    noCostReason?: string;
    lines: BudgetLineInput[];
}