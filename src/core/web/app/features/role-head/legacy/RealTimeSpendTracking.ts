// Type declarations extracted from the web presentation module.

import type { Task } from "../../../services/taskService";
import type { Employee } from "../../../services/employeeService";
type BurndownProgram = {
    id: string;
    name: string;
    allocated: number;
    ideal: number[]; // ideal remaining by month (0..12)
    actual: number[]; // actual remaining by month (0..current)
    currentMonth: number;
    tone: "ok" | "warn" | "bad";
};