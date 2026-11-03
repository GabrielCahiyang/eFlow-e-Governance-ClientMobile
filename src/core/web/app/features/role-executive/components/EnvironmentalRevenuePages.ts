// Type declarations extracted from the web presentation module.

interface PermitCard {
    id: string;
    permit: string;
    agency: string;
    status: string;
    daysInStage: number;
    sla: number;
    assignee: string;
    escalated: boolean;
}