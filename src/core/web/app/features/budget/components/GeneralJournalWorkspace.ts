// Type declarations extracted from the web presentation module.

interface JournalWorkspaceProps {
    orgId?: string;
    fiscalYear?: number;
    fiscalBudgetId?: string;
    approvedBudget?: number;
    settledExpenses?: number;
    returnedCash?: number;
    availableBudget?: number;
    journal?: ReturnType<typeof useGeneralJournal>;
}