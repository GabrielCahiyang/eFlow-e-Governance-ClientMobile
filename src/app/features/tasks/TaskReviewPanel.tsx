import { statusLabel } from "../../shared/statusLabels";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import { EvidenceAttachment } from "./EvidenceAttachment";
import {
  Button,
  Card,
  DetailGroup,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Status,
  dateLabel,
  withOpacity,
} from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { PublicMessageError } from "../../shared/userMessages";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import {
  fetchTaskApprovalCashBlockers,
  useCashRequestUpdates,
  assertWorkAcceptanceAvailable,
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
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { profile } = useAuth();
  const [selectedId, setSelectedId] = useState(initialSubmissionId);
  const [feedback, setFeedback] = useState("");
  const [attempted, setAttempted] = useState<string>();
  const { toast } = useToast();
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
    (!submissions.loading || !!submissions.data) &&
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
        throw new PublicMessageError("Current independent review access is required.");
      const reason = feedback.trim();
      if (!approve && !reason) throw new PublicMessageError("Explain what needs to change.");
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
      if (approve) await assertWorkAcceptanceAvailable(task.id);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", task.id)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
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
        throw new PublicMessageError(
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
      ) {
        if (failure instanceof Error) throw failure;
        throw new PublicMessageError(
          "The selected decision could not be confirmed. Refresh before trying again.",
        );
      }
      setFeedback("");
      toast(approve ? "Work accepted. Any outstanding financial clearance remains required." : "Changes requested.", "success");
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      await onSaved();
      await submissions.refresh();
    }, "Review decision confirmed.");

  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";
  const selectedStatus = selected
    ? selected.status === "pending"
      ? "for_review"
      : selected.status
    : undefined;

  return (
    <>
      <Card
        title="Evidence and review"
        icon={<ClipboardCheck size={16} color={palette.primary} />}
        action={
          <Status
            value={task.status}
            work
            customId={task.customStatusId}
            variant="pill"
          />
        }
        style={{ gap: 12 }}
      >
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
            <View
              style={[
                styles.versionBanner,
                {
                  backgroundColor: insetSurface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={[styles.sectionCaption, { color: palette.mutedLabel }]}
                >
                  Review status
                </Text>
                {!!selectedStatus && (
                  <Status
                    value={selectedStatus}
                    label={statusLabel(selectedStatus)}
                    variant="pill"
                  />
                )}
              </View>
              <View
                style={[
                  styles.versionBadge,
                  {
                    backgroundColor: palette.primarySoft,
                    borderColor: withOpacity(palette.primary, 0.24),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.versionBadgeText,
                    { color: palette.primaryDark },
                  ]}
                >
                  v{selected.version}
                </Text>
              </View>
            </View>

            <DetailGroup>
              <LabelValue
                label="Submitted by"
                value={selected.submitterName}
              />
              <LabelValue
                label="Submitted"
                value={dateLabel(selected.submittedAt)}
              />
              {!!selected.decidedByName && (
                <LabelValue
                  label="Decided by"
                  value={selected.decidedByName}
                />
              )}
              {!!selected.decidedAt && (
                <LabelValue
                  label="Decision date"
                  value={dateLabel(selected.decidedAt)}
                />
              )}
            </DetailGroup>

            {!!selected.note && (
              <View
                style={[
                  styles.noteBox,
                  {
                    backgroundColor: insetSurface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text
                  style={[styles.sectionCaption, { color: palette.mutedLabel }]}
                >
                  Submission note
                </Text>
                <Text selectable style={{ color: palette.text, lineHeight: 20 }}>
                  {selected.note}
                </Text>
              </View>
            )}

            {!!selected.decisionFeedback && (
              <Notice
                tone={
                  selected.status === "changes_requested" ? "warning" : "info"
                }
              >
                {selected.decisionFeedback}
              </Notice>
            )}
            {!!profile &&
              selected.submitterId === profile.id &&
              selected.status === "pending" && (
                <Notice tone="review">
                  An independent reviewer must decide your submission.
                </Notice>
              )}

            <View style={{ gap: 8 }}>
              <Text
                style={[styles.sectionCaption, { color: palette.mutedLabel }]}
              >
                Attached evidence
              </Text>
              {attachments.error ? (
                <ErrorState
                  error={attachments.error}
                  retry={() => void attachments.refresh()}
                />
              ) : attachments.loading && !attachments.data ? (
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
                <Empty compact kind="files" title="No files attached" />
              )}
            </View>
          </>
        )}
      </Card>
      {mayReview && (
        <Card
          title="Independent decision"
          icon={<ShieldCheck size={16} color={palette.primary} />}
          badge={selected ? `v${selected.version}` : undefined}
          badgeTone="review"
          style={{ gap: 12 }}
        >
          {clearance.error ? (
            <ErrorState
              error={clearance.error}
              retry={() => void clearance.refresh()}
            />
          ) : clearance.loading && !clearance.data ? (
            <Loading label="Checking cash clearance" layout="verification" />
          ) : clearance.data?.length ? (
            <Notice tone="warning">
                Accepting the work unlocks required receipts. Outstanding cash still blocks final completion.
            </Notice>
          ) : null}
          <Field
            label="Feedback (required when requesting changes)"
            value={feedback}
            onChangeText={setFeedback}
            editable={!action.busy}
            maxLength={5000}
            multiline
          />
          <Button
            busy={action.busy}
            icon={<Check size={15} color={palette.onPrimary} />}
            disabled={
              attempted === selected?.id ||
              (clearance.loading && !clearance.data) ||
              !!clearance.error ||
              !clearance.data ||
              (attachments.loading && !attachments.data) ||
              !!attachments.error
            }
            onPress={() => void decide(true)}
          >
            Approve work
          </Button>
          <Button
            variant="outline"
            icon={<RotateCcw size={15} color={palette.primary} />}
            disabled={
              action.busy || attempted === selected?.id || !feedback.trim()
            }
            onPress={() => void decide(false)}
          >
            Request changes
          </Button>
        </Card>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!action.notice && <Notice tone="neutral">{action.notice}</Notice>}
      {!!attempted && !!action.error && (
        <Button
          variant="outline"
          icon={<RefreshCw size={15} color={palette.primary} />}
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
        <Card
          title="Submission history"
          icon={<History size={16} color={palette.primary} />}
          badge={`${submissions.data.length} versions`}
          style={{ gap: 8 }}
        >
          {submissions.data.map((item) => {
            const activeItem = item.id === selected?.id;
            const itemStatus =
              item.status === "pending" ? "for_review" : item.status;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Submission ${item.version} · ${statusLabel(item.status)}`}
                accessibilityState={{
                  disabled: action.busy || activeItem,
                  selected: activeItem,
                }}
                disabled={action.busy || activeItem}
                onPress={() => {
                  setSelectedId(item.id);
                  setFeedback("");
                  action.clear();
                }}
                style={({ pressed }) => [
                  styles.historyRow,
                  {
                    backgroundColor: activeItem
                      ? palette.primarySoft
                      : pressed
                        ? palette.primarySoft
                        : insetSurface,
                    borderColor: activeItem
                      ? withOpacity(palette.primary, 0.32)
                      : palette.border,
                  },
                ]}
              >
                <View style={styles.historyLead}>
                  <History
                    size={15}
                    color={activeItem ? palette.primary : palette.mutedLabel}
                  />
                  <Text
                    style={[
                      styles.historyTitle,
                      {
                        color: activeItem ? palette.primaryDark : palette.text,
                      },
                    ]}
                  >
                    Submission {item.version}
                  </Text>
                </View>
                <Status
                  value={itemStatus}
                  label={statusLabel(item.status)}
                  variant="pill"
                />
              </Pressable>
            );
          })}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  versionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  sectionCaption: {
    fontSize: 11.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  versionBadgeText: {
    fontSize: 12.5,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  noteBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  historyTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
