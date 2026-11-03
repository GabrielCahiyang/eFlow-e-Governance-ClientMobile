// Type declarations extracted from the web presentation module.

import type { Employee } from "../../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type { CreateTaskPayload, Task, TaskAssignmentDetails, TaskStatus, UpdateTaskPayload, } from "../../../../services/taskService";
export type BoardView = "list" | "kanban" | "timeline" | "activity" | "hierarchy" | "calendar" | "workload" | "dependencies" | "my_work" | "due_soon" | "overdue" | "for_review" | "completed";
export type BoardFilterView = "my_work" | "due_soon" | "overdue" | "for_review" | "completed";
/** The record scope controls archived records; the status filter controls lifecycle state. */
export type TaskRecordScope = "active" | "archived";
export type TaskStatusFilter = "all" | "active" | TaskStatus;
export interface MondayBoardProps {
    tasks: Task[];
    loading?: boolean;
    projects?: Array<{
        id: string;
        title: string;
    }>;
    selectedProjectId?: string;
    onSelectProject?: (projectId: string) => void;
    employees?: Employee[];
    allEmployees?: Employee[];
    employeeNotes?: EmployeeNotesMap;
    role: "head" | "member";
    departmentFilter?: string;
    currentUserId?: string;
    currentUserName?: string;
    onAssign?: (taskId: string, assigneeId: string, assigneeName: string, assignment?: TaskAssignmentDetails) => void;
    onExecute?: (taskId: string) => void;
    onSubmit?: (taskId: string, submission: TaskSubmissionDraft) => void;
    onVerify?: (taskId: string, approve: boolean, feedback?: string) => void;
    onCreateTask?: (titleOrPayload: string | CreateTaskPayload, description?: string, deadline?: string) => void;
    onUpdateTask?: (taskId: string, payload: UpdateTaskPayload) => Promise<void> | void;
    onDeleteTask?: (taskId: string) => Promise<void> | void;
}
export interface TaskEditorDraft {
    estimatedHours?: number;
    title: string;
    description: string;
    deadline: string;
    priority: "low" | "medium" | "high";
    tagsText: string;
    proposalTitle: string;
    programTitle: string;
    projectTitle: string;
    activityTitle: string;
    activitySchedule: string;
    teamMemberIds: string[];
    leadMemberId: string | null;
    reviewerId: string | null;
    backupReviewerId: string | null;
    acceptanceCriteriaText: string;
    definitionOfDone: string;
    dependencyIds: string[];
}
export type TaskSubmissionDraft = {
    note: string;
    attachments: File[];
};
export type HierarchyDisplay = {
    proposalTitle: string;
    programTitle: string;
    projectTitle: string;
    activityTitle: string;
    activitySchedule?: string;
    path: string;
};
export interface TaskProjectOption {
    value: string;
    label: string;
    count: number;
}