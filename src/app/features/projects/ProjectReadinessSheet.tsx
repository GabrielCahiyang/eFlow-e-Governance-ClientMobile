import { Text } from "../../components/ui/Typography";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { netProjectUpdates } from "./subscriptions";
import { View } from "../../components/ui/Primitives";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Loading,
  Row,
  Sheet,
  colors,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import {
  fetchReadiness,
  reviewProject,
  activateReadyProject,
} from "../../../core/web/app/features/project-readiness/services/readinessService";
import {
  fetchProjectCompletionReadiness,
  completeProject,
} from "../../../core/web/app/features/projects/services/projectLifecycleService";
import type { Project } from "../../../core/web/app/features/projects/services/types";
export function ProjectReadinessSheet({
  project,
  mode,
  onClose,
  onSaved,
  canManage,
}: {
  project: Project;
  mode: "setup" | "complete";
  onClose: () => void;
  onSaved: () => Promise<void>;
  canManage: boolean;
}) {
  const checks = useFacts("readiness:" + project.id, () =>
      fetchReadiness(project.id),
    ),
    completion = useFacts(
      "completion:" + project.id,
      () => fetchProjectCompletionReadiness(project.id),
      mode === "complete",
    );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void checks.refresh();
        void completion.refresh();
      }, 150);
    };
    const stop = netProjectUpdates(project.id, refresh);
    const poll = setInterval(() => {
      if (AppState.currentState === "active") refresh();
    }, 15000);
    return () => {
      stop();
      clearInterval(poll);
      if (timer) clearTimeout(timer);
    };
  }, [project.id, checks.refresh, completion.refresh]);
  const action = useAction(),
    [note, setNote] = useState(""),
    [confirm, setConfirm] = useState(false);
  const data = checks.data,
    remaining = data?.checks.filter((c) => !c.ok).length || 0;
  const execute = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    await action.run(async () => {
      if (!canManage)
        throw new Error("Current project management access is required.");
      if (mode === "setup") {
        const latest = await fetchReadiness(project.id);
        if (!latest.canActivate || latest.governed)
          throw new Error(
            "Readiness changed. Refresh the checks before activating.",
          );
        await activateReadyProject(project.id);
      } else {
        await completeProject(project.id, note);
      }
      await onSaved();
      onClose();
    });
  };
  return (
    <Sheet
      actionError={action.error}
      open
      title={mode === "setup" ? "Project setup" : "Completion requirements"}
      description={project.title}
      onClose={onClose}
      busy={action.busy}
      footer={
        <Row>
          <Button variant="outline" disabled={action.busy} onPress={onClose}>
            Done for now
          </Button>
          {!!canManage && (
            <Button
              busy={action.busy}
              disabled={
                !!checks.error ||
                checks.loading ||
                (mode === "complete" && completion.loading) ||
                !data ||
                (mode === "setup"
                  ? !data.canActivate || data.governed
                  : !completion.data?.canComplete)
              }
              onPress={() => void execute()}
            >
              {confirm
                ? mode === "setup"
                  ? "Confirm activation"
                  : "Confirm completion"
                : mode === "setup"
                  ? "Activate project"
                  : "Complete project"}
            </Button>
          )}
        </Row>
      }
    >
      {checks.loading && !data ? (
        <Loading
          layout="verification"
          label="Checking current project readiness…"
        />
      ) : checks.error ? (
        <ErrorState error={checks.error} retry={() => void checks.refresh()} />
      ) : (
        data && (
          <>
            <Card
              title={`${data.checks.length - remaining} of ${data.checks.length} checks confirmed`}
            >
              <Text style={{ color: colors.muted, lineHeight: 21 }}>
                {remaining
                  ? `${remaining} items need attention before activation.`
                  : "Current project reviews are confirmed."}
              </Text>
              <Text style={{ color: colors.muted }}>
                Checks update automatically.
              </Text>
            </Card>
            {data.checks.map((check) => (
              <Card key={check.key}>
                <Row>
                  {check.ok ? (
                    <CheckCircle2 size={20} color={colors.success} />
                  ) : (
                    <AlertCircle size={20} color={colors.warning} />
                  )}
                  <Text
                    style={{ flex: 1, color: colors.text, fontWeight: "600" }}
                  >
                    {check.label}
                  </Text>
                </Row>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>
                  {check.detail}
                </Text>
                {!!(
                  !check.ok &&
                  canManage &&
                  !data.governed &&
                  ["structure", "dates", "budget"].includes(check.key)
                ) && (
                  <Button
                    variant="outline"
                    disabled={action.busy}
                    onPress={() =>
                      void action.run(async () => {
                        await reviewProject(
                          project.id,
                          check.key as "structure" | "dates" | "budget",
                        );
                        await checks.refresh();
                        await completion.refresh();
                      })
                    }
                  >
                    Confirm review
                  </Button>
                )}
              </Card>
            ))}
          </>
        )
      )}
      {!!(mode === "complete") && (
        <>
          {!!completion.error && (
            <ErrorState
              error={completion.error}
              retry={() => void completion.refresh()}
            />
          )}
          {completion.data?.blockers.map((b) => (
            <Card key={b.kind + ":" + b.id} title={b.title}>
              <Text style={{ color: colors.warning, lineHeight: 20 }}>
                {b.detail}
              </Text>
            </Card>
          ))}
          <Field
            label="Completion note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </>
      )}
      {!!confirm && (
        <Text style={{ color: colors.primary }}>
          The current project and financial requirements must be met before saving.
        </Text>
      )}
    </Sheet>
  );
}
