import { useState, type ReactNode } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Notice,
  Row,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { EvidenceAttachment } from "./EvidenceAttachment";
import { EvidencePicker, evidenceIssue } from "./EvidencePicker";
import { assertEvidenceActor, uploadEvidenceFile } from "./taskEvidence";
import type { EvidenceFile } from "../../../platform/evidenceFiles";
import type { TaskSubmissionAttachment } from "../../../core/web/app/features/tasks/taskTypes";
import { draftStore } from "../../../platform/draftStore";
import { useAuth } from "../authentication";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import {
  saveSharedWork,
  sharedWorkRpc,
  type SharedWorkRequest,
} from "../../shared/sharedWorkRequest";

type Kind = "progress" | "completion";
type Item = {
  id: string;
  root_id: string;
  node_id: string | null;
  author_id: string;
  state: "pending" | "approved" | "changes_requested";
  kind: Kind;
  terms: {
    note: string;
    progress?: number;
    attachments?: TaskSubmissionAttachment[];
  };
  supersedes?: string | null;
  decision_note?: string | null;
  canDecide?: boolean;
};
type Facts = {
  canProposeProgress: boolean;
  canProposeCompletion: boolean;
  items: Item[];
};
type ReviewRequest = SharedWorkRequest & {
  root: string;
  node: string | null;
  files?: EvidenceFile[];
};
type Editor = { kind: Kind; review?: Item; previous?: Item };
const decisions = {
  pending: "Awaiting Lead review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export function LeadWorkReviewCard({
  root,
  node,
  readOnly,
  onSaved,
  fallback,
}: {
  root: string;
  node?: string;
  readOnly: boolean;
  onSaved: () => Promise<unknown>;
  fallback?: ReactNode;
}) {
  const actor = useAuth().profile?.id || "";
  const key = JSON.stringify([actor, root, node]);
  const scope = "lead-work-request:" + root + ":" + (node || "");
  const facts = useFacts(
    "lead-work-review:" + key,
    () =>
      sharedWorkRpc<Facts>("m7_work_proposals", {
        p_root: root,
        p_node: node ?? null,
      }),
    !!actor,
  );
  const recovery = useFacts(
    "lead-work-recovery:" + key,
    () => draftStore.get<ReviewRequest>(actor, scope),
    !!actor,
  );
  const [editor, setEditor] = useState<Editor>();
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const action = useAction();
  const items = facts.data?.items ?? [];
  const available =
    !readOnly &&
    !facts.error &&
    !facts.loading &&
    !recovery.loading &&
    !recovery.error;
  const pending = items.some(
    (item) => item.author_id === actor && item.state === "pending",
  );
  const launch = (next: Editor) => {
    action.clear();
    setNote(next.previous?.terms.note || "");
    setProgress(next.previous?.terms.progress?.toString() || "");
    setFiles([]);
    setEditor(next);
  };
  const send = (approve?: boolean) =>
    void action.run(async () => {
      let request = recovery.data;
      if (!request) {
        if (!editor || !available || (!note.trim() && approve !== true))
          throw new PublicMessageError(
            "Enter a work note or a reason for the decision.",
          );
        const id = crypto.randomUUID();
        if (editor.review) {
          request = {
            id,
            root,
            node: node ?? null,
            args: {
              p_proposal: editor.review.id,
              p_request: id,
              p_approve: approve,
              p_note: note.trim() || null,
            },
          };
        } else {
          const amount = progress.trim();
          if (
            (amount || (editor.kind === "progress" && !node)) &&
            (!/^\d{1,2}$/.test(amount) || Number(amount) > 99)
          )
            throw new PublicMessageError(
              "Enter a whole progress percentage from 0 to 99.",
            );
          const issue = evidenceIssue(files);
          if (issue) throw new PublicMessageError(issue);
          request = {
            id,
            root,
            node: node ?? null,
            files,
            args: {
              p_root: root,
              p_node: node ?? null,
              p_request: id,
              p_kind: editor.kind,
              p_terms: {
                note: note.trim(),
                attachments: [],
                ...(amount ? { progress: Number(amount) } : {}),
              },
              p_supersedes: editor.previous?.id ?? null,
            },
          };
        }
      }
      const decision = typeof request.args.p_proposal === "string";
      const proposalId = decision ? request.args.p_proposal : request.id;
      if (
        request.root !== root ||
        request.node !== (node ?? null) ||
        request.args.p_request !== request.id ||
        (!decision &&
          (request.args.p_root !== root ||
            request.args.p_node !== (node ?? null)))
      )
        throw new PublicMessageError(
          "The saved request belongs to different work.",
        );
      try {
        const selectedFiles = request.files;
        if (!decision && selectedFiles?.length) {
          const terms = request.args.p_terms as Item["terms"];
          const uploaded = [...(terms.attachments ?? [])];
          await assertEvidenceActor(actor);
          await draftStore.set(actor, scope, request);
          for (
            let index = uploaded.length;
            index < selectedFiles.length;
            index++
          ) {
            const file = selectedFiles[index];
            const name = file.name
              .replace(/[^A-Za-z0-9_.-]/g, "_")
              .slice(0, 180);
            const path = [
              actor,
              root,
              node || "root",
              request.id,
              index + "-" + name,
            ].join("/");
            uploaded.push(
              await uploadEvidenceFile(path, file, "m7-work-evidence"),
            );
            request = {
              ...request,
              args: {
                ...request.args,
                p_terms: { ...terms, attachments: [...uploaded] },
              },
            };
            await draftStore.set(actor, scope, request);
          }
        }
        await saveSharedWork<Item>(
          actor,
          scope,
          decision ? "m7_decide_work" : "m7_propose_work",
          request,
          (receipt): receipt is Item => {
            const value = receipt as Item | null;
            return (
              value?.id === proposalId &&
              value?.root_id === root &&
              value.node_id === (node ?? null) &&
              value.state in decisions
            );
          },
          !!recovery.data,
        );
      } finally {
        await recovery.refresh();
      }
      setEditor(undefined);
      await Promise.allSettled([facts.refresh(), onSaved()]);
    });

  if (!recovery.data && (facts.error || !facts.data)) return <>{fallback}</>;
  if (
    !recovery.data &&
    !items.length &&
    !facts.data?.canProposeProgress &&
    !facts.data?.canProposeCompletion
  )
    return null;
  return (
    <Card title="Lead review">
      {items.map((item) => (
        <Card
          key={item.id}
          title={
            item.kind === "completion"
              ? "Completion submission"
              : "Progress update"
          }
        >
          <Text>{decisions[item.state]}</Text>
          <Text>{item.terms.note}</Text>
          {item.terms.progress !== undefined && (
            <Text>{item.terms.progress}% proposed progress</Text>
          )}
          {item.terms.attachments?.map((file) => (
            <EvidenceAttachment
              key={file.filePath}
              name={file.fileName}
              path={file.filePath}
              bucket="m7-work-evidence"
            />
          ))}
          {!!item.decision_note && <Notice>{item.decision_note}</Notice>}
          {available && item.canDecide && !recovery.data && (
            <Button
              variant="outline"
              onPress={() => launch({ kind: item.kind, review: item })}
            >
              Review update
            </Button>
          )}
          {available &&
            !pending &&
            !recovery.data &&
            item.author_id === actor &&
            item.state === "changes_requested" &&
            !items.some((later) => later.supersedes === item.id) && (
              <Button
                variant="outline"
                onPress={() => launch({ kind: item.kind, previous: item })}
              >
                Revise and resubmit
              </Button>
            )}
        </Card>
      ))}
      {available && !pending && !recovery.data && (
        <Row>
          {!!facts.data?.canProposeProgress && (
            <Button
              variant="outline"
              onPress={() => launch({ kind: "progress" })}
            >
              Propose progress
            </Button>
          )}
          {!!facts.data?.canProposeCompletion && (
            <Button
              variant="outline"
              onPress={() => launch({ kind: "completion" })}
            >
              Submit completed work
            </Button>
          )}
        </Row>
      )}
      {!!recovery.data && (
        <Button variant="outline" busy={action.busy} onPress={() => send()}>
          Verify saved review request
        </Button>
      )}
      {!editor && !!action.error && (
        <ErrorState error={action.error} context="action" />
      )}
      {!!editor && (
        <Sheet
          open
          title={
            editor.review ? "Review proposed work" : "Send work for Lead review"
          }
          busy={action.busy}
          onClose={() => {
            if (!action.busy) setEditor(undefined);
          }}
        >
          {!!editor.review && <Notice>{editor.review.terms.note}</Notice>}
          {editor.review?.terms.attachments?.map((file) => (
            <EvidenceAttachment
              key={file.filePath}
              name={file.fileName}
              path={file.filePath}
              bucket="m7-work-evidence"
            />
          ))}
          {!editor.review && (
            <EvidencePicker
              files={files}
              onChange={setFiles}
              disabled={action.busy || !!recovery.data}
              run={(pick) => void action.run(pick)}
            />
          )}
          {!editor.review && editor.kind === "progress" && (
            <Field
              label={node ? "Progress (optional)" : "Progress (0 to 99)"}
              value={progress}
              onChangeText={setProgress}
              keyboardType="number-pad"
              editable={!action.busy && !recovery.data}
            />
          )}
          <Field
            label={editor.review ? "Decision note" : "Work note"}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={3000}
            editable={!action.busy && !recovery.data}
          />
          {!!action.error && (
            <ErrorState error={action.error} context="action" />
          )}
          {recovery.data ? (
            <Button busy={action.busy} onPress={() => send()}>
              Verify saved request
            </Button>
          ) : editor.review ? (
            <Row>
              <Button
                busy={action.busy}
                disabled={!available}
                onPress={() => send(true)}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={!note.trim() || !available}
                onPress={() => send(false)}
              >
                Request changes
              </Button>
            </Row>
          ) : (
            <Button
              busy={action.busy}
              disabled={!note.trim() || !available}
              onPress={() => send()}
            >
              Send for review
            </Button>
          )}
        </Sheet>
      )}
    </Card>
  );
}
