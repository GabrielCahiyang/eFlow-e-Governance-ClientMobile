export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  tags: string[];
  acceptanceCriteria: string[];
  definitionOfDone?: string;
  orgId?: string;
  assigneeId?: string;
  reviewerId?: string;
  recurrenceRule: RecurrenceRule;
  nextRunAt: number;
  isActive: boolean;
  createdBy: string;
}

export interface TaskTemplateInput extends Omit<TaskTemplate, "id" | "createdBy"> {}
