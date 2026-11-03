// Type declarations extracted from the web presentation module.
import type {ProgressUpdate} from "../../../services/taskDiscussionService";
import type {CashReviewFocus} from "../../budget";
import type {ReviewKind} from "./ReviewKindSwitch";
import type {NotificationNavigationIntent} from "../../notifications";
import type { Task } from "../../../services/taskService";
export type ReviewInboxScope = "department" | "leading";
export interface ForReviewInboxProps {
    scope?: ReviewInboxScope;
}