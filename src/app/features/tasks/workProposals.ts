import type { TaskSubmissionAttachment } from "../../../core/web/app/features/tasks/taskTypes";
import type { EvidenceFile } from "../../../platform/evidenceFiles";
import { draftStore } from "../../../platform/draftStore";
import { PublicMessageError } from "../../shared/userMessages";
import {
  saveSharedWork,
  sharedWorkRpc,
  type SharedWorkRequest,
} from "../../shared/sharedWorkRequest";
import { assertEvidenceActor, uploadEvidenceFile } from "./taskEvidence";

export type ProposalKind = "progress" | "completion";
export type WorkProposal = {
  id: string;
  root_id: string;
  node_id: string | null;
  author_id: string;
  reviewer_id: string;
  submitted_at: string;
  decided_at: string | null;
  kind: ProposalKind;
  submitted_as_lead: boolean;
  state: "pending" | "approved" | "changes_requested";
  canDecide: boolean;
  decision_note: string | null;
  supersedes: string | null;
  terms: {
    note: string;
    blocker?: string;
    progress?: number;
    attachments?: TaskSubmissionAttachment[];
  };
};
type ProposalContext = {
  items: WorkProposal[];
  canProposeProgress: boolean;
  canProposeCompletion: boolean;
};
export type ProposalRequest = SharedWorkRequest & {
  files?: EvidenceFile[];
  uploaded?: TaskSubmissionAttachment[];
};

export async function fetchWorkProposals(root: string, node?: string) {
  const result = await sharedWorkRpc<ProposalContext>("m7_work_proposals", {
    p_root: root,
    p_node: node ?? null,
  });
  if (
    !Array.isArray(result?.items) ||
    result.items.some(
      (item) => item.root_id !== root || item.node_id !== (node ?? null),
    )
  )
    throw new PublicMessageError(
      "Could not verify the submissions for this work.",
    );
  return result;
}

export function canResubmit(
  item: WorkProposal,
  items: WorkProposal[],
  actor: string,
) {
  return (
    item.state === "changes_requested" &&
    item.author_id === actor &&
    !items.some((replacement) => replacement.supersedes === item.id)
  );
}

export async function sendWorkProposal(
  actor: string,
  root: string,
  node: string | undefined,
  scope: string,
  request: ProposalRequest,
  recovering: boolean,
) {
  await assertEvidenceActor(actor);
  // A submitted request is replayed with its exact original arguments.
  if (request.files) {
    await draftStore.set(actor, scope, request);
    const uploaded = request.uploaded ?? [];
    for (const file of request.files.slice(uploaded.length)) {
      await assertEvidenceActor(actor);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${actor}/${root}/${node ?? "root"}/${request.id}/${uploaded.length}-${filename.slice(0, 250)}`;
      uploaded.push(await uploadEvidenceFile(path, file, "m7-work-evidence"));
      await draftStore.set(actor, scope, { ...request, uploaded });
    }
    request = {
      id: request.id,
      args: {
        ...request.args,
        p_terms: { ...(request.args.p_terms as object), attachments: uploaded },
      },
    };
    recovering = false;
  }
  if (!Object.prototype.hasOwnProperty.call(request.args, "p_supersedes"))
    request = { ...request, args: { ...request.args, p_supersedes: null } };
  const id = request.id;
  await saveSharedWork(
    actor,
    scope,
    "m7_propose_work",
    request,
    (value): value is WorkProposal =>
      !!value &&
      typeof value === "object" &&
      "id" in value &&
      value.id === id &&
      "root_id" in value &&
      value.root_id === root &&
      "node_id" in value &&
      value.node_id === (node ?? null) &&
      "author_id" in value &&
      value.author_id === actor,
    recovering,
  );
}
