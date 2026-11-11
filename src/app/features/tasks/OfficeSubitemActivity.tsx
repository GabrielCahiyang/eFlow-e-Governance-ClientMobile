import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Button, Card, Empty, ErrorState, Loading } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { readWithTimeout } from "../../shared/readTimeout";
import { statusLabel } from "../../shared/statusLabels";
import { nativeWindow } from "../../../platform/webRuntime";
import { EvidenceAttachment } from "./EvidenceAttachment";
import { fetchSubitemInspectorRecord } from "../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { fetchWorkEvents } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { selectFocusedWorkEvents } from "../../../core/web/app/features/nested-work/selectors/workActivityScope";
import { presentWorkEvent } from "../../../core/web/app/features/nested-work/selectors/workEventPresentation";

type Entry = { id: string; title: string; time: number; body?: ReactNode };
type EventPage = Awaited<ReturnType<typeof fetchWorkEvents>>;
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
  const palette = useTheme();
  const [older, setOlder] = useState<{ first: EventPage; page: EventPage }>();
  const paging = useAction({ requireAccess: false });
  const focus = { rootId, nodeId };
  const events = useFacts(
    "subtask-changes:" + scope,
    () => fetchWorkEvents([rootId]),
    !!actorId && !!tree,
  );
  const history = useFacts(
    "subtask-history:" + scope,
    () => fetchSubitemInspectorRecord(rootId, nodeId),
    !!actorId && tree?.root.kind !== "personal",
  );
  useEffect(() => {
    const refresh = () => {
      void history.refresh();
      paging.clear();
      void events.refresh();
    };
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () =>
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
  }, [history.refresh, events.refresh]);

  const first = events.error ? undefined : events.data;
  const page = older?.first === first && older ? older.page : first;
  const loadOlder = () =>
    paging.run(async () => {
      if (!first || !page) return;
      const last = page.events.at(-1);
      if (!last) return;
      const result = await readWithTimeout(() =>
        fetchWorkEvents([rootId], { time: last.occurred_at, id: last.id }),
      );
      const merged = new Map(page.events.map((event) => [event.id, event]));
      for (const event of result.events) merged.set(event.id, event);
      setOlder({
        first,
        page: {
          events: [...merged.values()],
          more: result.more && !!result.events.length,
        },
      });
    });

  const entries: Entry[] =
    tree && page
      ? selectFocusedWorkEvents(page.events, focus, tree).map(({ event }) => {
          const change = presentWorkEvent(event, focus);
          return {
            id: "event:" + event.id,
            title: change.title.replace(/\b[Ss]ubitems?\b/g, (word) =>
              word.replace(/item/i, "task"),
            ),
            time: Date.parse(event.occurred_at),
            body: (
              <Text>
                {event.actor_name}
                {change.detail ? " · " + change.detail : ""}
              </Text>
            ),
          };
        })
      : [];
  if (history.data && !history.error) {
    const { subtask, progressUpdates, submissions } = history.data;
    if (subtask.completedAt) {
      const author = tree?.people.find(
        (person) => person.id === subtask.completedBy,
      )?.name;
      entries.push({
        id: "completion",
        title: statusLabel("completed"),
        time: subtask.completedAt,
        body: author ? <Text>{author}</Text> : undefined,
      });
    }
    for (const update of progressUpdates) {
      entries.push({
        id: "update:" + update.id,
        title: update.authorName,
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
        title: `${submission.submitterName} · Submission ${submission.version}${submission.status === "pending" ? " · " + statusLabel("for_review") : ""}`,
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
          title: [statusLabel(submission.status), submission.decidedByName]
            .filter(Boolean)
            .join(" · "),
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
  return (
    <Card title="Activity">
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
        <Empty compact kind="activity" title="No activity yet" />
      )}
      {entries.map((entry) => (
        <View key={entry.id} style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center", width: 12 }}>
            <View
              style={{
                width: 8,
                height: 8,
                marginTop: 6,
                borderRadius: 4,
                backgroundColor: palette.primary,
              }}
            />
            <View
              style={{ width: 1, flex: 1, backgroundColor: palette.border }}
            />
          </View>
          <View style={{ flex: 1, gap: 4, paddingBottom: 12 }}>
            <Text style={{ fontWeight: "700" }}>{entry.title}</Text>
            {Number.isFinite(entry.time) && entry.time > 0 && (
              <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                {new Date(entry.time).toLocaleString()}
              </Text>
            )}
            {entry.body}
          </View>
        </View>
      ))}
      {!!paging.error && <ErrorState error={paging.error} />}
      {!!page?.more && (
        <Button
          variant="outline"
          disabled={loading}
          busy={paging.busy}
          onPress={() => void loadOlder()}
        >
          {paging.error ? "Retry older activity" : "Load older activity"}
        </Button>
      )}
    </Card>
  );
}
