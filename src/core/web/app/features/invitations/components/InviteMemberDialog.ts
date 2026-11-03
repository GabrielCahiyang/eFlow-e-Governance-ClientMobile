// Type declarations extracted from the web presentation module.

import type { InvitedRole } from '../types';
type Row = {
    id: string;
    email: string;
    account_role: InvitedRole;
    file?: File;
};