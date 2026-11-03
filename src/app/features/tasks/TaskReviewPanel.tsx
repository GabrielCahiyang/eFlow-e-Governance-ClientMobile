import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import { Linking } from "react-native";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Status,
  colors,
  dateLabel,
  peso,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import {
  fetchTaskSubmissions,
  fetchSubmissionAttachments,
} from "../../../core/web/app/features/reviews/services/reviewService";
import { canUserReviewTask } from "../../../core/web/app/features/reviews/selectors";
import { fetchTaskCashBlockers } from "../../../core/web/app/features/budget/services/taskCashClearanceService";
import { verifyTask } from "../../../core/web/app/features/tasks/services/taskService";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { supabase } from "../../../platform/supabase";
export function TaskReviewPanel({
  task,
  onSaved,
  readOnly,
}: {
  task: Task;
  onSaved: () => Promise<void>;
  readOnly: boolean;
}) {
  const { profile } = useAuth();
  const [feedback, setFeedback] = useState("");
  const action = useAction();
  const submissions = useFacts(
    "submissions:" + task.id + ":" + task.updatedAt,
    async () => {
      const rows = await fetchTaskSubmissions(task.id);
      return Promise.all(
        rows.map(async (s) => ({
          ...s,
          attachments: await fetchSubmissionAttachments(task.id, s.id),
        })),
      );
    },
  );
  const clearance = useFacts(
    "cash-clearance:" + task.id + ":" + task.updatedAt,
    () => fetchTaskCashBlockers(task.id),
  );
  const mayReview =
    !readOnly &&
    task.status === "for_review" &&
    canUserReviewTask(task, profile?.id, profile?.role);
  const decide = (approve: boolean) =>
    action.run(async () => {
      if (!profile || !mayReview)
        throw new Error("Current independent review access is required.");
      if (!approve && !feedback.trim())
        throw new Error("Explain what needs to change.");
      if (approve) {
        const current = await fetchTaskCashBlockers(task.id);
        if (current.length)
          throw new Error(
            "Settle all outstanding cash before approving this work.",
          );
      }
      if (
        !(await confirmAction(
          approve ? "Approve completed work?" : "Request changes?",
          approve
            ? "The server rechecks evidence, dependencies and cash clearance before approval."
            : feedback,
          approve ? "Approve work" : "Send back for changes",
        ))
      )
        return;
      await verifyTask(task.id, approve, feedback, {
        id: profile.id,
        name: profile.full_name,
      });
      await onSaved();
      await submissions.refresh();
      await clearance.refresh();
    }, "Review decision saved.");
  return (
    <>
      <Card title="Cash clearance">
        {clearance.error ? (
          <ErrorState
            error={clearance.error}
            retry={() => void clearance.refresh()}
          />
        ) : clearance.loading && !clearance.data ? (
          <Loading />
        ) : clearance.data?.length ? (
          clearance.data.map((b) => (
            <Notice key={b.request.id}>
              {b.stage} · {b.owner}. {b.nextStep}
            </Notice>
          ))
        ) : (
          <Text style={{ color: colors.success }}>
            No outstanding task cash blocks approval.
          </Text>
        )}
        <Button variant="ghost" onPress={() => void clearance.refresh()}>
          Refresh cash clearance
        </Button>
      </Card>
      {submissions.loading && !submissions.data ? (
        <Loading />
      ) : submissions.error ? (
        <ErrorState
          error={submissions.error}
          retry={() => void submissions.refresh()}
        />
      ) : (
        submissions.data?.map((s) => (
          <Card key={s.id} title={`Submission ${s.version}`}>
            <Status value={s.status} />
            <LabelValue label="Submitted by" value={s.submitterName} />
            <LabelValue label="Submitted" value={dateLabel(s.submittedAt)} />
            <Text style={{ color: colors.text, lineHeight: 22 }}>{s.note}</Text>
            {!!s.decisionFeedback && <Notice>{s.decisionFeedback}</Notice>}
            {s.attachments.map((file) => (
              <Button
                key={file.id}
                variant="outline"
                onPress={() =>
                  void action.run(async () => {
                    const { data, error } = await supabase.storage
                      .from("task-attachments")
                      .createSignedUrl(file.filePath, 60);
                    if (error || !data)
                      throw new Error(
                        error?.message || "Could not open this evidence.",
                      );
                    await Linking.openURL(data.signedUrl);
                  })
                }
              >
                {file.fileName}
              </Button>
            ))}
          </Card>
        ))
      )}
      {!!mayReview && (
        <Card title="Review decision">
          <Field
            label="Review note / required change feedback"
            value={feedback}
            onChangeText={setFeedback}
            multiline
          />
          <Row>
            <Button
              busy={action.busy}
              disabled={
                clearance.loading ||
                !!clearance.error ||
                !clearance.data ||
                clearance.data.length > 0
              }
              onPress={() => void decide(true)}
            >
              Approve work
            </Button>
            <Button
              variant="outline"
              disabled={action.busy || !feedback.trim()}
              onPress={() => void decide(false)}
            >
              Request changes
            </Button>
          </Row>
          {!!action.error && <ErrorState error={action.error} />}
        </Card>
      )}
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
    </>
  );
}
