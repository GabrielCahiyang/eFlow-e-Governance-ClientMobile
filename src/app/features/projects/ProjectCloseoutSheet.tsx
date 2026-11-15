import { useCallback, useEffect } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import type { Navigate } from "../../shared/routes";
import { supabase } from "../../../platform/supabase";
import {
  archiveCompletedProject,
  completeProject,
  fetchProjectCompletionReadiness,
} from "../../../core/web/app/features/projects/services/projectLifecycleService";
import type { Project } from "../../../core/web/app/features/projects/services/types";
import { netProjectUpdates } from "./subscriptions";
import { useOfficeFinanceUpdates } from "../budget";

async function readCloseout(id: string) {
  const checks = await fetchProjectCompletionReadiness(id);
  if (checks.projectId !== id || typeof checks.canComplete !== "boolean")
    throw new PublicMessageError(
      "Could not verify this project's completion checks.",
    );
  return checks;
}

export function ProjectCloseoutSheet({
  project,
  actor,
  mode,
  workspaceId,
  navigate,
  onOpenFunding,
  onClose,
  onSaved,
}: {
  project: Project;
  actor: string;
  mode: "complete" | "archive";
  workspaceId?: string;
  navigate: Navigate;
  onOpenFunding: () => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const archive = mode === "archive";
  const label = archive ? "Archive project" : "Complete project";
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(actor, "project-closeout:" + project.id + ":" + mode),
    true,
    () => ({ note: "" }),
  );
  const note = draft.note;
  const { toast } = useToast();
  const action = useAction();
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  const facts = useFacts(
    JSON.stringify([
      "project-closeout",
      actor,
      workspaceId,
      project.id,
      archive,
    ]),
    () => readCloseout(project.id),
  );
  const reload = useCallback(() => facts.refresh(), [facts.refresh]);
  useEffect(
    () => netProjectUpdates(project.id, () => void reload()),
    [project.id, reload],
  );
  useOfficeFinanceUpdates(project.orgId || "", undefined, true, reload);
  const checks = facts.error ? undefined : facts.data;
  const ready = (current: typeof checks) =>
    !!current &&
    current.blockers.length === 0 &&
    (archive ? current.status === "completed" : current.canComplete);
  const submit = () =>
    action.run(async () => {
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor)
        throw new PublicMessageError(
          "Sign in with the same account to continue.",
        );
      try {
        const current = await readCloseout(project.id);
        if (!ready(current))
          throw new PublicMessageError(
            "Project requirements changed. Review the updated checks.",
          );
        if (archive) await archiveCompletedProject(project.id, note);
        else await completeProject(project.id, note);
      } catch (error) {
        await reload();
        throw error;
      }
      clearDraft();
      toast(archive ? "Project archived." : "Project completed.", "success");
      await onSaved().catch(() => {});
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title={label}
      description={project.title}
      busy={action.busy}
      onClose={close}
      footer={
        <Row>
          <Button variant="outline" disabled={action.busy} onPress={close}>
            Cancel
          </Button>
          <Button
            busy={action.busy}
            disabled={facts.loading || !ready(checks)}
            onPress={() => void submit()}
          >
            {archive ? "Confirm archive" : "Confirm completion"}
          </Button>
        </Row>
      }
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void reload()} />
      ) : !checks ? (
        <Loading label="Checking project requirements" layout="verification" />
      ) : ready(checks) ? (
        <Notice>
          {archive
            ? "The project is ready to archive."
            : "All completion checks passed."}
        </Notice>
      ) : (
        checks.blockers.map((blocker, index) => (
          <Card
            key={blocker.kind + ":" + blocker.id + ":" + index}
            title={blocker.title}
          >
            <Notice>{blocker.detail}</Notice>
            {typeof blocker.amount === "number" && (
              <LabelValue label="Amount" value={peso(blocker.amount)} />
            )}
            {(String(blocker.kind) === "funding" ||
              blocker.status === "unused_subtask_funding") && (
              <Button
                variant="outline"
                disabled={action.busy}
                onPress={onOpenFunding}
              >
                Open project funding
              </Button>
            )}
            {!!blocker.taskId && (
              <Button
                variant="outline"
                disabled={action.busy}
                onPress={() => {
                  onClose();
                  navigate({
                    name: "task",
                    id: blocker.taskId,
                    projectId: project.id,
                    workspaceId,
                    view:
                      blocker.kind === "cash" ||
                      blocker.status === "unused_subtask_funding"
                        ? "budget"
                        : "details",
                  });
                }}
              >
                Open task
              </Button>
            )}
          </Card>
        ))
      )}
      {checks && !ready(checks) && !checks.blockers.length && (
        <Notice>The project is not ready for this action.</Notice>
      )}
      <Field
        label={
          archive ? "Archive note (optional)" : "Completion note (optional)"
        }
        value={note}
        onChangeText={(next) => updateDraft({ note: next })}
        maxLength={2000}
        editable={!action.busy}
        multiline
      />
    </Sheet>
  );
}
