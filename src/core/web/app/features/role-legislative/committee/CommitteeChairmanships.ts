// Type declarations extracted from the web presentation module.

interface CommitteeCard {
    id: string;
    name: string;
    chair: string;
    chairInitials: string;
    activeMeasures: number;
    avgDays: number;
    status: "Healthy" | "At Risk" | "Overdue";
    overdueMeasures: number;
    nextHearing?: string;
}