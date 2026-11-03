// Type declarations extracted from the web presentation module.

import type { WorkCapabilityContext, WorkRequest, WorkTreeSnapshot, WorkTreeController } from '../types';
/** Narrow compatibility input for historical standalone callers.
 * The existing owner supplies its own snapshot/save/loading and current identity.
 * This dialog never creates another tree owner or starts a poller.
 */
export interface WorkStaffingController {
    rootId: string;
    actorId: string | null;
    data: WorkTreeSnapshot;
    loading: boolean;
    verificationFailed?: boolean;
    save: (request: WorkRequest) => Promise<WorkTreeSnapshot>;
}
export interface WorkStaffingDialogProps {
    controller: WorkTreeController | WorkStaffingController;
    nodeId: string | null;
    readOnly?: boolean;
    executionBlocked?: boolean;
    contributorsOnly?: boolean;
    preselectedLeadId?: string;
    onClose: () => void;
    onChanged: (receipt: WorkTreeSnapshot) => void | Promise<void>;
}