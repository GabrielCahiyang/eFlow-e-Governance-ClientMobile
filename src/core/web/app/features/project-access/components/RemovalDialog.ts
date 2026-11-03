// Type declarations extracted from the web presentation module.

import type { RemovalImpact } from '../types';
type RemovalProps = {
    project: string;
    user: string;
    office?: string | null;
    name: string;
    onClose: () => void;
    onRemoved: () => void | Promise<void>;
};