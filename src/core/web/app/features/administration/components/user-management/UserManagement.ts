// Type declarations extracted from the web presentation module.
import type {Dispatch} from "react";
import type {SetStateAction} from "react";
import type {UserDirectoryFilters} from '../../selectors/userDirectory';
import type { DataTableViewState } from '../../../../components/ui/DataTable';
export interface AccountDirectoryNavigation {
    actorId: string;
    selectedUserId: string;
    returnAccountId?: string;
    fromDirectory: boolean;
    returnFocus: boolean;
    filters: UserDirectoryFilters;
    table: DataTableViewState;
}
export type UserManagementTab = "users" | "role-defaults" | "user-access" | "locked-accounts";