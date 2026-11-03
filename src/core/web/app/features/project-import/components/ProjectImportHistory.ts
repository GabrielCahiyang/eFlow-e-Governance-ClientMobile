// Type declarations extracted from the web presentation module.

import type { ProjectImportDraft, ProjectImportResult } from '../types';
interface ImportReceipt {
    id: string;
    created_at: string;
    review: ProjectImportDraft & {
        sourceName?: string;
    };
    result: ProjectImportResult;
}