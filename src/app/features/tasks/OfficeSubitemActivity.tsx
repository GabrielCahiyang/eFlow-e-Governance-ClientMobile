import { useEffect } from "react";
import { View } from "react-native";
import Clock from "lucide-react-native/icons/clock";
import { Button, ErrorState, Loading } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { statusLabel } from "../../shared/statusLabels";
import { nativeWindow } from "../../../platform/webRuntime";
import { EvidenceAttachment } from "./EvidenceAttachment";
import { fetchSubitemInspectorRecord } from "../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { selectFocusedWorkEvents } from "../../../core/web/app/features/nested-work/selectors/workActivityScope";
import { ActivityEntry, type TimelineEntry } from "./ActivityEntry";
import { describeWorkEvent } from "./activityPresentation";
import { useWorkActivityPages } from "./useWorkActivityPages";

type ActivityProps = {
  tree?: WorkTreeSnapshot;
  rootId?: string;
  nodeId: string;
  actorId: string | null;
};

export function OfficeSubitemActivity({
  tree,
  rootId = tree?.root.id || "",
  nodeId,
  actorId,
}: ActivityProps) {
  const scope = JSON.stringify([actorId, rootId, nodeId, tree?.revision]);
  return (
    <SubtaskTimeline
      key={scope}
      {...{ scope, tree, rootId, nodeId, actorId }}
    />
  );
}

function SubtaskTimeline({
  tree,
  rootId,
  nodeId,
  actorId,
  scope,
}: ActivityProps & { rootId: string; scope: string }) {
  const focus = { rootId, nodeId };
  const events = useWorkActivityPages(scope, rootId, !!actorId && !!tree);
  const history = useFacts(
    "subtask-history:" + scope,
    () => fetchSubitemInspectorRecord(rootId, nodeId),
    !!actorId && tree?.root.kind !== "personal",
  );
  useEffect(() => {
    const refresh = () => {
      void history.refresh();
      void events.refresh();
    };
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () =>
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
  }, [history.refresh, events.refresh]);

  const entries: TimelineEntry[] = tree
    ? selectFocusedWorkEvents(events.events, focus, tree).map(({ event }) => ({
        id: "event:" + event.id,
        actor: event.actor_name,
        time: Date.parse(event.occurred_at),
        ...describeWorkEvent(event, nodeId),
      }))
    : [];
  if (history.data && !history.error) {
    const { subtask, progressUpdates, submissions } = history.data;
    if (subtask.completedAt) {
      entries.push({
        id: "completion",
        title: statusLabel("completed"),
        time: subtask.completedAt,
      });
    }
    for (const update of progressUpdates) {
      entries.push({
        id: "update:" + update.id,
        title: update.blocker ? "Blocker update" : "Work update",
        actor: update.authorName,
        time: update.createdAt,
        body: (
          <>
            {!!update.note && <Text selectable>{update.note}</Text>}
            {!!update.blocker && <Text>Blocker · {update.blocker}</Text>}
            {!!update.nextStep && <Text>Next step · {update.nextStep}</Text>}
            {!!update.attachmentPath && (
              <EvidenceAttachment
                path={update.attachmentPath}
                name={update.attachmentName || "Open evidence"}
              />
            )}
          </>
        ),
      });
    }
    for (const submission of submissions) {
      entries.push({
        id: "submission:" + submission.id,
        title: `Submitted for review · Attempt ${submission.version}`,
        actor: submission.submitterName,
        time: submission.submittedAt,
        body: (
          <>
            {!!submission.note && <Text selectable>{submission.note}</Text>}
            {submission.attachments.map((file) => (
              <EvidenceAttachment
                key={file.id || file.filePath}
                path={file.filePath}
                name={file.fileName}
              />
            ))}
          </>
        ),
      });
      if (submission.status !== "pending") {
        entries.push({
          id: "decision:" + submission.id,
          title: statusLabel(submission.status),
          actor: submission.decidedByName,
          time: submission.decidedAt ?? 0,
          body: submission.decisionFeedback ? (
            <Text selectable>{submission.decisionFeedback}</Text>
          ) : undefined,
        });
      }
    }
  }
  entries.sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
  const loading = events.loading || history.loading;
  const palette = useTheme();

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 14,
        padding: 16,
        gap: 12,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: palette.text }}>
          Activity
        </Text>
        <Clock size={16} color={palette.mutedLabel} />
      </View>

      {!!events.error && (
        <ErrorState error={events.error} retry={() => void events.refresh()} />
      )}
      {!!history.error && (
        <ErrorState
          error={history.error}
          retry={() => void history.refresh()}
        />
      )}
      {loading && !entries.length && (
        <Loading label="Loading activity" layout="activity" />
      )}
      {!loading && !entries.length && !events.error && !history.error && (
        <View style={{ gap: 4, paddingVertical: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>
            No activity yet
          </Text>
          <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
            Work updates and decisions will appear here.
          </Text>
        </View>
      )}
      {entries.map((entry, index) => (
        <ActivityEntry
          key={entry.id}
          entry={entry}
          last={index === entries.length - 1}
        />
      ))}
      {!!events.paging.error && <ErrorState error={events.paging.error} />}
      {events.more && (
        <Button
          variant="outline"
          disabled={loading}
          busy={events.paging.busy}
          onPress={() => void events.loadOlder()}
        >
          {events.paging.error ? "Retry older activity" : "Load older activity"}
        </Button>
      )}
    </View>
  );
}
