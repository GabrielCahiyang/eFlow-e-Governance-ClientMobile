// Type declarations extracted from the web presentation module.
import type {WorkTreeController} from '../../nested-work';
import type { Task } from '../../tasks';
import type { TaskInspectorOrigin } from '../../task-inspector';
import type { Subtask } from '../../../services/subtaskService';
export interface SubitemInspectorProps {
    rootTask: Task;
    itemId: string;
    controller?: WorkTreeController;
    readOnly?: boolean;
    executionBlocked?: boolean;
    canManageDeadline?: boolean;
    currentReviewerId?: string;
    prerequisite?: Subtask | null;
    origin?: TaskInspectorOrigin;
    onClose: () => void;
    onChanged?: () => void;
    onReviewItem?: (id: string) => void;
    initialSection?: 'work' | 'activity' | 'review';
}