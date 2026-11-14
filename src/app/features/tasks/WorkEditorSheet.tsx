import { subtaskDateLimits } from "../../../core/web/app/features/nested-work/selectors/subtaskDates";
import { Text } from "../../components/ui/Typography";
import { useRef, useState } from "react";
import ArrowDown from "lucide-react-native/icons/arrow-down";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import {
  Button,
  Choice,
  DateField,
  ErrorState,
  Loading,
  Field,
  Notice,
  Row,
  Sheet,
  Toggle,
  colors,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import {
  isNativeWorkRecovery,
  recoverWorkRequest,
  workRecoveryCanDiscard,
} from "./workRecovery";
import {
  captureWorkEditorBaseline,
  freezeWorkEditorRequest,
  workEditorCapability,
  workEditorDirty,
  workEditorDateError,
  sameWorkEditorScope,
} from "../../../core/web/app/features/nested-work/selectors/editorDraft";
import {
  captureStaffingBaseline,
  staffingDraftError,
  createStaffingRequest,
  staffingCapabilities,
} from "../../../core/web/app/features/nested-work/selectors/staffing";
import {
  fetchWorkImpact,
  fetchWorkTree,
  saveWorkTree,
} from "../../../core/web/app/features/nested-work/services/workTreeService";
import { reparentChoices } from "../../../core/web/app/features/nested-work/selectors/tree";
import type {
  WorkTreeSnapshot,
  WorkRequest,
} from "../../../core/web/app/features/nested-work/types";
import type {
  WorkEdit,
  WorkEditorFields,
} from "../../../core/web/app/features/nested-work/types/editor";
import { draftStore } from "../../../platform/draftStore";
import {
  defaultSubtaskLead,
  personalReviewAllowed,
} from "./branchInspector";
import {
  nodeSchedule,
  subtaskScheduleError,
  workScheduleToday,
} from "./subtaskSchedule";
import { fetchTaskById } from "../../../core/web/app/features/tasks/services/taskRealtimeService";
import { PublicMessageError } from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { workEditorReceiptRetryAllowed } from "../../../core/web/app/features/nested-work/selectors/editorDraft";

export function workEditorActionLabel(
  command: WorkEdit["command"],
  progress?: number,
): string {
  switch (command) {
    case "create":
      return "Add subtask";
    case "edit":
      return "Save subtask";
    case "delete":
      return "Delete subtask";
    case "staff":
    case "root_lead":
    case "contributors":
      return "Save team";
    case "move":
      return "Move subtask";
    case "order":
      return "Save order";
    case "progress":
      return "Post update";
    case "submit":
      return "Submit for review";
    case "review":
      return progress === 100 ? "Approve subtask" : "Request changes";
  }
}

export function WorkEditorSheet(
  props: Omit<Parameters<typeof WorkEditorForm>[0], "rejectedCreate">,
) {
  const { profile } = useAuth(),
    { data, readOnly = false } = props,
    action = useAction();
  const [rejectedCreate, setRejectedCreate] = useState<{
    fields: WorkEditorFields;
    error: unknown;
    start?: string;
  }>();
  const context = {
    actorId: profile?.id || null,
    rootId: data.root.id,
    projectId: data.root.project,
    officeId: data.root.office,
    kind: data.root.kind,
    revision: data.revision,
    readOnly,
  };
  const retained = useFacts(
    `work-recovery:${profile?.id}:${data.root.id}`,
    async () => {
      const saved = await draftStore.get<unknown>(
        profile!.id,
        "work." + data.root.id,
      );
      return isNativeWorkRecovery(saved, context) ? saved : null;
    },
    !!profile,
  );
  const needsDates = ["create", "edit"].includes(props.edit.command) &&
    data.root.kind === "office" && !data.root.scheduleBounds && !!workScheduleToday(data);
  const taskDates = useFacts("work-editor-schedule:" + data.root.id, async () => {
    const task = await fetchTaskById(data.root.id);
    if (!task) throw new PublicMessageError("The parent task dates could not be loaded.");
    return {
      taskStart: typeof task.start_date === "string" ? task.start_date : undefined,
      taskDue: data.root.due ?? undefined,
    };
  }, needsDates && (!retained.data || !!rejectedCreate));
  if (!rejectedCreate && retained.loading)
    return (
      <Sheet open title="Checking saved work changes" onClose={props.onClose}>
        <Loading
          layout="verification"
          label="Checking the original work request…"
        />
      </Sheet>
    );
  if (!rejectedCreate && retained.error)
    return (
      <Sheet
        open
        title="Saved work changes unavailable"
        onClose={props.onClose}
      >
        <ErrorState
          error={retained.error}
          retry={() => void retained.refresh()}
        />
      </Sheet>
    );
  if (!rejectedCreate && retained.data) {
    const saved = retained.data;
    const canCheck = workEditorReceiptRetryAllowed(data, context);
    const rejected = workRecoveryCanDiscard(action.error);
    return (
      <Sheet
        actionError={action.error}
        open
        title="Check previous changes"
        description={saved.fields.title || undefined}
        onClose={props.onClose}
        busy={action.busy}
        footer={
          <>
            <Button
              busy={action.busy}
              disabled={!canCheck || rejected}
              onPress={() =>
                void action.run(async () => {
                  let receipt: WorkTreeSnapshot;
                  try {
                    receipt = await recoverWorkRequest(
                      data.root.id,
                      saved.request,
                      profile!.id,
                    );
                  } catch (error) {
                    if (
                      saved.request.command !== "create" ||
                      props.edit.command !== "create" ||
                      (props.edit.parent ?? "") !== saved.fields.parent ||
                      !workRecoveryCanDiscard(error)
                    ) throw error;
                    await draftStore.remove(profile!.id, "work." + data.root.id);
                    const start = saved.request.payload.start;
                    setRejectedCreate({
                      fields: saved.fields,
                      error,
                      start: typeof start === "string" ? start : undefined,
                    });
                    return;
                  }
                  await draftStore.remove(profile!.id, "work." + data.root.id);
                  props.onClose();
                  await props.onSaved(receipt);
                })
              }
            >
              {workEditorActionLabel(saved.request.command)}
            </Button>
            {rejected && (
              <Button
                variant="outline"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (
                      !(await confirmAction(
                        "Discard rejected work request?",
                        "These changes were not saved. Discard this attempt and review the current work before trying again.",
                        "Discard rejected request",
                      ))
                    )
                      return;
                    await draftStore.remove(
                      profile!.id,
                      "work." + data.root.id,
                    );
                    await retained.refresh();
                    action.clear();
                  })
                }
              >
                Discard rejected request
              </Button>
            )}
          </>
        }
      >
        {!action.error && (
          <Text>
            {canCheck
              ? "An earlier save still needs to be confirmed. Use the button below to check its result."
              : "Refresh the task or reopen it with an account that can make this change."}
          </Text>
        )}
      </Sheet>
    );
  }
  if (needsDates && !taskDates.data)
    return (
      <Sheet open title="Parent task schedule" onClose={props.onClose}>
        {taskDates.error
          ? <ErrorState error={taskDates.error} retry={() => void taskDates.refresh()} />
          : <Loading label="Loading parent task dates" layout="form" />}
      </Sheet>
    );
  return <WorkEditorForm {...props} dateBounds={data.root.scheduleBounds ?? taskDates.data} rejectedCreate={rejectedCreate} />;
}
function WorkEditorForm({
  data: initialData,
  edit,
  onClose,
  onSaved,
  readOnly = false,
  rejectedCreate,
  dateBounds,
}: {
  data: WorkTreeSnapshot;
  edit: WorkEdit;
  onClose: () => void;
  onSaved: (receipt: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
  rejectedCreate?: { fields: WorkEditorFields; error: unknown; start?: string };
  dateBounds?: WorkTreeSnapshot["root"]["scheduleBounds"];
}) {
  const { profile } = useAuth();
  const [data, setData] = useState(initialData);
  const [newer, setNewer] = useState<WorkTreeSnapshot>();
  const [committed, setCommitted] = useState(false);
  const dateTree = dateBounds ? { ...data, root: { ...data.root, scheduleBounds: dateBounds } } : data;
  const [baseline, setBaseline] = useState(
      () =>
        captureWorkEditorBaseline(
          dateTree,
          edit,
          profile?.id || null,
          crypto.randomUUID(),
        ),
    ),
    staffing = useRef(
      captureStaffingBaseline(data, edit.root ? null : edit.node?.id || null, {
        actorId: profile?.id || null,
        rootId: data.root.id,
        projectId: data.root.project,
        officeId: data.root.office,
        kind: data.root.kind,
        revision: data.revision,
        readOnly,
      }),
    ).current;
  const [fields, setFields] = useState<WorkEditorFields>(() =>
    rejectedCreate
      ? { ...rejectedCreate.fields, start: rejectedCreate.start ?? rejectedCreate.fields.start }
      : {
          ...baseline.fields,
          lead: edit.command === "create" ? defaultSubtaskLead(data) : baseline.fields.lead,
          start: edit.command === "create"
            ? subtaskDateLimits(dateTree, baseline.fields.parent).earliest ?? workScheduleToday(data)
            : baseline.fields.start,
        },
  );
  const originalStart =
    nodeSchedule(data.nodes.find((item) => item.id === baseline.nodeId))
      ?.start_date || "";
  const today = workScheduleToday(data);
  const sharedDates = !!dateTree.root.scheduleBounds || !!today;
  const start = fields.start || originalStart;
  const dateLimits = sharedDates ? subtaskDateLimits(dateTree, fields.parent) : undefined;
  const startMax = [dateLimits?.latest, fields.due].filter((date): date is string => !!date).sort()[0];
  const dueMin = [dateLimits?.earliest, start].filter((date): date is string => !!date).sort().at(-1);
  const invalidRange = !!(dateLimits?.earliest && dateLimits.latest && dateLimits.earliest > dateLimits.latest);
  const changedStart =
    (sharedDates || !!today) && edit.command === "edit" && start !== originalStart;
  const request = useRef<WorkRequest | undefined>(undefined),
    action = useAction();
  const [rejectedError, setRejectedError] = useState(rejectedCreate?.error);
  const context = {
    actorId: profile?.id || null,
    rootId: data.root.id,
    projectId: data.root.project,
    officeId: data.root.office,
    kind: data.root.kind,
    revision: data.revision,
    readOnly,
  };
  const node = data.nodes.find((n) => n.id === baseline.nodeId),
    isStaff =
      edit.command === "staff" ||
      edit.command === "root_lead" ||
      edit.command === "contributors";
  const capability = isStaff
    ? staffingCapabilities(
        data,
        edit.root ? null : node?.id || null,
        context,
        fields.lead,
      ).appointment
    : workEditorCapability(data, baseline, context);
  const update = <K extends keyof WorkEditorFields>(
    key: K,
    value: WorkEditorFields[K],
  ) => {
    if (action.busy || request.current) return;
    setFields((old) => ({ ...old, [key]: value }));
  };
  const save = () =>
    action.run(async () => {
      setRejectedError(undefined);
      if (committed) return;
      if (!profile) throw new Error("Sign in again.");
      const wasPending = !!request.current;
      if (!request.current) {
        if (edit.command === "review") {
          if (!fields.note.trim())
            throw new Error("Enter the reason for your decision.");
          const approve = fields.progress === 100;
          if (
            !(await confirmAction(
              approve ? "Approve this subtask?" : "Return this subtask?",
              fields.note.trim(),
              approve ? "Approve subtask" : "Request changes",
            ))
          )
            return;
        }
        const latest = await fetchWorkTree(data.root.id);
        if (
          readOnly ||
          latest.root.project !== context.projectId ||
          latest.root.office !== context.officeId ||
          latest.root.kind !== context.kind
        )
          throw new Error(
            "Work access or revision changed. Reopen the editor and review the current work.",
          );
        if (latest.revision !== baseline.revision) {
          if (edit.command === "edit") setNewer(latest);
          throw new Error(
            "Work changed. Review the latest details before saving your draft.",
          );
        }
        if (
          edit.command === "review" &&
          (!baseline.nodeId ||
            !personalReviewAllowed(
              latest,
              baseline.nodeId,
              profile.id,
              readOnly,
            ))
        )
          throw new Error("Current independent review access is required.");
        const datedEdit = sharedDates && ["create", "edit"].includes(edit.command);
        const freshTask = datedEdit && !latest.root.scheduleBounds && latest.root.kind === "office"
          ? await fetchTaskById(latest.root.id) : undefined;
        if (freshTask === null) throw new PublicMessageError("The parent task dates could not be verified.");
        const freshDateTree = latest.root.scheduleBounds || !datedEdit ? latest : {
          ...latest,
          root: {
            ...latest.root,
            scheduleBounds: {
              taskStart: typeof freshTask?.start_date === "string" ? freshTask.start_date : undefined,
              taskDue: latest.root.due ?? undefined,
            },
          },
        };
        const issue = isStaff
          ? staffingDraftError(
              latest,
              context,
              staffing,
              fields.lead || null,
              fields.people,
            )
          : datedEdit
            ? workEditorDateError(freshDateTree, baseline, { ...fields, start })
            : subtaskScheduleError(latest, baseline, fields);
        if (issue) throw new PublicMessageError(issue);
        const current = workEditorCapability(latest, baseline, context);
        if (!isStaff && !current.allowed)
          throw new PublicMessageError(
            current.disabledReason || "Current work access is required.",
          );
        if (["create", "edit"].includes(edit.command) && !fields.title.trim())
          throw new Error("Title is required.");
        if (
          ["progress", "submit", "review"].includes(edit.command) &&
          !fields.note.trim()
        )
          throw new Error("A work note is required.");
        let next = isStaff
          ? createStaffingRequest(staffing, fields.lead, fields.people)
          : freezeWorkEditorRequest(baseline, fields, crypto.randomUUID());
        if (datedEdit && start)
          next = { ...next, payload: { ...next.payload, start } };
        const needsImpact =
          ["move", "order", "delete"].includes(edit.command) ||
          (edit.command === "edit" &&
            (changedStart ||
              fields.due !== baseline.fields.due ||
              fields.standalone !== baseline.fields.standalone)) ||
          (isStaff && fields.lead !== staffing.leadId && !!staffing.leadId);
        if (needsImpact) {
          const impact = await fetchWorkImpact(data.root.id, next);
          if (impact.current_revision !== next.revision)
            throw new Error(
              "Work changed. Reopen the editor and review current work.",
            );
          if (!impact.allowed)
            throw new Error(
              "Existing work or current permissions block this change. " +
                impact.blocker_codes.join(", "),
            );
          if (
            !(await confirmAction(
              "Review affected work",
              `${impact.selected_count} selected items, ${impact.descendant_count} descendants, ${impact.affected_appointment_count} appointments.\n${impact.before_path.join(" / ")}\n→ ${impact.after_path.join(" / ")}`,
              workEditorActionLabel(edit.command, fields.progress),
              edit.command === "delete",
            ))
          )
            return;
          next = { ...next, impactFingerprint: impact.fingerprint };
        }
        request.current = next;
        await draftStore.set(profile.id, "work." + data.root.id, {
          request: next,
          fields,
          baseline,
        });
      }
      let receipt: WorkTreeSnapshot;
      try {
        receipt = wasPending
          ? await recoverWorkRequest(data.root.id, request.current, profile.id)
          : await saveWorkTree(data.root.id, request.current);
      } catch (error) {
        if (edit.command === "create" && workRecoveryCanDiscard(error)) {
          await draftStore.remove(profile.id, "work." + data.root.id);
          request.current = undefined;
        }
        if (edit.command === "edit" && workRecoveryCanDiscard(error)) {
          const latest = await fetchWorkTree(data.root.id);
          if (latest.revision !== baseline.revision) setNewer(latest);
        }
        throw error;
      }
      await draftStore.remove(profile.id, "work." + data.root.id);
      request.current = undefined;
      setCommitted(true);
      onClose();
      await onSaved(receipt);
    });
  const reviewLatest = () =>
    action.run(async () => {
      if (!profile || !newer || readOnly) return;
      const latest = await fetchWorkTree(data.root.id);
      const latestNode = latest.nodes.find(
        (item) => item.id === baseline.nodeId,
      );
      const nextScope = {
        ...context,
        projectId: latest.root.project,
        officeId: latest.root.office,
        kind: latest.root.kind,
        revision: latest.revision,
      };
      const nextBaseline = captureWorkEditorBaseline(
        latest,
        { ...edit, node: latestNode },
        profile.id,
        baseline.createdId,
      );
      if (
        !latestNode ||
        !sameWorkEditorScope(baseline, nextScope) ||
        !workEditorCapability(latest, nextBaseline, nextScope).allowed
      )
        throw new Error("You no longer have access to edit this subtask.");
      if (
        !(await confirmAction(
          "Review latest subtask details",
          `Current title: ${latestNode.title}\nCurrent due date: ${latestNode.due_date || "None"}\nYour edited fields will stay in the draft for review.`,
          "Keep draft",
        ))
      )
        return;
      if (request.current)
        await draftStore.remove(profile.id, "work." + data.root.id);
      request.current = undefined;
      setFields({
        ...nextBaseline.fields,
        title:
          fields.title === baseline.fields.title
            ? nextBaseline.fields.title
            : fields.title,
        due:
          fields.due === baseline.fields.due
            ? nextBaseline.fields.due
            : fields.due,
        start:
          fields.start === baseline.fields.start
            ? nextBaseline.fields.start
            : fields.start,
        standalone:
          fields.standalone === baseline.fields.standalone
            ? nextBaseline.fields.standalone
            : fields.standalone,
        note: fields.note,
      });
      setData(latest);
      setBaseline(nextBaseline);
      setNewer(undefined);
    });
  const close = async () => {
    if (action.busy) return;
    if (
      !committed &&
      (request.current || changedStart || workEditorDirty(baseline, fields))
    ) {
      if (
        !(await confirmAction(
          "Leave these work changes?",
          "You can check the result of a previous submission when you return. Unsaved field edits will be discarded.",
          "Leave editor",
        ))
      )
        return;
    }
    onClose();
  };
  return (
    <Sheet
      actionError={action.error ?? rejectedError}
      open
      title={
        edit.root
          ? "Task lead and contributors"
          : `${edit.command === "create" ? "Add subtask" : edit.command === "staff" ? "Choose people" : edit.command === "review" ? "Review subtask" : edit.command === "order" ? "Reorder subtasks" : edit.command === "move" ? "Move subtask" : edit.command === "delete" ? "Delete subtask" : "Edit subtask"}`
      }
      description={node?.title}
      onClose={() => void close()}
      busy={action.busy}
      footer={
        <Button
          busy={action.busy}
          onPress={() =>
            void (committed ? onClose() : newer ? reviewLatest() : save())
          }
        >
          {committed
            ? "Done"
            : newer
              ? "Review latest details"
              : workEditorActionLabel(edit.command, fields.progress)}
        </Button>
      }
    >
      {!!["create", "edit"].includes(edit.command) && (
        <>
          <Field
            label="Title"
            value={fields.title}
            onChangeText={(v) => update("title", v)}
            editable={!request.current && !action.busy}
          />
          {invalidRange && (
            <ErrorState context="action" error="The parent dates leave no valid subtask date range. Update the parent schedule first." />
          )}
          {sharedDates ? (
            <DateField
              label="Start date"
              value={start}
              min={dateLimits?.earliest}
              max={startMax && dateLimits?.earliest && startMax < dateLimits.earliest ? dateLimits.latest : startMax}
              onChange={(value) => update("start", value)}
              disabled={
                !!request.current ||
                action.busy ||
                invalidRange ||
                !!nodeSchedule(node)?.started_at
              }
            />
          ) : edit.command === "create" ? (
            <Notice>Subtask start dates are currently unavailable.</Notice>
          ) : null}
          <DateField
            label="Due date"
            value={fields.due}
            min={dueMin}
            max={dateLimits?.latest}
            onChange={(v) => update("due", v)}
            disabled={!!request.current || action.busy || invalidRange || !!(dueMin && dateLimits?.latest && dueMin > dateLimits.latest)}
          />
          <Toggle
            label="Can start independently"
            value={fields.standalone}
            onChange={(v) => update("standalone", v)}
            disabled={!!request.current || action.busy}
          />
        </>
      )}
      {!!(isStaff || edit.command === "create") && (
        <>
          <Choice
            label="Appointed Lead"
            value={fields.lead}
            onChange={(v) => update("lead", v)}
            disabled={!!request.current || action.busy}
            options={data.people.map((p) => ({
              value: p.id,
              label: p.name,
              disabled: p.eligible === false,
            }))}
          />
          <Choice
            label="Contributors"
            value={fields.people}
            multiple
            onChange={(v) => update("people", v)}
            disabled={!!request.current || action.busy}
            options={data.people.map((p) => ({
              value: p.id,
              label: p.name,
              disabled: p.eligible === false,
            }))}
          />
        </>
      )}
      {!!(edit.command === "move") && (
        <Choice
          label="Move under"
          value={fields.parent}
          onChange={(v) => update("parent", v)}
          disabled={!!request.current || action.busy}
          options={[
            { value: "", label: "Task root" },
            ...(node ? reparentChoices(data.nodes, node) : []).map((n) => ({
              value: n.id,
              label: n.title,
            })),
          ]}
        />
      )}
      {!!(edit.command === "order") &&
        fields.order.map((id, index) => (
          <Row key={id}>
            <Text style={{ flex: 1, color: colors.text }}>
              {data.nodes.find((n) => n.id === id)?.title || "Subtask"}
            </Text>
            <Button
              variant="outline"
              disabled={index === 0 || !!request.current}
              onPress={() => {
                const ids = [...fields.order];
                [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                update("order", ids);
              }}
              icon={<ArrowUp size={16} color={colors.text} />}
            >
              Up
            </Button>
            <Button
              variant="outline"
              disabled={index === fields.order.length - 1 || !!request.current}
              onPress={() => {
                const ids = [...fields.order];
                [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                update("order", ids);
              }}
              icon={<ArrowDown size={16} color={colors.text} />}
            >
              Down
            </Button>
          </Row>
        ))}
      {!!(edit.command === "progress") && (
        <Field
          label="Progress (0–99%)"
          keyboardType="number-pad"
          value={String(fields.progress)}
          onChangeText={(v) => update("progress", Number(v))}
          editable={!request.current}
        />
      )}
      {!!(edit.command === "review") && (
        <Choice
          label="Review decision"
          value={fields.progress === 100 ? "approve" : "changes"}
          onChange={(v) => update("progress", v === "approve" ? 100 : 0)}
          options={[
            { value: "approve", label: "Approve completed work" },
            { value: "changes", label: "Request changes" },
          ]}
          disabled={!!request.current}
        />
      )}
      {!!["progress", "submit", "review", "edit"].includes(edit.command) && (
        <Field
          label="Work note"
          value={fields.note}
          onChangeText={(v) => update("note", v)}
          multiline
          editable={!request.current}
        />
      )}
      {!!(edit.command === "delete") && (
        <Notice>
          The current subtree and retained work history will be checked before
          deletion. Started work cannot be silently erased.
        </Notice>
      )}
    </Sheet>
  );
}
