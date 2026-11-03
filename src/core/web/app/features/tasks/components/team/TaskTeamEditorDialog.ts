// Type declarations extracted from the web presentation module.
import type {WorkTreeController} from '../../../nested-work';
import type { UserProfile } from "../../../../types";
import type { Subtask } from "../../../../services/subtaskService";
import type { Task } from "../../taskTypes";
interface TaskTeamEditorDialogProps {
    task: Task | null;
    profiles: UserProfile[];
    subtasks: Subtask[];
    responsibleOrgId?: string;
    onClose: () => void;
    readOnly?: boolean;
    controller?: WorkTreeController;
}
interface TeamCandidate {
    id: string;
    name: string;
    role: string;
    organization: string;
    canBeAdded: boolean;
}