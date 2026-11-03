// Type declarations extracted from the web presentation module.
import type {AccountingWorkspaceView} from "../accountingNavigation";
type AccountingWorkspaceProps = {
    view: AccountingWorkspaceView;
    onNavigate?: (section: string, page: string) => void;
};