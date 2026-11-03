// Type declarations extracted from the web presentation module.

type BriefingItem = {
    id: string;
    priority: "good" | "normal" | "critical";
    headline: string;
    detail: string;
    sourceCount: number;
};