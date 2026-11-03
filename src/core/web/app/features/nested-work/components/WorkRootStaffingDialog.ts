// Type declarations extracted from the web presentation module.

import type { WorkTreeSnapshot, WorkTreeController } from '../types';
interface Props {
    rootId: string;
    controller?: WorkTreeController;
    readOnly?: boolean;
    contributorsOnly?: boolean;
    preselectedLeadId?: string;
    onClose: () => void;
    onChanged?: (receipt: WorkTreeSnapshot) => void | Promise<void>;
}