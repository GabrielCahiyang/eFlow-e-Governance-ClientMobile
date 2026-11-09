import { useState } from "react";
import { EvidenceAttachment } from "./EvidenceAttachment";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Status,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import {
  fetchTaskApprovalCashBlockers,
  useCashRequestUpdates,
} from "../budget";
import {
  fetchTaskSubmissions,
  fetchSubmissionAttachments,
} from "../../../core/web/app/features/reviews/services/reviewService";
import { verifyTask } from "../../../core/web/app/features/tasks/services/taskService";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { independentReviewAllowed } from "./reviewAccess";
import { assertEvidenceActor } from "./taskEvidence";

export function TaskReviewPanel({
  task,
  initialSubmissionId,
  onSaved,
  readOnly,
}: {
  task: Task;
  initialSubmissionId?: string;
  onSaved: () => Promise<void>;
  readOnly: boolean;
}) {
  const { profile } = useAuth();
  const [selectedId, setSelectedId] = useState(initialSubmissionId);
  const [feedback, setFeedback] = useState("");
  const [attempted, setAttempted] = useState<string>();
  const action = useAction();
  const scope = [profile?.id, task.id, task.updatedAt].join(":");
  const submissions = useFacts("submissions:" + scope, () =>
    fetchTaskSubmissions(task.id),
  );
  const latest = submissions.data?.[0];
  const selected = selectedId
    ? submissions.data?.find((item) => item.id === selectedId)
    : latest;
  const attachments = useFacts(
    "review-files:" + scope + ":" + selected?.id,
    () => fetchSubmissionAttachments(task.id, selected!.id),
    !!selected,
  );
  const mayReview =
    !readOnly &&
    !submissions.loading &&
    !submissions.error &&
    !!selected &&
    selected.id === latest?.id &&
    independentReviewAllowed(task, selected, profile?.id, profile?.role);
  const clearance = useFacts(
    "cash-clearance:" + scope,
    () => fetchTaskApprovalCashBlockers(task.id),
    mayReview,
  );
  useCashRequestUpdates(task.id, mayReview, clearance.refresh);

  const decide = (approve: boolean) =>
    action.run(async () => {
      if (!profile || !mayReview || !selected || attempted === selected.id)
        throw new Error("Current independent review access is required.");
      const reason = feedback.trim();
      if (!approve && !reason) throw new Error("Explain what needs to change.");
      if (
        !(await confirmAction(
          approve ? "Approve this submission?" : "Return this submission?",
          approve
            ? `Submission ${selected.version} will be approved if all server checks pass.`
            : reason,
          approve ? "Approve work" : "Request changes",
        ))
      )
        return;
      await assertEvidenceActor(profile.id);
      if (approve && (await fetchTaskApprovalCashBlockers(task.id)).length)
        throw new Error("Settle all outstanding task cash before approval.");
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", task.id)
        .is("deleted_at", null)
        .single();
      if (error) throw new Error(error.message);
      const currentTask = rowToTask(data);
      const [current] = await fetchTaskSubmissions(task.id);
      if (
        current?.id !== selected.id ||
        currentTask.orgId !== task.orgId ||
        currentTask.linkedProjectId !== task.linkedProjectId ||
        !independentReviewAllowed(
          currentTask,
          current,
          profile.id,
          profile.role,
        )
      )
        throw new Error(
          "This submission or your access changed. Refresh before deciding.",
        );
      await assertEvidenceActor(profile.id);
      setAttempted(selected.id);
      let failure: unknown;
      try {
        await verifyTask(task.id, approve, reason);
      } catch (error) {
        failure = error;
      }
      const result = (await fetchTaskSubmissions(task.id)).find(
        (item) => item.id === selected.id,
      );
      if (
        result?.status !== (approve ? "approved" : "changes_requested") ||
        result.decidedBy !== profile.id
      )
        throw new Error(
          failure instanceof Error
            ? failure.message
            : "The selected decision could not be confirmed. Refresh before trying again.",
        );
      setFeedback("");
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      await onSaved();
      await submissions.refresh();
    }, "Review decision confirmed.");

  return (
    <>
      <Card title="Evidence and review">
        <Status value={task.status} />
        {submissions.loading && !submissions.data ? (
          <Loading label="Loading evidence" layout="summary" rows={3} />
        ) : submissions.error ? (
          <ErrorState
            error={submissions.error}
            retry={() => void submissions.refresh()}
          />
        ) : !selected ? (
          <Empty
            kind="files"
            title={
              selectedId
                ? "This submission is unavailable"
                : "No evidence submitted yet"
            }
          />
        ) : (
          <>
            <LabelValue label="Evidence version" value={selected.version} />
            <LabelValue label="Submitted by" value={selected.submitterName} />
            <LabelValue
              label="Submitted"
              value={dateLabel(selected.submittedAt)}
            />
            <Status
              value={
                selected.status === "pending" ? "for_review" : selected.status
              }
            />
            <Text selectable>{selected.note}</Text>
            {!!selected.decidedByName && (
              <LabelValue label="Decided by" value={selected.decidedByName} />
            )}
            {!!selected.decidedAt && (
              <LabelValue
                label="Decision date"
                value={dateLabel(selected.decidedAt)}
              />
            )}
            {!!selected.decisionFeedback && (
              <Notice>{selected.decisionFeedback}</Notice>
            )}
            {!!profile &&
              selected.submitterId === profile.id &&
              selected.status === "pending" && (
                <Notice>
                  An independent reviewer must decide your submission.
                </Notice>
              )}
            {attachments.error ? (
              <ErrorState
                error={attachments.error}
                retry={() => void attachments.refresh()}
              />
            ) : attachments.loading ? (
              <Loading label="Loading evidence files" layout="files" />
            ) : attachments.data?.length ? (
              attachments.data.map((file) => (
                <EvidenceAttachment
                  key={file.id}
                  path={file.filePath}
                  name={file.fileName}
                />
              ))
            ) : (
              <Text>No files attached.</Text>
            )}
          </>
        )}
      </Card>
      {mayReview && (
        <Card title="Independent decision">
          {clearance.error ? (
            <ErrorState
              error={clearance.error}
              retry={() => void clearance.refresh()}
            />
          ) : clearance.loading ? (
            <Loading label="Checking cash clearance" layout="verification" />
          ) : clearance.data?.length ? (
            <Notice>Outstanding task cash blocks approval.</Notice>
          ) : null}
          <Field
            label="Feedback (required when requesting changes)"
            value={feedback}
            onChangeText={setFeedback}
            editable={!action.busy}
            maxLength={5000}
            multiline
          />
          <Row>
            <Button
              busy={action.busy}
              disabled={
                attempted === selected?.id ||
                clearance.loading ||
                !!clearance.error ||
                !clearance.data ||
                clearance.data.length > 0 ||
                attachments.loading ||
                !!attachments.error
              }
              onPress={() => void decide(true)}
            >
              Approve work
            </Button>
            <Button
              variant="outline"
              disabled={
                action.busy || attempted === selected?.id || !feedback.trim()
              }
              onPress={() => void decide(false)}
            >
              Request changes
            </Button>
          </Row>
        </Card>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      {!!attempted && !!action.error && (
        <Button
          variant="outline"
          onPress={() =>
            void action.run(async () => {
              const fresh = await fetchTaskSubmissions(task.id);
              await Promise.all([
                onSaved(),
                submissions.refresh(),
                clearance.refresh(),
              ]);
              if (fresh[0]?.id === attempted && fresh[0]?.status === "pending")
                setAttempted(undefined);
            })
          }
        >
          Check current decision
        </Button>
      )}
      {!!submissions.data && submissions.data.length > 1 && (
        <Card title="Submission history">
          {submissions.data.map((item) => (
            <Button
              variant="ghost"
              key={item.id}
              disabled={action.busy || item.id === selected?.id}
              onPress={() => {
                setSelectedId(item.id);
                setFeedback("");
                action.clear();
              }}
            >
              {`Submission ${item.version} · ${item.status.replaceAll("_", " ")}`}
            </Button>
          ))}
        </Card>
      )}
    </>
  );
}
