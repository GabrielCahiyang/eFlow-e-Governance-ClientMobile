// Type declarations extracted from the web presentation module.

import type { WorkspaceAction } from '../../../components/ui/workspace/ActionMenu';
import type { NodeWorkAction, RootWorkAction, WorkHierarchyAction, WorkTreeSnapshot } from '../types';
import type { WorkHierarchyRow } from './WorkNodePresentation';
export interface WorkHierarchyProps {
    snapshot: WorkTreeSnapshot;
    readOnly: boolean;
    executionBlocked: boolean;
    authorityFresh: boolean;
    focusedNodeId?: string;
    collapsedIds: Set<string>;
    onCollapsedIdsChange: (next: Set<string>) => void;
    onOpenNode: (nodeId: string) => void;
    onRequestAction: (action: WorkHierarchyAction, nodeId?: string) => void;
    officeReviewAvailable?: boolean;
    /** Display descendants of this canonical parent using the complete snapshot. */
    branchParentId?: string;
    branchActions?: boolean;
    presentation?: 'standard' | 'project-table';
}