// Type declarations extracted from the web presentation module.
import type {ProgressUpdate} from "../../services/taskDiscussionService";
import type {ProjectFileEvent} from '../../features/project-files';
interface SystemEvent {
    id: string;
    fromStatus?: string;
    toStatus: string;
    actorName: string;
    note?: string;
    at: number;
}
type TimelineItem = {
    kind: "system";
    at: number;
    data: SystemEvent;
} | {
    kind: "progress";
    at: number;
    data: ProgressUpdate;
} | {
    kind: "file";
    at: number;
    data: ProjectFileEvent;
};