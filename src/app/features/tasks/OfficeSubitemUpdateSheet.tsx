import { useRef, useState } from "react";
import {
  Button,
  Choice,
  ErrorState,
  Field,
  Notice,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { saveSubtaskWorkUpdate } from "../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { selectNodeWorkCapability } from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { workScope } from "./branchInspector";

export function OfficeSubitemUpdateSheet({
  tree,
  readOnly,
  nodeId,
  actorId,
  onClose,
  onSaved,
}: {
  tree: WorkTreeSnapshot;
  readOnly: boolean;
  nodeId: string;
  actorId: string;
  onClose: () => void;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
}) {
  const baseline = useRef(tree).current;
  const [state, setState] = useState("in_progress");
  const [note, setNote] = useState("");
  const [blocker, setBlocker] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [attempted, setAttempted] = useState(false);
  const action = useAction();
  const save = () =>
    action.run(async () => {
      if (attempted) return;
      if (!note.trim() && state !== "stuck")
        throw new Error("Enter a work note.");
      if (state === "stuck" && !blocker.trim())
        throw new Error("Describe what is blocking the work.");
      const latest = await fetchWorkTree(baseline.root.id);
      if (
        readOnly ||
        latest.root.kind !== "office" ||
        latest.root.project !== baseline.root.project ||
        latest.root.office !== baseline.root.office ||
        latest.revision !== baseline.revision ||
        !selectNodeWorkCapability(
          latest,
          nodeId,
          "execute",
          workScope(latest, actorId),
        ).allowed
      ) {
        throw new Error(
          "Work access or revision changed. Reopen this subitem and review the current work.",
        );
      }
      setAttempted(true);
      await saveSubtaskWorkUpdate({
        subtaskId: nodeId,
        state: state === "stuck" ? "stuck" : "in_progress",
        blocker: state === "stuck" ? blocker : undefined,
        note,
        nextStep,
      });
      await onSaved(latest).catch(() => {});
      onClose();
    });
  return (
    <Sheet
      open
      title="Update subitem work"
      busy={action.busy}
      onClose={onClose}
      footer={
        <Button
          busy={action.busy}
          disabled={attempted || readOnly}
          onPress={() => void save()}
        >
          Save work update
        </Button>
      }
    >
      <Choice
        label="Work state"
        value={state}
        onChange={setState}
        options={[
          { value: "in_progress", label: "In progress" },
          { value: "stuck", label: "Blocked" },
        ]}
      />
      {state === "stuck" && (
        <Field
          label="Blocker"
          value={blocker}
          onChangeText={setBlocker}
          maxLength={3000}
          multiline
        />
      )}
      <Field
        label="Work note"
        value={note}
        onChangeText={setNote}
        maxLength={3000}
        multiline
      />
      <Field
        label="Next step"
        value={nextStep}
        onChangeText={setNextStep}
        maxLength={300}
      />
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {attempted && !!action.error && (
        <Notice>
          Close this sheet and refresh the subitem before trying again. Check
          activity to see whether the update was recorded.
        </Notice>
      )}
    </Sheet>
  );
}
