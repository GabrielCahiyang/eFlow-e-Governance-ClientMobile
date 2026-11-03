// Type declarations extracted from the web presentation module.

import type { Employee } from "../../../services/employeeService";
import type { Task } from "../../../services/taskService";
export type Project = {
    id: string;
    name: string;
    code: string;
    lead: string;
    timePct: number;
    tasksPct: number;
    budgetPct: number;
    totalBudget: number;
    health: "green" | "yellow" | "red";
    bottleneck?: string;
    bottleneckAge?: number;
    bpaNode?: string;
    nextMilestone: string;
    deadline: string;
    burnSpark: number[];
    status: "In Progress" | "Blocked" | "Planning" | "Closing";
    barangay: string;
    mapX: number;
    mapY: number;
};
export type BoardView = "table" | "gantt" | "resource" | "kanban" | "map" | "calendar";