// Type declarations extracted from the web presentation module.
import type {ReactNode} from 'react';
import type {WorkEdit} from './WorkTreeEditor';
import type { WorkNode, WorkRequest, WorkTreeSnapshot, WorkTreeController } from '../types';
import type { WorkHierarchyAction } from '../types';
export interface WorkTreeProps {
    rootId: string;
    branchParentId?: string;
    branchActions?: boolean;
    presentation?: 'standard' | 'project-table';
    controller?: WorkTreeController;
    fallback?: ReactNode;
    readOnly?: boolean;
    executionBlocked?: boolean;
    createRequest?: number;
    createFocusTarget?: HTMLElement;
    collapsedIds?: Set<string>;
    onCollapsedIdsChange?: (next: Set<string>) => void;
    focusedNodeId?: string;
    onOpenOfficeNode?: (node: WorkNode, tree: WorkTreeSnapshot) => void;
    onReviewOfficeNode?: (node: WorkNode, tree: WorkTreeSnapshot) => void;
}