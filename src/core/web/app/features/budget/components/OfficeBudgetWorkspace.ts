// Type declarations extracted from the web presentation module.
import type {BudgetView as Tab} from '../budgetViews';
type BudgetOwner = {
    budget: ReturnType<typeof useDepartmentBudget>;
    journal: ReturnType<typeof useGeneralJournal>;
};
type OfficeBudgetProps = {
    fiscalYear?: number;
    embedded?: boolean;
    dataOwner?: BudgetOwner;
};
type BudgetContentProps = BudgetOwner & {
    orgId: string;
    fiscalYear: number;
    embedded: boolean;
    tab: Tab;
    setTab: (tab: Tab) => void;
    setFiscalYear: (year: number) => void;
};