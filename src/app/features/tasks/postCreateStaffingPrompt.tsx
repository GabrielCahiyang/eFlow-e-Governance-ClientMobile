import { View } from "react-native";
import Users from "lucide-react-native/icons/users";
import X from "lucide-react-native/icons/x";
import { Button, Notice, Sheet } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { isProjectLeadSubtaskPlanningBlocked, taskStaffingCapability } from "./workPermissions";
import {
  selectNodeWorkCapability,
  selectRootWorkCapability,
} from "../../../core/web/app/features/nested-work/selectors/capabilities";
import { eligibleWorkPeople } from "../../../core/web/app/features/nested-work/selectors/people";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import type {
  WorkCapabilityContext,
  WorkNode,
  WorkTreeSnapshot,
} from "../../../core/web/app/features/nested-work/types";

export type PostCreateStaffingTarget =
  | {
      kind: "task";
      title: string;
      tree: WorkTreeSnapshot;
      command: "root_lead" | "contributors";
    }
  | {
      kind: "subtask";
      title: string;
      tree: WorkTreeSnapshot;
      node: WorkNode;
    };

function createWorkContext(
  tree: WorkTreeSnapshot,
  actorId: string,
): WorkCapabilityContext {
  return {
    actorId,
    rootId: tree.root.id,
    projectId: tree.root.project,
    officeId: tree.root.office,
    kind: tree.root.kind,
    revision: tree.revision,
    readOnly: false,
  };
}

/**
 * Fetches the authoritative work tree after creating a task and returns a
 * staffing target only when current server capabilities allow team setup.
 */
export async function resolvePostCreateTaskStaffing({
  taskId,
  title,
  actorId,
  readOnly = false,
}: {
  taskId: string;
  title: string;
  actorId?: string | null;
  readOnly?: boolean;
}): Promise<PostCreateStaffingTarget | undefined> {
  if (!taskId || !actorId || readOnly) return undefined;
  let tree: WorkTreeSnapshot;
  try {
    tree = await fetchWorkTree(taskId);
  } catch {
    return undefined;
  }
  if (tree.root.id !== taskId || !tree.root.open) return undefined;
  const context = createWorkContext(tree, actorId);
  if (!taskStaffingCapability(tree, context).allowed) return undefined;
  const mayAppoint = selectRootWorkCapability(
    tree,
    "appoint_lead",
    context,
  ).allowed;
  const mayManage =
    !!tree.root.lead &&
    selectRootWorkCapability(tree, "manage_contributors", context).allowed;
  if ((!mayAppoint && !mayManage) || !eligibleWorkPeople(tree.people).length) {
    return undefined;
  }
  return {
    kind: "task",
    title,
    tree,
    command: mayAppoint ? "root_lead" : "contributors",
  };
}

/**
 * Evaluates authoritative server capabilities on a newly created subtask so
 * post-create staffing only appears when the actor can staff that branch.
 */
export function resolvePostCreateSubtaskStaffing({
  tree,
  node,
  actorId,
  actorRole,
  projectStatus,
  projectLeadId,
  readOnly = false,
}: {
  tree: WorkTreeSnapshot;
  node: WorkNode;
  actorId?: string | null;
  actorRole?: string | null;
  projectStatus?: string;
  projectLeadId?: string;
  readOnly?: boolean;
}): PostCreateStaffingTarget | undefined {
  if (!actorId || readOnly || !tree.root.open) return undefined;
  if (
    isProjectLeadSubtaskPlanningBlocked(tree, actorId, {
      projectStatus,
      projectLeadId,
      actorRole,
    })
  ) {
    return undefined;
  }
  const context = createWorkContext(tree, actorId);
  const mayAppoint = selectNodeWorkCapability(
    tree,
    node.id,
    "appoint_lead",
    context,
  ).allowed;
  const mayManage = selectNodeWorkCapability(
    tree,
    node.id,
    "manage_contributors",
    context,
  ).allowed;
  if ((!mayAppoint && !mayManage) || !eligibleWorkPeople(tree.people).length) {
    return undefined;
  }
  return {
    kind: "subtask",
    title: node.title,
    tree,
    node,
  };
}

/**
 * Shared post-create staffing prompt content rendered inside an open Sheet
 * modal host for instant zero-flicker handoff to team assignment.
 */
export function PostCreateStaffingPromptSheet({
  kind,
  title,
  onChoosePeople,
  onClose,
}: {
  kind: "task" | "subtask";
  title: string;
  onChoosePeople: () => void;
  onClose: () => void;
}) {
  const palette = useTheme();
  const isTask = kind === "task";
  return (
    <Sheet
      open
      title={
        isTask
          ? "Choose people for this task?"
          : "Choose people for this subtask?"
      }
      description={title}
      onClose={onClose}
      footer={
        <View style={{ gap: 10 }}>
          <Button
            icon={<Users size={16} color={palette.onPrimary} />}
            style={{ width: "100%" }}
            onPress={onChoosePeople}
          >
            Choose people
          </Button>
          <Button
            variant="outline"
            icon={<X size={16} color={palette.primary} />}
            style={{ width: "100%" }}
            onPress={onClose}
          >
            Leave unassigned
          </Button>
        </View>
      }
    >
      <Notice>
        {isTask
          ? "Created without a Task Lead or contributors. Choose the team now, or leave this task unassigned for later."
          : "Created without an Appointed Lead or contributors. Choose the team now, or leave this subtask unassigned for later."}
      </Notice>
    </Sheet>
  );
}
