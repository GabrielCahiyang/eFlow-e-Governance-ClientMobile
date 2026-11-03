// Type declarations extracted from the web presentation module.
import type {SubtaskReviewItem} from '../../subtasks';
/** Caller supplies only already-authorized context; this view discovers no authority. */
export interface SubitemReviewContext {
    taskId: string;
    subtaskId: string;
    rootTitle: string;
    path: readonly {
        id: string;
        title: string;
    }[];
    parentTitle?: string;
    incomplete?: boolean;
    currentReviewerName?: string | null;
}
export interface SubitemReviewDetailProps {
    item: SubtaskReviewItem;
    context?: SubitemReviewContext;
    currentReviewerName?: string;
    feedback: string;
    pending: boolean;
    readOnly: boolean;
    /** A retained draft is not fresh permission to read its old evidence. */
    evidenceAvailable?: boolean;
    onFeedbackChange: (value: string) => void;
    onApprove: () => void;
    onRequestChanges: () => void;
}