// Type declarations extracted from the web presentation module.

type ExtractedAction = {
    id: string;
    sourceText: string;
    author: string;
    timestamp: string;
    extractedTask: string;
    assignee: string;
    dueDate: string;
    status: "created" | "accepted" | "completed";
};