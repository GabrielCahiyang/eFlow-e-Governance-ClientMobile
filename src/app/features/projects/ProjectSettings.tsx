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
import { useAction } from "../../shared/useAction";
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
  const [setup, setSetup] = useState(false);
  const [title, setTitle] = useState(project.title),
    [description, setDescription] = useState(project.description),
    [start, setStart] = useState(project.startDate || ""),
    [target, setTarget] = useState(project.targetDate || ""),
    [operation, setOperation] = useState<"archive" | "restore" | "delete">(),
    [reason, setReason] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const action = useAction(),
    closed = ["completed", "archived"].includes(project.status);
  const save = () =>
    action.run(async () => {
      if (!title.trim()) throw new Error("Project name is required.");
      if (start && target && target < start)
        throw new Error("Target date must be on or after the start date.");
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
      await onSaved();
    }, "Project details saved.");
  const lifecycle = () =>
    action.run(async () => {
      if (operation === "delete") {
        if (!reason.trim()) throw new Error("Reason for deletion is required.");
        if (confirmation !== project.title)
          throw new Error("Type the project name exactly to confirm.");
        await deleteProject(project.id, confirmation, reason);
        onDeleted();
      } else if (operation === "archive")
        await archiveProject(project.id, reason);
      else if (operation === "restore")
        await restoreProject(project.id, reason);
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
        {!!action.error && <ErrorState context="action" error={action.error} />}
      </Card>
      {!!canManage && (
        <Card title="Project lifecycle">
          {!!(project.status === "completed") && (
            <Button variant="outline" onPress={() => setOperation("archive")}>
              Archive project
            </Button>
          )}
          {!!(project.status === "archived") && (
            <Button variant="outline" onPress={() => setOperation("restore")}>
              Restore project
            </Button>
          )}
          <Button variant="danger" onPress={() => setOperation("delete")}>
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
          setOperation(undefined);
          setConfirmation("");
          action.clear();
        }}
        busy={action.busy}
        footer={
          <Row>
            <Button
              variant="outline"
              disabled={action.busy}
              onPress={() => setOperation(undefined)}
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
              ? "Reason for deletion *"
              : "Reason (optional)"
          }
          value={reason}
          onChangeText={setReason}
          multiline
        />
        {!!(operation === "delete") && (
          <Field
            label={`Type ${project.title} to confirm *`}
            value={confirmation}
            onChangeText={setConfirmation}
          />
        )}
      </Sheet>
    </>
  );
}
