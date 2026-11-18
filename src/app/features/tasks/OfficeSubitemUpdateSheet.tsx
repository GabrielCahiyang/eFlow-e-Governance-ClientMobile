import { useEffect, useRef } from "react";
import Paperclip from "lucide-react-native/icons/paperclip";
import Send from "lucide-react-native/icons/send";
import Trash2 from "lucide-react-native/icons/trash";
import {
  Button,
  Choice,
  Field,
  LabelValue,
  Row,
  Notice,
  Sheet,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { useToast } from "../../components/ui/Toast";
import { asServiceFile, chooseFiles, type PickedFile } from "../../../platform/files";
import { useAction } from "../../shared/useAction";
import {
  formDraftKey,
  readFormDraft,
  useRetainedDraft,
} from "../../shared/formDraftMemory";
import { PublicMessageError, feedback } from "../../shared/userMessages";
import {
  saveSubtaskWorkUpdate,
  SubtaskWorkUpdateRejectedError,
} from "../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { selectNodeWorkCapability } from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { workScope } from "./branchInspector";
import { isSubtaskLeadOrContributor } from "./workPermissions";

type UpdateDraft = {
  state: "in_progress" | "stuck";
  note: string;
  blocker: string;
  nextStep: string;
  attachment?: PickedFile;
  seededBlocker: string;
  dirty: boolean;
  stateTouched: boolean;
  attempted: boolean;
};

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
  const initialActor = useRef(actorId).current;
  const initialNode = useRef(nodeId).current;
  const palette = useTheme();
  const activeBlocker =
    tree.nodes.find((item) => item.id === nodeId)?.blocker?.trim() || "";
  const { toast } = useToast();
  const action = useAction();
  const draftKey = formDraftKey(actorId, "subitem-update:" + nodeId);
  const [draft, updateDraft, clearDraft] = useRetainedDraft<UpdateDraft>(
    draftKey,
    true,
    () => {
      const retained = readFormDraft<UpdateDraft>(draftKey);
      // Ordinary abandoned edits reset; an attempted write must survive reopening.
      if (retained?.attempted) return retained;
      return {
        state: activeBlocker ? "stuck" : "in_progress",
        note: "",
        blocker: activeBlocker,
        nextStep: "",
        attachment: undefined,
        seededBlocker: activeBlocker,
        dirty: false,
        stateTouched: false,
        attempted: false,
      };
    },
    { restoreOnOpen: false },
  );
  useEffect(() => {
    if (action.busy || draft.attempted) return;
    const seeded = draft.seededBlocker ?? "";
    if (seeded === activeBlocker) return;
    if (!draft.dirty || (!draft.stateTouched && draft.blocker === seeded)) {
      updateDraft({
        state: activeBlocker ? "stuck" : "in_progress",
        blocker: activeBlocker,
        seededBlocker: activeBlocker,
      });
    }
  }, [
    action.busy,
    draft.attempted,
    activeBlocker,
    draft.blocker,
    draft.dirty,
    draft.seededBlocker,
    draft.stateTouched,
    updateDraft,
  ]);
  const { state, note, blocker, nextStep, attachment, attempted } = draft;
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  const save = () =>
    action.run(async () => {
      if (attempted) return;
      if (state === "stuck" && !blocker.trim())
        throw new PublicMessageError("Describe what is blocking the work.");
      const latest = await fetchWorkTree(baseline.root.id);
      const latestNode = latest.nodes.find((item) => item.id === nodeId);
      if (
        readOnly ||
        actorId !== initialActor ||
        nodeId !== initialNode ||
        tree.root.id !== baseline.root.id ||
        tree.root.project !== baseline.root.project ||
        tree.root.office !== baseline.root.office ||
        latest.root.id !== baseline.root.id ||
        latest.root.kind !== "office" ||
        latest.root.project !== baseline.root.project ||
        latest.root.office !== baseline.root.office ||
        latest.revision !== baseline.revision ||
        !latestNode || latestNode.task_id !== baseline.root.id ||
        !isSubtaskLeadOrContributor(latest, latestNode, actorId) ||
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
      updateDraft({ attempted: true });
      try {
        await saveSubtaskWorkUpdate({
          subtaskId: nodeId,
          state: state === "stuck" ? "stuck" : "in_progress",
          blocker: state === "stuck" ? blocker : undefined,
          note,
          nextStep,
          attachment: file,
        });
      } catch (error) {
        if (error instanceof SubtaskWorkUpdateRejectedError)
          updateDraft({ attempted: false });
        throw error;
      }
      clearDraft();
      toast("Work update posted.", "success");
      try {
        await onSaved(await fetchWorkTree(baseline.root.id));
      } catch {
        toast(feedback.saved, "info");
      }
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Update subtask work"
      busy={action.busy}
      onClose={close}
      footer={
        <Button
          busy={action.busy}
          disabled={attempted || readOnly}
          icon={<Send size={16} color={palette.onPrimary} />}
          onPress={() => void save()}
        >
          Post update
        </Button>
      }
    >
      <Choice
        label="Work state"
        value={state}
        searchable={false}
        onChange={(next) =>
          updateDraft({ state: next, dirty: true, stateTouched: true })
        }
        options={[
          { value: "in_progress", label: "In progress" },
          { value: "stuck", label: "Blocked" },
        ]}
      />
      {state === "stuck" && (
        <Field
          label="Blocker"
          required
          value={blocker}
          onChangeText={(next) => updateDraft({ blocker: next, dirty: true })}
          maxLength={3000}
          multiline
        />
      )}
      <Field
        label="Work note"
        value={note}
        onChangeText={(next) => updateDraft({ note: next, dirty: true })}
        maxLength={3000}
        multiline
      />
      <Field
        label="Next step"
        value={nextStep}
        onChangeText={(next) => updateDraft({ nextStep: next, dirty: true })}
        maxLength={300}
      />
      {attachment ? (
        <Row>
          <LabelValue label="Attachment" value={attachment.name} />
          <Button
            variant="outline"
            disabled={attempted || readOnly || action.busy}
            icon={<Trash2 size={16} color={palette.primary} />}
            onPress={() => updateDraft({ attachment: undefined })}
          >
            Remove attachment
          </Button>
        </Row>
      ) : (
        <Button
          variant="outline"
          disabled={attempted || readOnly || action.busy}
          icon={<Paperclip size={16} color={palette.primary} />}
          onPress={() =>
            void action.run(async () => {
              const picked = (await chooseFiles("*/*", false))[0];
              if (picked) updateDraft({ attachment: picked });
            })
          }
        >
          Attach evidence (optional)
        </Button>
      )}
      {attempted && !action.busy && (
        <Notice>
          The update may have been saved. Close this sheet and check current
          activity to see whether it was recorded. This draft is kept and cannot
          be sent again while the outcome is uncertain.
        </Notice>
      )}
    </Sheet>
  );
}
