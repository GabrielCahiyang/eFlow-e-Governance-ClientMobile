// Type declarations extracted from the web presentation module.
import type {ReactNode} from 'react';
import type {WorkTreeController} from '../../../nested-work';
import type { Employee } from '../../../../services/employeeService';
import type { Task } from '../../../../services/taskService';
interface Props {
    task: Task;
    employees: Employee[];
    readOnly: boolean;
}
export interface LegacyEditorStaffingScope {
    rootId: string;
    actorId: string;
    code: 'PGRST202';
}