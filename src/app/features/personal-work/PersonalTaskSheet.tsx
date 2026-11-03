import { useState } from "react";
import {
  Button,
  Choice,
  ErrorState,
  Field,
  Notice,
  Sheet,
} from "../../components/ui";
import type {
  PersonalCommand,
  PersonalMember,
  PersonalTask,
} from "../../../core/web/app/features/workspaces/types";
type Mode = "create" | "staff" | "progress" | "submit" | "review";
export function PersonalTaskSheet({
  mode,
  task,
  members,
  actor,
  busy,
  run,
  onClose,
}: {
  mode: Mode;
  task?: PersonalTask;
  members: PersonalMember[];
  actor: string;
  busy: boolean;
  run: (
    command: PersonalCommand,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(""),
    [lead, setLead] = useState(task?.lead_id || actor),
    [reviewer, setReviewer] = useState(task?.reviewer_id || ""),
    [progress, setProgress] = useState(String(task?.progress || 0)),
    [note, setNote] = useState(task?.note || ""),
    [decision, setDecision] = useState("approve"),
    [error, setError] = useState("");
  const eligible = members
    .filter((member) => member.state === "active" && member.eligible)
    .map((member) => ({ value: member.user_id, label: member.name }));
  const save = async () => {
    setError("");
    let command: PersonalCommand,
      payload: Record<string, unknown> = {
        task_id: task?.id,
        revision: task?.revision,
      };
    if (mode === "create" || mode === "staff") {
      if (
        !lead ||
        reviewer === lead ||
        (mode === "staff" && task?.reviewer_id && !reviewer)
      ) {
        setError(
          "Choose an eligible lead and a different reviewer. Required review cannot be removed.",
        );
        return;
      }
      if (mode === "create" && !title.trim()) {
        setError("Task name is required.");
        return;
      }
      command = mode === "create" ? "create_task" : "staff_task";
      payload = {
        ...(mode === "staff" ? payload : {}),
        ...(mode === "create" ? { title: title.trim() } : {}),
        lead_id: lead,
        reviewer_id: reviewer || null,
      };
    } else if (mode === "progress") {
      const amount = Number(progress);
      if (!Number.isInteger(amount) || amount < 0 || amount > 99) {
        setError("Progress must be a whole number from 0 to 99.");
        return;
      }
      command = "progress_task";
      payload = { ...payload, progress: amount, note };
    } else if (mode === "submit") {
      command = "submit_task";
      payload = { ...payload, note };
    } else {
      command = "review_task";
      payload = { ...payload, decision, note };
    }
    if (await run(command, payload)) onClose();
  };
  return (
    <Sheet
      open
      title={
        mode === "create"
          ? "Add personal task"
          : mode === "staff"
            ? "Task lead and reviewer"
            : mode === "progress"
              ? "Record personal progress"
              : mode === "submit"
                ? task?.reviewer_id
                  ? "Submit for independent review"
                  : "Mark personal task done"
                : "Review personal work"
      }
      description={task?.title}
      onClose={onClose}
      busy={busy}
      footer={
        <Button busy={busy} onPress={() => void save()}>
          Save
        </Button>
      }
    >
      {!!(mode === "create") && (
        <Field
          label="Task name"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
      )}
      {!!(mode === "create" || mode === "staff") && (
        <>
          <Choice
            label="Task lead"
            value={lead}
            onChange={(value) => {
              setLead(value);
              if (value === reviewer) setReviewer("");
            }}
            options={eligible}
          />
          <Choice
            label="Independent reviewer"
            value={reviewer}
            onChange={setReviewer}
            options={[
              {
                value: "",
                label: task?.reviewer_id
                  ? "Choose independent reviewer"
                  : "No review required",
              },
              ...eligible.filter((person) => person.value !== lead),
            ]}
          />
          <Notice>
            Personal review does not grant Office approval or financial
            authority. Staffing reopens submitted work for a new submission.
          </Notice>
        </>
      )}
      {!!(mode === "progress") && (
        <Field
          label="Progress (%)"
          value={progress}
          onChangeText={setProgress}
          keyboardType="number-pad"
        />
      )}
      {!!(mode === "review") && (
        <Choice
          label="Decision"
          value={decision}
          onChange={setDecision}
          options={[
            { value: "approve", label: "Approve personal work" },
            { value: "reject", label: "Return for changes" },
          ]}
        />
      )}
      {!["create", "staff"].includes(mode) && (
        <Field
          label={mode === "review" ? "Review note" : "Work update"}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={4000}
        />
      )}
      {!!error && <ErrorState error={error} />}
    </Sheet>
  );
}
