// Type declarations extracted from the web presentation module.

type DuplicationAlert = {
    id: string;
    location: string;
    similarity: number;
    teams: {
        name: string;
        lead: string;
        activity: string;
        timestamp: string;
    }[];
    estSavings: number;
    status: "flagged" | "merged" | "dismissed";
};