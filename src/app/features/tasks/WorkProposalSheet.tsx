import { useEffect, useState } from "react";
import Check from "lucide-react-native/icons/check";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Upload from "lucide-react-native/icons/upload";
import Wallet from "lucide-react-native/icons/wallet";
import {
  Button,
  Card,
  Empty,
  Choice,
  ErrorState,
  Field,
  Loading,
  Notice,
  Sheet,
  dateLabel,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import {
  saveSharedWork,
  type SharedWorkRequest,
} from "../../shared/sharedWorkRequest";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { draftStore } from "../../../platform/draftStore";
import { nativeWindow } from "../../../platform/webRuntime";
import { EvidenceAttachment } from "./EvidenceAttachment";
import { EvidencePicker, evidenceIssue } from "./EvidencePicker";
import type { EvidenceFile } from "../../../platform/evidenceFiles";
import { supabase } from "../../../platform/supabase";
import { confirmAction } from "../../shared/confirm";
import { fetchAssignedSubtaskReviews } from "./assignedSubtaskReviews";
import {
  canResubmit,
  fetchWorkProposals,
  sendWorkProposal,
  type ProposalKind,
  type ProposalRequest,
  type WorkProposal,
} from "./workProposals";
import { assertWorkAcceptanceAvailable } from "../budget";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { selectNodeWorkCapability } from "../../../core/web/app/features/nested-work/selectors/capabilities";
import { workScope } from "./branchInspector";
import { isSubtaskLeadOrContributor } from "./workPermissions";

export function WorkProposalReview({
  actor,
  root,
  node,
  proposalId,
  officeSubtask,
  readOnly,
  canDecideProposals = true,
  canParticipate = true,
  showEmpty,
  people,
  onOpenCash,
  onSaved,
}: {
  actor: string;
  root: string;
  node?: string;
  proposalId?: string;
  officeSubtask?: boolean;
  readOnly?: boolean;
  canDecideProposals?: boolean;
  canParticipate?: boolean;
  showEmpty?: boolean;
  people?: readonly { id: string; name: string }[];
  onOpenCash?: (recordId: string) => void;
  onSaved: () => Promise<void>;
}) {
  const palette = useTheme();
  const facts = useFacts(`work-proposals:${actor}:${root}:${node ?? ""}`, () =>
    fetchWorkProposals(root, node),
  );
  const { toast } = useToast();
  const action = useAction();
  const [decision, setDecision] = useState<{ id: string; approve: boolean }>();
  const [resubmission, setResubmission] = useState<WorkProposal>();
  const items = facts.error ? [] : (facts.data?.items ?? []);
  const scope = `proposal-decision:${root}:${node ?? "task"}`;
  const recovery = useFacts(`decision-recovery:${actor}:${scope}`, () =>
    draftStore.get<SharedWorkRequest>(actor, scope),
  );
  const pending = recovery.data;
  const selected =
    pending && decision
      ? {
          id: String(pending.args.p_proposal),
          approve: pending.args.p_approve === true,
        }
      : decision;
  const [decisionDraft, updateDecisionDraft, clearDecisionDraft] =
    useRetainedDraft(
      formDraftKey(
        actor,
        "proposal-decision:" +
          root +
          ":" +
          (selected
            ? selected.id + ":" + (selected.approve ? "approve" : "reject")
            : "none"),
      ),
      !!selected,
      () => ({ reason: "" }),
    );
  const reason = decisionDraft.reason;
  const needsCashCheck = (item: WorkProposal) =>
    !!officeSubtask &&
    item.kind === "completion" &&
    item.submitted_as_lead === true;
  const cash = useFacts(
    `proposal-cash:${actor}:${root}:${node ?? ""}`,
    fetchAssignedSubtaskReviews,
    !readOnly && items.some((item) => item.canDecide && needsCashCheck(item)),
  );
  const cashBlocked = (item: WorkProposal) =>
    needsCashCheck(item) &&
    cash.data?.some((entry) => entry.id === item.id && entry.cash_blocked);
  const cashRecord = useFacts(
    `proposal-cash-record:${actor}:${root}:${node ?? ""}`,
    async () => {
      const { data, error } = await supabase
        .from("petty_cash_requests")
        .select("id")
        .eq("task_id", root)
        .eq("subtask_id", node!)
        .not("status", "in", "(settled,rejected,cancelled)")
        .order("created_at")
        .order("id")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return typeof data?.id === "string" ? data.id : undefined;
    },
    !!node && !!onOpenCash && !cash.error && items.some(cashBlocked),
  );
  const cashRecordId = cashRecord.error ? undefined : cashRecord.data;
  const cashUnavailable = (item: WorkProposal) =>
    needsCashCheck(item) &&
    (cash.loading ||
      !!cash.error ||
      !cash.data?.some((entry) => entry.id === item.id));
  const refresh = async () => {
    nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    await Promise.allSettled([
      facts.refresh(),
      cash.refresh(),
      recovery.refresh(),
      onSaved(),
    ]);
  };
  const submit = () =>
    void action
      .run(async () => {
        if (
          !selected ||
          recovery.loading ||
          recovery.error ||
          readOnly ||
          !canDecideProposals
        )
          return;
        if (!pending && !selected.approve && !reason.trim())
          throw new PublicMessageError("Explain what needs to change.");
        const current = (await fetchWorkProposals(root, node)).items.find(
          (item) => item.id === selected.id,
        );
        if (current?.state === "pending") {
          if (!current.canDecide || current.author_id === actor)
            throw new PublicMessageError(
              "This submission is no longer assigned to you.",
            );
          if (selected.approve && needsCashCheck(current)) {
            await assertWorkAcceptanceAvailable(root, node);
          }
        } else if (!pending || !current)
          throw new PublicMessageError(
            "This submission is no longer assigned to you.",
          );
        const id = pending?.id ?? crypto.randomUUID();
        const nextState = selected.approve ? "approved" : "changes_requested";
        await saveSharedWork(
          actor,
          scope,
          "m7_decide_work",
          pending ?? {
            id,
            args: {
              p_proposal: selected.id,
              p_request: id,
              p_approve: selected.approve,
              p_note: reason.trim() || null,
            },
          },
          (value): value is WorkProposal =>
            !!value &&
            typeof value === "object" &&
            "id" in value &&
            value.id === selected.id &&
            "state" in value &&
            value.state === nextState &&
            "decision_request" in value &&
            value.decision_request === id,
          !!pending,
        );
        clearDecisionDraft();
        setDecision(undefined);
        toast(
          selected.approve ? "Work approved." : "Changes requested.",
          "success",
        );
        await refresh();
      })
      .then((success) => {
        if (!success) void recovery.refresh();
      });
  if (
    !items.length &&
    !selected &&
    !recovery.error &&
    !facts.error &&
    !proposalId &&
    !showEmpty
  )
    return null;
  const ordered = proposalId
    ? [
        ...items.filter((item) => item.id === proposalId),
        ...items.filter((item) => item.id !== proposalId),
      ]
    : items;
  const name = (id: string, fallback: string) =>
    id === actor
      ? "You"
      : (people?.find((person) => person.id === id)?.name ?? fallback);

  return (
    <Card title="Work submissions">
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!!pending && !readOnly && !selected && (
        <Button
          variant="outline"
          icon={<RefreshCw size={15} color={palette.primary} />}
          onPress={() =>
            setDecision({
              id: String(pending.args.p_proposal),
              approve: pending.args.p_approve === true,
            })
          }
        >
          Verify saved decision
        </Button>
      )}
      {!!proposalId && facts.loading && !items.length && (
        <Loading label="Loading submission" />
      )}
      {!!showEmpty &&
        !facts.loading &&
        !facts.error &&
        !items.length &&
        !proposalId && (
          <Empty
            kind="files"
            compact
            title="No work submissions yet"
            description="Submitted updates, completion evidence, and Lead review decisions appear here."
          />
        )}
      {!!proposalId &&
        !facts.loading &&
        !facts.error &&
        !items.some((item) => item.id === proposalId) && (
          <Notice tone="warning">
            This submission is no longer available in your review history.
          </Notice>
        )}
      {ordered.map((item) => (
        <Card
          key={item.id}
          title={
            item.kind === "completion"
              ? "Completion submission"
              : "Progress submission"
          }
        >
          <Text>
            {name(item.author_id, "Work contributor")} ·{" "}
            {dateLabel(item.submitted_at)}
          </Text>
          <Notice
            tone={
              item.state === "approved"
                ? "success"
                : item.state === "changes_requested"
                  ? "warning"
                  : "review"
            }
          >
            {item.state === "approved"
              ? "Accepted"
              : item.state === "changes_requested"
                ? "Changes requested"
                : "Awaiting approval"}
          </Notice>
          {!!item.supersedes && <Text>Corrected submission</Text>}
          {item.terms.progress != null && (
            <Text>Proposed progress {item.terms.progress}%</Text>
          )}
          {!!item.terms.blocker && (
            <Text selectable>Blocker · {item.terms.blocker}</Text>
          )}
          <Text selectable>{item.terms.note}</Text>
          {!!item.terms.next_step?.trim() && (
            <Text selectable>Next step · {item.terms.next_step}</Text>
          )}
          {item.terms.attachments?.map((file) => (
            <EvidenceAttachment
              key={file.filePath}
              path={file.filePath}
              name={file.fileName}
              bucket="m7-work-evidence"
            />
          ))}
          {!!item.decided_at && (
            <Text>
              {name(item.reviewer_id, "Assigned reviewer")} ·{" "}
              {dateLabel(item.decided_at)}
            </Text>
          )}
          {!!item.decision_note && <Text selectable>{item.decision_note}</Text>}
          {canDecideProposals &&
            item.canDecide &&
            item.state === "pending" &&
            item.author_id !== actor &&
            !readOnly && (
              <>
                {cashBlocked(item) && (
                  <>
                    <Notice tone="warning">
                      Work can be accepted now. Required receipts and settlement still block final completion.
                    </Notice>
                    <Button
                      variant="outline"
                      icon={<RefreshCw size={15} color={palette.primary} />}
                      disabled={cash.loading}
                      onPress={() => void cash.refresh()}
                    >
                      Check settlement again
                    </Button>
                  </>
                )}
                {cashBlocked(item) && onOpenCash && cashRecordId && (
                  <Button
                    variant="outline"
                    icon={<Wallet size={15} color={palette.primary} />}
                    onPress={() => onOpenCash(cashRecordId)}
                  >
                    View cash request
                  </Button>
                )}
                {cashUnavailable(item) && !cashBlocked(item) && (
                  <>
                    <Notice tone={cash.loading ? "info" : "warning"}>
                      {cash.loading
                        ? "Checking cash settlement"
                        : "Cash settlement could not be verified."}
                    </Notice>
                    {!cash.loading && (
                      <Button
                        variant="outline"
                        icon={<RefreshCw size={15} color={palette.primary} />}
                        onPress={() => void cash.refresh()}
                      >
                        Check again
                      </Button>
                    )}
                  </>
                )}
                <Button
                  icon={<Check size={15} color={palette.onPrimary} />}
                  disabled={
                    !!pending ||
                    recovery.loading ||
                    !!recovery.error ||
                    facts.loading ||
                    cashUnavailable(item)
                  }
                  onPress={() => {
                    action.clear();
                    setDecision({ id: item.id, approve: true });
                  }}
                >
                  Approve work
                </Button>
                <Button
                  variant="outline"
                  icon={<RotateCcw size={15} color={palette.primary} />}
                  disabled={
                    !!pending ||
                    recovery.loading ||
                    !!recovery.error ||
                    facts.loading
                  }
                  onPress={() => {
                    action.clear();
                    setDecision({ id: item.id, approve: false });
                  }}
                >
                  Request changes
                </Button>
              </>
            )}
          {!readOnly &&
            canParticipate &&
            !facts.loading &&
            canResubmit(item, items, actor) &&
            (item.kind === "progress"
              ? facts.data?.canProposeProgress
              : facts.data?.canProposeCompletion) && (
              <Button
                variant="outline"
                icon={<RotateCcw size={15} color={palette.primary} />}
                onPress={() => setResubmission(item)}
              >
                Resubmit work
              </Button>
            )}
        </Card>
      ))}
      {selected && !readOnly && (
        <Sheet
          open
          title={selected.approve ? "Approve work" : "Request changes"}
          busy={action.busy}
          actionError={action.error}
          onClose={() => {
            if (!action.busy) {
              action.clear();
              setDecision(undefined);
            }
          }}
          footer={
            <Button
              busy={action.busy}
              icon={
                selected.approve ? (
                  <Check size={15} color={palette.onPrimary} />
                ) : (
                  <RotateCcw size={15} color={palette.onPrimary} />
                )
              }
              disabled={recovery.loading || !!recovery.error}
              onPress={submit}
            >
              {pending
                ? "Verify decision"
                : selected.approve
                  ? "Approve work"
                  : "Request changes"}
            </Button>
          }
        >
          <Field
            label="Review note"
            required={!selected.approve}
            maxLength={3000}
            value={pending ? String(pending.args.p_note ?? "") : reason}
            editable={!pending}
            onChangeText={(next) => updateDecisionDraft({ reason: next })}
            multiline
          />
        </Sheet>
      )}
      {resubmission && !readOnly && canParticipate && (
        <WorkProposalSheet
          actor={actor}
          root={root}
          node={node}
          kind={resubmission.kind}
          supersedes={resubmission.id}
          initialNextStep={resubmission.terms.next_step}
          canParticipate={canParticipate}
          officeSubtask={officeSubtask}
          onClose={() => setResubmission(undefined)}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}

export function WorkProposalSheet({
  actor,
  root,
  node,
  kind,
  supersedes,
  initialBlocker,
  initialNextStep,
  currentProgress,
  canParticipate = true,
  officeSubtask = false,
  onClose,
  onSaved,
}: {
  actor: string;
  root: string;
  node?: string;
  kind: ProposalKind;
  supersedes?: string;
  initialBlocker?: string | null;
  initialNextStep?: string | null;
  currentProgress?: number | null;
  canParticipate?: boolean;
  officeSubtask?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const palette = useTheme();
  const scope = `work-proposal:${root}:${node ?? "task"}:${kind}`;
  const isProgress = kind === "progress";
  const activeBlocker = isProgress ? initialBlocker?.trim() || "" : "";
  const saved = useFacts(`proposal-recovery:${actor}:${scope}`, () =>
    draftStore.get<ProposalRequest>(actor, scope),
  );
  const { toast } = useToast();
  const action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(actor, scope + ":" + (supersedes ?? "new")),
    true,
    () => ({
      state: (activeBlocker ? "stuck" : "in_progress") as
        "in_progress" | "stuck",
      blocker: activeBlocker,
      note: "",
      nextStep: isProgress ? (initialNextStep ?? "") : "",
      files: [] as EvidenceFile[],
      seededBlocker: activeBlocker,
      dirty: false,
      stateTouched: false,
    }),
  );
  useEffect(() => {
    if (action.busy || !isProgress) return;
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
    activeBlocker,
    draft.blocker,
    draft.dirty,
    draft.seededBlocker,
    draft.stateTouched,
    isProgress,
    updateDraft,
  ]);
  const { state, blocker, note, nextStep, files } = draft;
  const workState = state === "stuck" ? "stuck" : "in_progress";
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  const request = saved.data;
  const submit = () =>
    void action
      .run(async () => {
        if (saved.loading || saved.error) return;
        if (!canParticipate)
          throw new PublicMessageError(
            "Only the Lead or contributors of this task or subtask can submit work updates.",
          );
        let next = request;
        if (!next || next.files) {
          if (officeSubtask) {
            const latest = await fetchWorkTree(root);
            const current = latest.nodes.find((item) => item.id === node);
            // Direct `submit` belongs to the appointed Subtask Lead; an assigned
            // contributor proposes completion with execute access and the fresh
            // m7 canProposeCompletion check below.
            const requiredCapability =
              kind === "progress" || current?.lead_id !== actor ? "execute" : "submit";
            if (!node || latest.root.id !== root || latest.root.kind !== "office" ||
              !current || !isSubtaskLeadOrContributor(latest, current, actor) ||
              !selectNodeWorkCapability(latest, node, requiredCapability,
                workScope(latest, actor)).allowed) {
              throw new PublicMessageError("Current assignment and work access are required to submit work for this subtask.");
            }
          }
          const context = await fetchWorkProposals(root, node);
          if (
            !(kind === "progress"
              ? context.canProposeProgress
              : context.canProposeCompletion)
          )
            throw new PublicMessageError(
              "You no longer have permission to submit this work for review.",
            );
          const originalId = next ? next.args.p_supersedes : supersedes;
          if (
            originalId &&
            !context.items.some(
              (item) =>
                item.id === originalId &&
                item.kind === kind &&
                canResubmit(item, context.items, actor),
            )
          )
            throw new PublicMessageError(
              "This submission is no longer available for correction.",
            );
        }
        if (!next) {
          if (isProgress && workState === "stuck" && !blocker.trim())
            throw new PublicMessageError("Describe what is blocking the work.");
          const trimmedNote = note.trim();
          const trimmedNextStep = isProgress ? nextStep.trim() : "";
          if (!trimmedNote)
            throw new PublicMessageError(
              isProgress ? "Enter a work note." : "Enter a completion note.",
            );
          if (trimmedNote.length > 3000)
            throw new PublicMessageError(
              "Work note must be 3000 characters or fewer.",
            );
          if (trimmedNextStep.length > 300)
            throw new PublicMessageError(
              "Next step must be 300 characters or fewer.",
            );
          const issue = evidenceIssue(files);
          if (issue) throw new PublicMessageError(issue);
          const preservedProgress =
            isProgress && !node
              ? Math.min(99, Math.max(0, Math.round(currentProgress ?? 0)))
              : undefined;
          const id = crypto.randomUUID();
          next = {
            id,
            ...(files.length
              ? {
                  files: files.map(({ uri, name, size, type }) => ({
                    uri,
                    name,
                    size,
                    type,
                  })),
                }
              : {}),
            args: {
              p_root: root,
              p_node: node ?? null,
              p_request: id,
              p_kind: kind,
              p_terms: {
                note: trimmedNote,
                ...(trimmedNextStep ? { next_step: trimmedNextStep } : {}),
                ...(isProgress && workState === "stuck"
                  ? { blocker: blocker.trim() }
                  : {}),
                ...(preservedProgress !== undefined
                  ? { progress: preservedProgress }
                  : {}),
              },
              p_supersedes: supersedes ?? null,
            },
          };
        }
        await sendWorkProposal(actor, root, node, scope, next, !!request);
        clearDraft();
        toast(
          kind === "progress"
            ? "Progress submitted for review."
            : "Completion submitted for review.",
          "success",
        );
        onClose();
        nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
        await Promise.allSettled([onSaved()]);
      })
      .then((success) => {
        if (!success) void saved.refresh();
      });
  const terms = request?.args.p_terms as WorkProposal["terms"] | undefined;
  const activeState = terms
    ? terms.blocker?.trim()
      ? "stuck"
      : "in_progress"
    : workState;
  const title = supersedes
    ? "Resubmit work"
    : kind === "completion"
      ? "Submit for review"
      : "Submit progress for review";
  return (
    <Sheet
      open
      title={title}
      actionError={action.error ?? saved.error}
      busy={action.busy}
      onClose={close}
      footer={
        <Button
          busy={action.busy}
          icon={<Upload size={15} color={palette.onPrimary} />}
          disabled={saved.loading || !!saved.error}
          onPress={submit}
        >
          {request
            ? request.files
              ? "Resume submission"
              : "Verify submission"
            : title}
        </Button>
      }
    >
      {!!request && (
        <Notice>Continue the saved submission to verify its result.</Notice>
      )}
      {!!request?.files && !saved.loading && (
        <Button
          variant="outline"
          icon={<RotateCcw size={15} color={palette.primary} />}
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (
                !(await confirmAction(
                  "Discard the saved upload?",
                  "You can choose your evidence again.",
                  "Discard upload",
                ))
              )
                return;
              const current = await draftStore.get<ProposalRequest>(
                actor,
                scope,
              );
              if (current?.id !== request.id || !current.files)
                throw new PublicMessageError(
                  "Verify the saved submission before changing its evidence.",
                );
              await draftStore.remove(actor, scope);
              updateDraft({
                state: terms?.blocker?.trim() ? "stuck" : "in_progress",
                blocker: String(terms?.blocker ?? ""),
                note: String(terms?.note ?? ""),
                nextStep: String(terms?.next_step ?? ""),
              });
              await saved.refresh();
            })
          }
        >
          Discard saved upload
        </Button>
      )}
      {isProgress && (
        <>
          <Choice
            label="Work state"
            value={activeState}
            searchable={false}
            disabled={!!request || action.busy}
            options={[
              { value: "in_progress", label: "In progress" },
              { value: "stuck", label: "Blocked" },
            ]}
            onChange={(nextValue) =>
              updateDraft({
                state: nextValue === "stuck" ? "stuck" : "in_progress",
                dirty: true,
                stateTouched: true,
              })
            }
          />
          {activeState === "stuck" && (
            <Field
              label="Blocker"
              required
              value={terms?.blocker ?? blocker}
              onChangeText={(nextValue) =>
                updateDraft({ blocker: nextValue, dirty: true })
              }
              editable={!request && !action.busy}
              multiline
              maxLength={3000}
            />
          )}
        </>
      )}
      <Field
        label={isProgress ? "Work note" : "Completion note"}
        required
        value={terms?.note ?? note}
        onChangeText={(nextValue) =>
          updateDraft({ note: nextValue, dirty: true })
        }
        editable={!request && !action.busy}
        multiline
        maxLength={3000}
      />
      {isProgress && (!request || !!terms?.next_step?.trim()) && (
        <Field
          label="Next step"
          value={terms?.next_step ?? nextStep}
          onChangeText={(nextValue) =>
            updateDraft({ nextStep: nextValue, dirty: true })
          }
          editable={!request && !action.busy}
          maxLength={300}
        />
      )}
      {!request && (
        <EvidencePicker
          files={files}
          onChange={(nextValue) => updateDraft({ files: nextValue })}
          disabled={action.busy}
          run={(pick) => void action.run(pick)}
        />
      )}
    </Sheet>
  );
}
