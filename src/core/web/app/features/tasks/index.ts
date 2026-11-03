
export {subscribeToProgressUpdates,type ProgressUpdate} from '../../services/taskDiscussionService';

// Compatibility bridge: new consumers import task behavior from this feature.
export * from "./services/taskService";

export * from "./selectors";

export {
  calculateDeadlineWorkload,
  taskDurationHours,
  workingHoursBetween,
  workloadDeadline,
  HOURS_PER_TASK_DAY,
  taskEstimateError,
} from "./selectors/deadlineWorkload";

export type {
  DeadlineWorkload,
  WorkloadLevel,
} from "./selectors/deadlineWorkload";

export {
  deadlineInputParts,
  deadlineFromInputs,
  isValidCalendarDeadline,
} from "./selectors/deadlineInput";

export { withEmployeeDeadlineWorkload } from "./selectors/employeeDeadlineWorkload";

export {
  resolveTaskDetailCapabilities,
  resolveSubtaskManagementCapability,
} from "./components/taskDetailAccess";

export { cancelTask } from "./services/taskLifecycleService";

export { getTaskStatusPresentation } from "./presentation/taskStatusPresentation";

export type {
  TaskStatusPresentation,
  TaskStatusPresentationState,
} from "./presentation/taskStatusPresentation";

export { runTaskMaintenance } from "./services/taskMaintenanceService";

export {
  createTaskTemplate,
  deleteTaskTemplate,
  fetchTaskTemplates,
  setTaskTemplateActive,
} from "./services/taskTemplateService";

export type {
  RecurrenceFrequency,
  RecurrenceRule,
  TaskTemplate,
  TaskTemplateInput,
} from "./types";

export { notifyTaskListeners } from "./services/taskRealtimeService";


export {rowToTask} from './services/taskMapper';


export { fetchTaskById } from "./services/taskRealtimeService";

export { pendingTaskDependencies } from './selectors/dependencyReadiness';