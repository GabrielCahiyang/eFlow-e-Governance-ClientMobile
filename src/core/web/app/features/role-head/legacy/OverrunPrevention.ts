// Type declarations extracted from the web presentation module.

import type { Task } from "../../../services/taskService";
import type { Employee } from "../../../services/employeeService";
type PendingRequest = {
    id: string;
    title: string;
    requester: string;
    site: string;
    amount: number;
    category: string;
};