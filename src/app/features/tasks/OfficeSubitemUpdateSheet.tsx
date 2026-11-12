import { useRef, useState } from "react";
import {
  Button,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Row,
  Notice,
  Sheet,
} from "../../components/ui";
import { asServiceFile, chooseFiles, type PickedFile } from "../../../platform/files";
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
  const [attachment, setAttachment] = useState<PickedFile>();
  const [attempted, setAttempted] = useState(false);
  const action = useAction();
  const save = () =>
    action.run(async () => {
      if (attempted) return;
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
          "Work access or revision changed. Reopen this subtask and review the current work.",
        );
      }
      const file = attachment ? await asServiceFile(attachment) : null;
      setAttempted(true);
      await saveSubtaskWorkUpdate({
        subtaskId: nodeId,
        state: state === "stuck" ? "stuck" : "in_progress",
        blocker: state === "stuck" ? blocker : undefined,
        note,
        nextStep,
        attachment: file,
      });
      await onSaved(latest).catch(() => {});
      onClose();
    });
  return (
    <Sheet
      open
      title="Update subtask work"
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
      {attachment ? (
        <Row>
          <LabelValue label="Attachment" value={attachment.name} />
          <Button variant="outline" disabled={attempted || readOnly || action.busy} onPress={() => setAttachment(undefined)}>
            Remove attachment
          </Button>
        </Row>
      ) : (
        <Button variant="outline" disabled={attempted || readOnly || action.busy} onPress={() =>
          void action.run(async () => setAttachment((await chooseFiles("*/*", false))[0]))
        }>
          Attach evidence (optional)
        </Button>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {attempted && !!action.error && (
        <Notice>
          Close this sheet and refresh the subtask before trying again. Check
          activity to see whether the update was recorded.
        </Notice>
      )}
    </Sheet>
  );
}
