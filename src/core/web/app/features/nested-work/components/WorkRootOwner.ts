// Type declarations extracted from the web presentation module.
import type {ReactNode} from 'react';
import type { WorkTreeController } from '../types';
export interface WorkRootOwnerProps {
    rootId: string;
    controller?: WorkTreeController;
    fallback?: ReactNode;
    readOnly?: boolean;
}