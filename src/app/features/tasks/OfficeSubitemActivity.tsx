import { EvidenceAttachment } from "./EvidenceAttachment";
import { useEffect } from "react";
import {
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { fetchSubitemInspectorRecord } from "../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { nativeWindow } from "../../../platform/webRuntime";

export function OfficeSubitemActivity({
  tree,
  nodeId,
  actorId,
}: {
  tree: WorkTreeSnapshot;
  nodeId: string;
  actorId: string | null;
}) {
  const history = useFacts(
    "subitem-history:" +
      [actorId, tree.root.id, nodeId, tree.revision].join(":"),
    () => fetchSubitemInspectorRecord(tree.root.id, nodeId),
    !!actorId,
  );
  useEffect(() => {
    const refresh = () => void history.refresh();
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () =>
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
  }, [history.refresh]);
  if (history.error)
    return (
      <ErrorState error={history.error} retry={() => void history.refresh()} />
    );
  if (!history.data)
    return <Loading label="Loading subitem activity" layout="activity" />;
  const { subtask, progressUpdates, submissions } = history.data;
  return (
    <Card title="Subitem activity">
      {!!subtask.completedAt && (
        <LabelValue
          label="Completed on"
          value={dateLabel(subtask.completedAt)}
        />
      )}
      {!!subtask.completedBy && (
        <LabelValue
          label="Completed by"
          value={
            tree.people.find((person) => person.id === subtask.completedBy)
              ?.name || "Recorded team member"
          }
        />
      )}
      {progressUpdates.map((update) => (
        <Card key={update.id}>
          <LabelValue
            label={update.authorName}
            value={dateLabel(update.createdAt)}
          />
          {!!update.note && <Text>{update.note}</Text>}
          {!!update.blocker && (
            <LabelValue label="Blocker" value={update.blocker} />
          )}
          {!!update.nextStep && (
            <LabelValue label="Next step" value={update.nextStep} />
          )}
          {!!update.attachmentPath && (
            <EvidenceAttachment
              path={update.attachmentPath}
              name={update.attachmentName || "Open evidence"}
            />
          )}
        </Card>
      ))}
      {submissions.map((submission) => (
        <Card key={submission.id} title={`Submission ${submission.version}`}>
          <LabelValue label="Submitted by" value={submission.submitterName} />
          <LabelValue
            label="Decision"
            value={submission.status.replaceAll("_", " ")}
          />
          {!!submission.note && <Text selectable>{submission.note}</Text>}
          {!!submission.decisionFeedback && (
            <Text selectable>{submission.decisionFeedback}</Text>
          )}
          {submission.attachments.map((file) => (
            <EvidenceAttachment
              key={file.id}
              path={file.filePath}
              name={file.fileName}
            />
          ))}
        </Card>
      ))}
      {!subtask.completedAt &&
        !progressUpdates.length &&
        !submissions.length && (
          <Empty kind="activity" title="No recorded updates" />
        )}
    </Card>
  );
}
