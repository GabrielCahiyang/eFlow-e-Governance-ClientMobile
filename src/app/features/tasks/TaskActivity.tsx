import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  colors,
  dateLabel,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { useAuth } from "../authentication";
import {
  fetchCommentsStrict,
  postComment,
  fetchProgressUpdatesStrict,
} from "../../../core/web/app/services/taskDiscussionService";
export function TaskActivity({
  taskId,
  canDiscuss,
}: {
  taskId: string;
  canDiscuss: boolean;
}) {
  const { profile } = useAuth(),
    [comment, setComment] = useState(""),
    action = useAction();
  const facts = useFacts("task-activity:" + taskId, async () => {
    const [comments, progress] = await Promise.all([
      fetchCommentsStrict(taskId),
      fetchProgressUpdatesStrict(taskId),
    ]);
    return { comments, progress };
  });
  return (
    <>
      {facts.loading && !facts.data ? (
        <Loading />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        <>
          {facts.data?.progress.map((p) => (
            <Card
              key={p.id}
              title={p.blocker ? "Blocker update" : "Work update"}
            >
              <LabelValue label="By" value={p.authorName} />
              <Text style={{ color: colors.text, lineHeight: 21 }}>
                {p.note}
              </Text>
              {!!p.blocker && (
                <Text style={{ color: colors.warning }}>
                  Blocker: {p.blocker}
                </Text>
              )}
              {!!p.nextStep && (
                <Text style={{ color: colors.muted }}>Next: {p.nextStep}</Text>
              )}
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {dateLabel(p.createdAt)}
              </Text>
            </Card>
          ))}
          {facts.data?.comments
            .filter((c) => !c.deletedAt)
            .map((c) => (
              <Card key={c.id}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {c.authorName}
                </Text>
                <Text style={{ color: colors.text, lineHeight: 21 }}>
                  {c.body}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {dateLabel(c.createdAt)}
                </Text>
              </Card>
            ))}
        </>
      )}
      {!!canDiscuss && (
        <Card title="Discussion">
          <Field
            label="Comment"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <Button
            busy={action.busy}
            disabled={!comment.trim()}
            onPress={() =>
              void action.run(async () => {
                if (!profile) throw new Error("Sign in again.");
                await postComment(taskId, comment, {
                  id: profile.id,
                  name: profile.full_name,
                });
                setComment("");
                await facts.refresh();
              })
            }
          >
            Post comment
          </Button>
          {!!action.error && <ErrorState error={action.error} />}
        </Card>
      )}
    </>
  );
}
