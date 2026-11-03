// Type declarations extracted from the web presentation module.
import type {QuickLoginAccount} from "../../app/shared/quickLoginAccounts";
export interface UsageScenariosModalProps {
    show: boolean;
    onClose: () => void;
    onSelectAccount: (account: QuickLoginAccount) => void;
}