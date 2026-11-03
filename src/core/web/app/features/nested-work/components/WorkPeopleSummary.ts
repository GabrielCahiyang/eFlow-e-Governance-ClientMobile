// Type declarations extracted from the web presentation module.

import type { WorkPerson } from '../types';
export interface WorkPeopleSummaryProps {
    leadId: string | null;
    contributorIds: readonly string[];
    people: readonly WorkPerson[];
    compact?: boolean;
    /** Table cells reuse the same historical name/contributor composition. */
    part?: 'lead' | 'contributors';
}