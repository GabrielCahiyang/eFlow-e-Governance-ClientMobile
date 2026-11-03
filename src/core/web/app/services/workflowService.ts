// ─── Workflow Template Service ───────────────────────────────────
// Hardcoded constants — no Firebase/Supabase dependency.

export interface WorkflowStatus {
  id: string;
  label: string;
  color: string;
  textColor: string;
  order: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  statuses: WorkflowStatus[];
}

const DEFAULT_STATUSES: WorkflowStatus[] = [
  { id: 'pending_assignment', label: 'Pending Assignment', color: 'bg-gray-200', textColor: 'text-gray-800', order: 0 },
  { id: 'todo', label: 'To Do', color: 'bg-blue-200', textColor: 'text-blue-800', order: 1 },
  { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-200', textColor: 'text-yellow-800', order: 2 },
  { id: 'for_review', label: 'For Review', color: 'bg-purple-200', textColor: 'text-purple-800', order: 3 },
  { id: 'completed', label: 'Completed', color: 'bg-green-200', textColor: 'text-green-800', order: 4 },
];

export const DEFAULT_TEMPLATE: WorkflowTemplate = {
  id: 'default',
  name: 'Standard LGU Workflow',
  statuses: DEFAULT_STATUSES,
};

export async function seedWorkflowTemplateIfEmpty(): Promise<void> {
  // No-op: statuses are hardcoded constants
}

export function subscribeToWorkflowTemplate(
  _templateId: string,
  callback: (template: WorkflowTemplate) => void,
): () => void {
  setTimeout(() => callback(DEFAULT_TEMPLATE), 0);
  return () => {};
}

export async function getWorkflowTemplate(_templateId: string): Promise<WorkflowTemplate> {
  return DEFAULT_TEMPLATE;
}

export function getDefaultStatuses(): WorkflowStatus[] {
  return DEFAULT_STATUSES;
}
