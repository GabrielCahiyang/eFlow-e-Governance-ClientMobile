import { useRef, useState } from "react";
import { Button, Card, ErrorState, Field, Sheet } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { saveSharedWork, sharedWorkRpc, type SharedWorkRequest } from "../../shared/sharedWorkRequest";
import { useAction } from "../../shared/useAction";
import { PublicMessageError } from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { draftStore } from "../../../platform/draftStore";

export function WorkProposalReview({ actor, root, node, onSaved }: {
  actor: string; root: string; node?: string; onSaved: () => Promise<void>;
}) {
  const facts = useFacts(`work-proposals:${actor}:${root}:${node ?? ""}`, () =>
    sharedWorkRpc<{ items: { id: string; canDecide: boolean; kind: string; terms: { note: string } }[] }>(
      "m7_work_proposals", { p_root: root, p_node: node ?? null },
    ));
  const action = useAction();
  const [decision, setDecision] = useState<{ id: string; approve: boolean }>();
  const [reason, setReason] = useState("");
  const scope = `proposal-decision:${root}:${node ?? "task"}`;
  const recovery = useFacts(`decision-recovery:${actor}:${scope}`, () =>
    draftStore.get<SharedWorkRequest>(actor, scope));
  const pending = recovery.data;
  const selected = pending
    ? { id: String(pending.args.p_proposal), approve: pending.args.p_approve === true }
    : decision;
  const submit = () => void action.run(async () => {
    if (!selected || recovery.loading || recovery.error) return;
    if (!pending && !selected.approve && !reason.trim())
      throw new PublicMessageError("Explain what needs to change.");
    const id = pending?.id ?? crypto.randomUUID();
    await saveSharedWork(actor, scope, "m7_decide_work", pending ?? {
      id, args: { p_proposal: selected.id, p_request: id, p_approve: selected.approve, p_note: reason.trim() || null },
    }, (value): value is { id: string } => !!value && typeof value === "object" && "id" in value && value.id === selected.id, !!pending);
    setDecision(undefined);
    await Promise.all([facts.refresh(), recovery.refresh(), onSaved()]);
  }).then((success) => { if (!success) void recovery.refresh(); });
  const items = facts.data?.items.filter((item) => item.canDecide) ?? [];
  if (!items.length && !selected && !recovery.error) return null;
  return (
    <Card title="Work awaiting your review">
      {!!recovery.error && <ErrorState error={recovery.error} retry={() => void recovery.refresh()} />}
      {items.map((item) => (
        <Card key={item.id} title={item.kind === "completion" ? "Completion submission" : "Progress submission"}>
          <Text selectable>{item.terms.note}</Text>
          <Button disabled={!!pending || recovery.loading} onPress={() => { setReason(""); setDecision({ id: item.id, approve: true }); }}>Approve</Button>
          <Button variant="outline" disabled={!!pending || recovery.loading} onPress={() => { setReason(""); setDecision({ id: item.id, approve: false }); }}>Request changes</Button>
        </Card>
      ))}
      {selected && (
        <Sheet open title={selected.approve ? "Approve work" : "Request changes"} busy={action.busy}
          actionError={action.error} onClose={() => setDecision(undefined)}
          footer={<Button busy={action.busy} onPress={submit}>{selected.approve ? "Approve" : "Request changes"}</Button>}>
          {!selected.approve && <Field label="Reason" value={pending ? String(pending.args.p_note ?? "") : reason} editable={!pending} onChangeText={setReason} multiline />}
        </Sheet>
      )}
    </Card>
  );
}

export function WorkProposalSheet({
  actor, root, node, kind, onClose, onSaved,
}: {
  actor: string;
  root: string;
  node?: string;
  kind: "progress" | "completion";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const scope = `work-proposal:${root}:${node ?? "task"}:${kind}`;
  const saved = useFacts(`proposal-recovery:${actor}:${scope}`, () =>
    draftStore.get<SharedWorkRequest>(actor, scope));
  const action = useAction();
  const attempt = useRef<SharedWorkRequest | undefined>(undefined);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState("");
  const needsProgress = kind === "progress" && !node;
  const request = saved.data ?? attempt.current;
  const submit = () => void action.run(async () => {
    if (saved.loading || saved.error) return;
    let next = request;
    if (!next) {
      if (!note.trim()) throw new PublicMessageError("Enter a work note.");
      if (needsProgress && !/^(?:[0-9]|[1-9][0-9])$/.test(progress))
        throw new PublicMessageError("Enter progress from 0 to 99.");
      const id = crypto.randomUUID();
      next = {
        id,
        args: {
          p_root: root, p_node: node ?? null, p_request: id, p_kind: kind,
          p_terms: { note: note.trim(), ...(needsProgress ? { progress: Number(progress) } : {}) },
        },
      };
      attempt.current = next;
    }
    try {
      await saveSharedWork(actor, scope, "m7_propose_work", next,
        (value): value is { id: string } => !!value && typeof value === "object" && "id" in value && value.id === next.id,
        !!saved.data);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (!saved.data && code && /^(22|23|42501|40001)/.test(code)) attempt.current = undefined;
      throw error;
    }
    onClose();
    await onSaved();
  });
  const terms = request?.args.p_terms as { note?: string; progress?: number } | undefined;
  return (
    <Sheet open title={kind === "completion" ? "Submit for review" : "Submit progress for review"}
      actionError={action.error ?? saved.error} busy={action.busy} onClose={onClose}
      footer={<Button busy={action.busy} disabled={saved.loading || !!saved.error} onPress={submit}>Submit for review</Button>}
    >
      {needsProgress && <Field label="Progress (%)" value={terms?.progress?.toString() ?? progress}
        keyboardType="numeric" editable={!request && !action.busy} onChangeText={setProgress} />}
      <Field label="Work note" value={terms?.note ?? note} onChangeText={setNote}
        editable={!request && !action.busy} multiline maxLength={3000} />
    </Sheet>
  );
}
