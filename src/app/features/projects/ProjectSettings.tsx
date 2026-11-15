import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import {
  Button,
  Card,
  DateField,
  ErrorState,
  Field,
  Row,
  Sheet,
  colors,
} from "../../components/ui";
import { ProjectSetupSheet } from "./ProjectSetupSheet";
import { useAuth } from "../authentication";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { PublicMessageError } from "../../shared/userMessages";
import {
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
} from "../../../core/web/app/features/projects/services/projectService";
import type { Project } from "../../../core/web/app/features/projects/services/types";
export function ProjectSettings({
  project,
  canManage,
  onSaved,
  onDeleted,
}: {
  project: Project;
  canManage: boolean;
  onSaved: () => Promise<void>;
  onDeleted: () => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [setup, setSetup] = useState(false);
  const [title, setTitle] = useState(project.title),
    [description, setDescription] = useState(project.description),
    [start, setStart] = useState(project.startDate || ""),
    [target, setTarget] = useState(project.targetDate || ""),
    [operation, setOperation] = useState<"archive" | "restore" | "delete">();
  const [lifecycleDraft, updateLifecycleDraft, clearLifecycleDraft] =
    useRetainedDraft(
      formDraftKey(
        profile?.id,
        "project-lifecycle:" + project.id + ":" + (operation ?? "none"),
      ),
      !!operation,
      () => ({ reason: "", confirmation: "" }),
    );
  const { reason, confirmation } = lifecycleDraft;
  const action = useAction(),
    closed = ["completed", "archived"].includes(project.status);
  const save = () =>
    action.run(async () => {
      if (!title.trim()) throw new PublicMessageError("Project name is required.");
      if (start && target && target < start)
        throw new PublicMessageError("Target date must be on or after the start date.");
      await updateProject(
        project.id,
        {
          title,
          description,
          startDate: start || undefined,
          targetDate: target || undefined,
        },
        project.metadataVersion,
      );
      toast("Project details saved.", "success");
      await onSaved();
    }, "Project details saved.");
  const lifecycle = () =>
    action.run(async () => {
      if (operation === "delete") {
        if (!reason.trim()) throw new PublicMessageError("Reason for deletion is required.");
        if (confirmation !== project.title)
          throw new PublicMessageError("Type the project name exactly to confirm.");
        await deleteProject(project.id, confirmation, reason);
        toast("Project deleted.", "success");
        onDeleted();
      } else if (operation === "archive") {
        await archiveProject(project.id, reason);
        toast("Project archived.", "success");
      } else if (operation === "restore") {
        await restoreProject(project.id, reason);
        toast("Project restored.", "success");
      }
      clearLifecycleDraft();
      setOperation(undefined);
      await onSaved();
    });
  return (
    <>
      {canManage && project.status === "planning" && (
        <Button onPress={() => setSetup(true)}>Project setup</Button>
      )}
      {setup && (
        <ProjectSetupSheet
          orgId={profile?.org_id || undefined}
          projectId={project.id}
          onClose={() => setSetup(false)}
          onDone={() => {
            setSetup(false);
            void onSaved().catch(() => {});
          }}
        />
      )}
      <Card title="Project settings">
        <Field
          label="Project name"
          required
          value={title}
          onChangeText={setTitle}
          editable={canManage && !closed}
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          editable={canManage && !closed}
        />
        <DateField
          label="Start date"
          value={start}
          onChange={setStart}
          disabled={!canManage || closed}
        />
        <DateField
          label="Target date"
          value={target}
          onChange={setTarget}
          disabled={!canManage || closed}
        />
        {!!(canManage && !closed) && (
          <Button busy={action.busy} onPress={() => void save()}>
            Save changes
          </Button>
        )}
        {!!action.notice && (
          <Text style={{ color: colors.success }}>{action.notice}</Text>
        )}
        {!operation && !!action.error && (
          <ErrorState context="action" error={action.error} />
        )}
      </Card>
      {!!canManage && (
        <Card title="Project lifecycle">
          {!!(project.status === "completed") && (
            <Button
              variant="outline"
              onPress={() => {
                action.clear();
                setOperation("archive");
              }}
            >
              Archive project
            </Button>
          )}
          {!!(project.status === "archived") && (
            <Button
              variant="outline"
              onPress={() => {
                action.clear();
                setOperation("restore");
              }}
            >
              Restore project
            </Button>
          )}
          <Button
            variant="danger"
            onPress={() => {
              action.clear();
              setOperation("delete");
            }}
          >
            Permanently delete project
          </Button>
        </Card>
      )}
      <Sheet
        actionError={action.error}
        open={!!operation}
        title={
          operation === "delete"
            ? "Permanently delete project"
            : operation === "restore"
              ? "Restore project"
              : "Archive project"
        }
        onClose={() => {
          if (!action.busy) {
            setOperation(undefined);
            action.clear();
          }
        }}
        busy={action.busy}
        footer={
          <Row>
            <Button
              variant="outline"
              disabled={action.busy}
              onPress={() => {
                if (!action.busy) {
                  setOperation(undefined);
                  action.clear();
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant={operation === "delete" ? "danger" : "primary"}
              busy={action.busy}
              onPress={() => void lifecycle()}
            >
              {operation === "delete"
                ? "Delete permanently"
                : operation === "restore"
                  ? "Restore project"
                  : "Archive project"}
            </Button>
          </Row>
        }
      >
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          {operation === "delete"
            ? "This action cannot be undone. The project container, milestones and membership list will be removed. Existing task and audit history remain, with operational project links cleared."
            : operation === "restore"
              ? "Restore this project to active work. Current access and lifecycle rules still apply."
              : "Archive this completed project. Its history, financial obligations and reports remain available."}
        </Text>
        <Field
          label={
            operation === "delete"
              ? "Reason for deletion"
              : "Reason (optional)"
          }
          required={operation === "delete"}
          value={reason}
          onChangeText={(next) => updateLifecycleDraft({ reason: next })}
          multiline
        />
        {!!(operation === "delete") && (
          <Field
            label={`Type ${project.title} to confirm`}
            required
            value={confirmation}
            onChangeText={(next) => updateLifecycleDraft({ confirmation: next })}
          />
        )}
      </Sheet>
    </>
  );
}
