import { useEffect, useState } from "react";
import { SheetModalHost } from "../../components/ui";
import { WorkEditorSheet } from "./WorkEditorSheet";
import {
  PostCreateStaffingPromptSheet,
  type PostCreateStaffingTarget,
} from "./postCreateStaffingPrompt";

export {
  PostCreateStaffingPromptSheet,
  resolvePostCreateSubtaskStaffing,
  resolvePostCreateTaskStaffing,
  type PostCreateStaffingTarget,
} from "./postCreateStaffingPrompt";

/**
 * Two-step staffing handoff shown right after creating a task or subtask,
 * offering immediate team setup or leaving the item unassigned for later
 * inside a single shared modal host for zero-delay transitions.
 */
export function PostCreateStaffingSheet({
  target,
  projectStatus,
  projectLeadId,
  readOnly = false,
  onClose,
  onSaved,
}: {
  target: PostCreateStaffingTarget;
  projectStatus?: string;
  projectLeadId?: string;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (receipt: PostCreateStaffingTarget["tree"]) => Promise<unknown>;
}) {
  const targetId = target.kind === "task" ? target.tree.root.id : target.node.id;
  const targetKey = `${target.kind}:${targetId}`;
  const [openingEditor, setOpeningEditor] = useState(false);

  useEffect(() => {
    setOpeningEditor(false);
  }, [targetKey]);

  return (
    <SheetModalHost open onClose={onClose}>
      {openingEditor ? (
        <WorkEditorSheet
          key={`post-create:${targetKey}`}
          data={target.tree}
          edit={
            target.kind === "task"
              ? { command: target.command, root: true }
              : { command: "staff", node: target.node }
          }
          projectStatus={projectStatus}
          projectLeadId={projectLeadId}
          readOnly={readOnly}
          skipRecovery
          onClose={onClose}
          onSaved={async (receipt) => {
            await onSaved(receipt);
          }}
        />
      ) : (
        <PostCreateStaffingPromptSheet
          kind={target.kind}
          title={target.title}
          onChoosePeople={() => setOpeningEditor(true)}
          onClose={onClose}
        />
      )}
    </SheetModalHost>
  );
}
