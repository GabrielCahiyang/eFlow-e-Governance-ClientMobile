// Type declarations extracted from the web presentation module.

interface InfraTask {
    id: string;
    task: string;
    assignee: string;
    initials: string;
    status: string;
    budget: string;
    budgetPct: number;
    sealed: boolean;
    dependency?: string;
}