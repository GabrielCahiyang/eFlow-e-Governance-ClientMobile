// Type declarations extracted from the web presentation module.

import type { Task } from "../../../services/taskService";
import type { Employee } from "../../../services/employeeService";
type DelinquentLeader = {
    id: string;
    name: string;
    role: string;
    advance: number;
    purpose: string;
    issued: string;
    daysOld: number;
    linkedProject: string;
    suspended: boolean;
};