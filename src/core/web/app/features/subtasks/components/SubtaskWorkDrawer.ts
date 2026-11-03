// Type declarations extracted from the web presentation module.
import type {WorkTreeController} from '../../nested-work';
import type { TaskInspectorOrigin } from '../../task-inspector';
export type SubtaskWorkDrawerProps = Parameters<typeof LegacySubtaskWorkDrawer>[0] & {
    controller?: WorkTreeController;
    origin?: TaskInspectorOrigin;
    executionBlocked?: boolean;
    onChanged?: () => void;
    initialSection?: 'work' | 'activity' | 'review';
};