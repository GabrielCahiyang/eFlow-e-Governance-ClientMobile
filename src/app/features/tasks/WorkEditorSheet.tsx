import { Text } from "../../components/ui/Typography";
import { useEffect, useRef, useState } from "react";
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
  workRecoveryCanDiscard,
  type NativeWorkRecovery,
} from "./workRecovery";
import {
  captureWorkEditorBaseline,
  freezeWorkEditorRequest,
  workEditorCapability,
  workEditorDateError,
  workEditorDirty,
} from "../../../core/web/app/features/nested-work/selectors/editorDraft";
import {
  captureStaffingBaseline,
  staffingDraftError,
  createStaffingRequest,
  staffingCapabilities,
} from "../../../core/web/app/features/nested-work/selectors/staffing";
import {
  fetchWorkImpact,
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
import { useFacts } from "../../shared/useFacts";
import { workEditorReceiptRetryAllowed } from "../../../core/web/app/features/nested-work/selectors/editorDraft";
export function WorkEditorSheet(
  props: Omit<Parameters<typeof WorkEditorForm>[0], "recovered">,
) {
  const { profile } = useAuth(),
    { data, readOnly = false } = props,
    action = useAction();
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
  if (retained.loading)
    return (
      <Sheet open title="Checking saved work changes" onClose={props.onClose}>
        <Loading label="Checking the original work request…" />
      </Sheet>
    );
  if (retained.error)
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
  if (retained.data) {
    const saved = retained.data;
    return (
      <Sheet
        open
        title="Recover previous work request"
        description={saved.fields.title || "Retained work changes"}
        onClose={props.onClose}
        busy={action.busy}
        footer={
          <>
            <Button
              busy={action.busy}
              disabled={!workEditorReceiptRetryAllowed(data, context)}
              onPress={() =>
                void action.run(async () => {
                  const receipt = await saveWorkTree(
                    data.root.id,
                    saved.request,
                  );
                  await draftStore.remove(profile!.id, "work." + data.root.id);
                  await props.onSaved(receipt);
                  props.onClose();
                })
              }
            >
              Check original request
            </Button>
            {!!workRecoveryCanDiscard(action.error) && (
              <Button
                variant="outline"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (
                      !(await confirmAction(
                        "Discard rejected work request?",
                        "The server confirmed that this request was not committed. Discard it and review current work before creating another change.",
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
        <Notice>
          A previous {saved.request.command.replaceAll("_", " ")} request is
          retained for this work. Checking its exact request ID recovers a
          committed result without creating duplicate work. A new change cannot
          replace an unresolved request.
        </Notice>
        <Text>
          Request revision: {saved.request.revision} · Current revision:{" "}
          {data.revision}
        </Text>
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
    );
  }
  return <WorkEditorForm {...props} />;
}
function WorkEditorForm({
  data,
  edit,
  onClose,
  onSaved,
  readOnly = false,
  recovered,
}: {
  data: WorkTreeSnapshot;
  edit: WorkEdit;
  onClose: () => void;
  onSaved: (receipt: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
  recovered?: NativeWorkRecovery;
}) {
  const { profile } = useAuth();
  const baseline = useRef(
      recovered?.baseline ||
        captureWorkEditorBaseline(
          data,
          edit,
          profile?.id || null,
          crypto.randomUUID(),
        ),
    ).current,
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
  const [fields, setFields] = useState<WorkEditorFields>(() => ({
    ...(recovered?.fields || baseline.fields),
    people: [...(recovered?.fields || baseline.fields).people],
    order: [...(recovered?.fields || baseline.fields).order],
  }));
  const request = useRef<WorkRequest | undefined>(recovered?.request),
    action = useAction();
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
      if (!profile) throw new Error("Sign in again.");
      if (!request.current) {
        const issue = isStaff
          ? staffingDraftError(
              data,
              context,
              staffing,
              fields.lead || null,
              fields.people,
            )
          : workEditorDateError(data, baseline, fields);
        if (issue) throw new Error(issue);
        if (!isStaff && !capability.allowed)
          throw new Error(
            capability.disabledReason || "Current work access is required.",
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
        const needsImpact =
          ["move", "order", "delete"].includes(edit.command) ||
          (edit.command === "edit" &&
            (fields.due !== baseline.fields.due ||
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
              "Confirm changes",
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
      const receipt = await saveWorkTree(data.root.id, request.current);
      await draftStore.remove(profile.id, "work." + data.root.id);
      request.current = undefined;
      await onSaved(receipt);
      onClose();
    });
  const close = async () => {
    if (action.busy) return;
    if (request.current || workEditorDirty(baseline, fields)) {
      if (
        !(await confirmAction(
          "Leave these work changes?",
          "A submitted request remains recoverable with the same request ID. Unsaved field edits will be discarded.",
          "Leave editor",
        ))
      )
        return;
    }
    onClose();
  };
  return (
    <Sheet
      open
      title={
        edit.root
          ? "Task lead and contributors"
          : `${edit.command === "create" ? "Add subitem" : edit.command === "staff" ? "Choose people" : edit.command === "review" ? "Review subitem" : edit.command === "order" ? "Reorder subitems" : edit.command === "move" ? "Move subitem" : edit.command === "delete" ? "Delete subitem" : "Update subitem"}`
      }
      description={node?.title}
      onClose={() => void close()}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          {request.current
            ? "Retry same request"
            : edit.command === "delete"
              ? "Delete subitem"
              : "Save changes"}
        </Button>
      }
    >
      {!!request.current && (
        <Notice>
          The original request is retained. Retry checks its receipt and does
          not create a replacement request.
        </Notice>
      )}
      {!!["create", "edit"].includes(edit.command) && (
        <>
          <Field
            label="Title"
            value={fields.title}
            onChangeText={(v) => update("title", v)}
            editable={!request.current && !action.busy}
          />
          <DateField
            label="Due date"
            value={fields.due}
            onChange={(v) => update("due", v)}
            disabled={!!request.current || action.busy}
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
              {data.nodes.find((n) => n.id === id)?.title || "Subitem"}
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
      {!!action.error && <ErrorState error={action.error} />}
    </Sheet>
  );
}
