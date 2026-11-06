import { View } from "react-native";
import { useTheme } from "../../components/ui/Appearance";
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
  dateLabel,
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

export function TaskActivity({
  taskId,
  canDiscuss,
  verifyDiscussion,
}: {
  taskId: string;
  canDiscuss: boolean;
  verifyDiscussion: () => Promise<void>;
}) {
  const palette = useTheme();
  const { profile } = useAuth();
  const [comment, setComment] = useState("");
  const [sendPending, setSendPending] = useState(false);
  const action = useAction();
  const facts = useFacts(
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
            title: "Comment",
            author: item.authorName,
            date: item.createdAt,
            body: item.body,
          })),
        ...progress.map((item) => ({
          id: "work:" + item.id,
          title: item.blocker ? "Blocker update" : "Work update",
          author: item.authorName,
          date: item.createdAt,
          body: item.note,
          blocker: item.blocker,
          nextStep: item.nextStep,
          path: item.attachmentPath,
          name: item.attachmentName,
        })),
        ...history
          .filter((item) => item.kind === "activity")
          .map((item) => ({
            id: "event:" + item.id,
            title: words(item.action.replace(/^subtask_/, "subitem_")),
            author: item.userName,
            date: item.timestamp,
            body: item.details,
          })),
      ].sort((a, b) => b.date - a.date);
    },
  );
  useEffect(() => {
    const live = createPostgresChannel("native-activity:" + taskId);
    for (const table of [
      "task_comments",
      "task_progress_updates",
      "task_activities",
    ]) {
      live.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: "task_id=eq." + taskId },
        () => void facts.refresh(),
      );
    }
    live.subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [taskId, facts.refresh]);
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
      await facts.refresh();
    });
  return (
    <>
      {canDiscuss && (
        <Card title="Work discussion">
          <Field
            label="Comment"
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
            Post comment
          </Button>
          {!!action.error && <ErrorState context="action" error={action.error} />}
          {sendPending && !!action.error && (
            <>
              <Notice>
                Check the latest activity for your comment before sending it
                again.
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
                Edit comment
              </Button>
            </>
          )}
        </Card>
      )}
      {facts.loading && !facts.data ? (
        <Loading label="Loading task activity" layout="activity" />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data?.length ? (
        <Empty kind="activity" title="No recorded task activity" />
      ) : (
        facts.data.map((item) => (
          <View
            key={item.id}
            style={{
              gap: 5,
              paddingVertical: 9,
              borderBottomWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ fontWeight: "600" }}>{item.title}</Text>
            <LabelValue
              label={item.author || "System"}
              value={dateLabel(item.date)}
            />
            {!!item.body && <Text selectable>{item.body}</Text>}
            {"blocker" in item && !!item.blocker && (
              <LabelValue label="Blocker" value={item.blocker} />
            )}
            {"nextStep" in item && !!item.nextStep && (
              <LabelValue label="Next step" value={item.nextStep} />
            )}
            {"path" in item && !!item.path && (
              <EvidenceAttachment
                path={item.path}
                name={item.name || "Open attachment"}
              />
            )}
          </View>
        ))
      )}
    </>
  );
}
