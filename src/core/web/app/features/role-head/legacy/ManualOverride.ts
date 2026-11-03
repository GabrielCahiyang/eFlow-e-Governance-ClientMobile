// Type declarations extracted from the web presentation module.
import type {FieldWorker} from "./OptimalDistributionMatrix";
import type { Task } from "../../../services/taskService";
import type { Employee } from "../../../services/employeeService";
type ColumnTask = {
    id: string;
    title: string;
    site: string;
    workers: FieldWorker[];
};