import { EvidenceAttachment } from "./EvidenceAttachment";
import { useEffect, useState } from "react";
import {
  Card,
  Button,
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
import { fetchWorkEvents } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { selectFocusedWorkEvents } from "../../../core/web/app/features/nested-work/selectors/workActivityScope";
import { presentWorkEvent } from "../../../core/web/app/features/nested-work/selectors/workEventPresentation";

export function OfficeSubitemActivity({
  tree,
  nodeId,
  actorId,
}: {
  tree: WorkTreeSnapshot;
  nodeId: string;
  actorId: string | null;
}) {
  const [cursor, setCursor] = useState<{ time: string; id: string }>();
  const focus = { rootId: tree.root.id, nodeId };
  const events = useFacts(
    `subitem-changes:${actorId}:${tree.root.id}:${nodeId}:${tree.revision}:${cursor?.id || "latest"}`,
    () => fetchWorkEvents([tree.root.id], cursor),
    !!actorId,
  );
  const scoped = events.data
    ? selectFocusedWorkEvents(events.data.events, focus, tree)
    : [];
  const history = useFacts(
    "subitem-history:" +
      [actorId, tree.root.id, nodeId, tree.revision].join(":"),
    () => fetchSubitemInspectorRecord(tree.root.id, nodeId),
    !!actorId,
  );
  useEffect(() => {
    const refresh = () => {
      void history.refresh();
      if (!cursor) void events.refresh();
    };
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () =>
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
  }, [history.refresh, events.refresh, cursor]);
  if (history.error)
    return (
      <ErrorState error={history.error} retry={() => void history.refresh()} />
    );
  if (!history.data)
    return <Loading label="Loading subitem activity" layout="activity" />;
  const { subtask, progressUpdates, submissions } = history.data;
  return (
    <Card title="Subitem activity">
      <Card title="Work changes">
        {events.error ? (
          <ErrorState
            error={events.error}
            retry={() => void events.refresh()}
          />
        ) : !events.data ? (
          <Loading label="Loading work changes" layout="activity" />
        ) : !scoped.length ? (
          <Empty compact kind="activity" title="No work changes on this page" />
        ) : (
          scoped.map(({ event }) => {
            const change = presentWorkEvent(event, focus);
            return (
              <Card key={event.id} title={change.title}>
                <LabelValue
                  label={event.actor_name}
                  value={new Date(event.occurred_at).toLocaleString()}
                />
                <Text>{change.detail}</Text>
              </Card>
            );
          })
        )}
        {cursor && (
          <Button variant="outline" onPress={() => setCursor(undefined)}>
            Latest work changes
          </Button>
        )}
        {events.data?.more && (
          <Button
            variant="outline"
            disabled={events.loading}
            onPress={() => {
              const last = events.data?.events.at(-1);
              if (last) setCursor({ time: last.occurred_at, id: last.id });
            }}
          >
            Older work changes
          </Button>
        )}
      </Card>
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
