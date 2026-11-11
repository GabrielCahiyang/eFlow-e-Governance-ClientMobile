import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { words } from "../../components/ui/theme";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { useAuth } from "../authentication";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import {
  fetchCommentsStrict,
  postComment,
  fetchProgressUpdatesStrict,
} from "../../../core/web/app/services/taskDiscussionService";
import { fetchTaskActivityHistory } from "../../../core/web/app/features/tasks/services/taskActivityService";
import { EvidenceAttachment } from "./EvidenceAttachment";
import { assertEvidenceActor } from "./taskEvidence";
import { ActivityEntry, type TimelineEntry } from "./ActivityEntry";
import { describeWorkEvent } from "./activityPresentation";
import { useWorkActivityPages } from "./useWorkActivityPages";
import { nativeWindow } from "../../../platform/webRuntime";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { statusLabel } from "../../shared/statusLabels";

export function TaskActivity({
  taskId,
  canDiscuss,
  verifyDiscussion,
}: {
  taskId: string;
  canDiscuss: boolean;
  verifyDiscussion: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const events = useWorkActivityPages(
    JSON.stringify([profile?.id, taskId]),
    taskId,
    !!profile?.id,
  );
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [sendPending, setSendPending] = useState(false);
  const action = useAction();
  const facts = useFacts<TimelineEntry[]>(
    "task-activity:" + profile?.id + ":" + taskId,
    async () => {
      const [comments, progress, history] = await Promise.all([
        fetchCommentsStrict(taskId),
        fetchProgressUpdatesStrict(taskId),
        fetchTaskActivityHistory([taskId]),
      ]);
      return [
        ...comments
          .filter((item) => !item.deletedAt)
          .map((item) => ({
            id: "comment:" + item.id,
            title: "Work note",
            actor: item.authorName,
            time: item.createdAt,
            body: <Text selectable>{item.body}</Text>,
          })),
        ...progress.map((item) => ({
          id: "work:" + item.id,
          title: item.blocker ? "Blocker update" : "Work update",
          actor: item.authorName,
          time: item.createdAt,
          body: (
            <>
              {!!item.note && <Text selectable>{item.note}</Text>}
              {!!item.blocker && (
                <LabelValue label="Blocker" value={item.blocker} />
              )}
              {!!item.nextStep && (
                <LabelValue label="Next step" value={item.nextStep} />
              )}
              {!!item.attachmentPath && (
                <EvidenceAttachment
                  path={item.attachmentPath}
                  name={item.attachmentName || "Open attachment"}
                />
              )}
            </>
          ),
        })),
        ...history.map((item) => {
          const status =
            item.kind === "status"
              ? /^Status changed to ([a-z_]+)\.$/.exec(item.details)?.[1]
              : undefined;
          return {
            id: "event:" + item.id,
            title: status
              ? "Task status updated"
              : words(item.action.replace(/^subitem_/, "subtask_")),
            actor: item.userName,
            time: item.timestamp,
            fields: status
              ? [{ label: "Status", value: statusLabel(status) }]
              : undefined,
            body:
              !status && item.details ? (
                <Text selectable>{item.details}</Text>
              ) : undefined,
          };
        }),
      ];
    },
  );
  const reviews = useFacts<TimelineEntry[]>(
    "task-review-history:" + profile?.id + ":" + taskId,
    async () => {
      const [submissions, attachments] = await Promise.all([
        readAllRows<Record<string, unknown>>((from, to) =>
          supabase
            .from("task_submissions")
            .select(
              "id,version,submitter_name,note,status,decided_by_name,decision_feedback,decided_at,submitted_at",
              { count: "exact" },
            )
            .eq("task_id", taskId)
            .order("version", { ascending: false })
            .order("id")
            .range(from, to),
        ),
        readAllRows<Record<string, unknown>>((from, to) =>
          supabase
            .from("task_attachments")
            .select("id,submission_id,file_path,file_name", { count: "exact" })
            .eq("task_id", taskId)
            .not("submission_id", "is", null)
            .order("id")
            .range(from, to),
        ),
      ]);
      const filesBySubmission = new Map<unknown, typeof attachments>();
      for (const file of attachments) {
        const files = filesBySubmission.get(file.submission_id) ?? [];
        files.push(file);
        filesBySubmission.set(file.submission_id, files);
      }
      const savedTime = (value: unknown) =>
        typeof value === "string" ? Date.parse(value) || 0 : 0;
      const copy = (value: unknown) => (typeof value === "string" ? value : "");
      return submissions.flatMap((item) => {
        const submission: TimelineEntry = {
          id: "submission:" + item.id,
          title: "Submitted for review",
          actor: copy(item.submitter_name),
          time: savedTime(item.submitted_at),
          body: (
            <>
              {!!item.note && <Text selectable>{copy(item.note)}</Text>}
              {filesBySubmission
                .get(item.id)
                ?.filter((file) => typeof file.file_path === "string")
                .map((file) => (
                  <EvidenceAttachment
                    key={String(file.id)}
                    path={String(file.file_path)}
                    name={copy(file.file_name) || "Open evidence"}
                  />
                ))}
            </>
          ),
        };
        return typeof item.status === "string" && item.status !== "pending"
          ? [
              submission,
              {
                id: "decision:" + item.id,
                title: statusLabel(item.status),
                actor: copy(item.decided_by_name),
                time: savedTime(item.decided_at),
                body: item.decision_feedback ? (
                  <Text selectable>{copy(item.decision_feedback)}</Text>
                ) : undefined,
              },
            ]
          : [submission];
      });
    },
    !!profile?.id,
  );
  useEffect(() => {
    const live = createPostgresChannel("native-activity:" + taskId);
    for (const table of [
      "task_comments",
      "task_progress_updates",
      "task_activities",
      "task_status_history",
    ]) {
      live.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: "task_id=eq." + taskId },
        () => void facts.refresh(),
      );
    }
    live.subscribe();
    const refresh = () => {
      void facts.refresh();
      void events.refresh();
      void reviews.refresh();
    };
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
      void supabase.removeChannel(live);
    };
  }, [taskId, facts.refresh, events.refresh, reviews.refresh]);
  const entries: TimelineEntry[] = [
    ...(facts.error ? [] : (facts.data ?? [])),
    ...(reviews.error ? [] : (reviews.data ?? [])),
    ...events.events.map((event) => ({
      id: "tree-event:" + event.id,
      actor: event.actor_name,
      time: Date.parse(event.occurred_at),
      ...describeWorkEvent(event),
    })),
  ].sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
  const send = () =>
    action.run(async () => {
      if (!profile || !canDiscuss || sendPending)
        throw new Error("Current discussion access is required.");
      await verifyDiscussion();
      await assertEvidenceActor(profile.id);
      setSendPending(true);
      await postComment(taskId, comment.trim(), {
        id: profile.id,
        name: profile.full_name,
      });
      setSendPending(false);
      setComment("");
      setEditing(false);
      await facts.refresh();
    });
  return (
    <>
      {canDiscuss && !editing && (
        <Button variant="outline" onPress={() => setEditing(true)}>
          Add work note
        </Button>
      )}
      {canDiscuss && editing && (
        <Card>
          <Text>
            Add a note to the task record. Use the task conversation for team
            discussion.
          </Text>
          <Field
            label="Work note"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={5000}
            editable={!sendPending && !action.busy}
          />
          <Button
            busy={action.busy}
            disabled={sendPending || !comment.trim()}
            onPress={() => void send()}
          >
            Save work note
          </Button>
          {!sendPending && !action.busy && (
            <Button variant="ghost" onPress={() => setEditing(false)}>
              Close editor
            </Button>
          )}
          {!!action.error && (
            <ErrorState context="action" error={action.error} />
          )}
          {sendPending && !!action.error && (
            <>
              <Notice>
                Check the latest activity for your note before saving it again.
              </Notice>
              <Button variant="outline" onPress={() => void facts.refresh()}>
                Refresh activity
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  setSendPending(false);
                  action.clear();
                }}
              >
                Edit note
              </Button>
            </>
          )}
        </Card>
      )}
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!events.error && (
        <ErrorState error={events.error} retry={() => void events.refresh()} />
      )}
      {!!reviews.error && (
        <ErrorState
          error={reviews.error}
          retry={() => void reviews.refresh()}
        />
      )}
      {!entries.length &&
        (facts.loading || events.loading || reviews.loading ? (
          <Loading label="Loading task activity" layout="activity" />
        ) : (
          !facts.error &&
          !events.error &&
          !reviews.error && (
            <Empty compact kind="activity" title="No recorded task activity" />
          )
        ))}
      {entries.map((entry) => (
        <ActivityEntry key={entry.id} entry={entry} />
      ))}
      {!!events.paging.error && <ErrorState error={events.paging.error} />}
      {events.more && (
        <Button
          variant="outline"
          disabled={events.loading}
          busy={events.paging.busy}
          onPress={() => void events.loadOlder()}
        >
          {events.paging.error ? "Retry older activity" : "Load older activity"}
        </Button>
      )}
    </>
  );
}
