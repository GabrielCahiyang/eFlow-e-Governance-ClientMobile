import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  peso,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { supabase } from "../../../platform/supabase";
import { useCallback, useEffect } from "react";
import { netProjectUpdates } from "./subscriptions";
import { fetchProjectCompletionReadiness } from "../../../core/web/app/features/projects/services/projectLifecycleService";
import type { ProjectCompletionBlocker } from "../../../core/web/app/features/projects/services/projectLifecycleService";
import { useOfficeFinanceUpdates } from "../budget";
import type { Navigate } from "../../shared/routes";

type ProjectFundingTotals = {
  project: { id: string; org_id: string };
  total: number;
  allocated: number;
  unallocated: number;
  released: number;
  spent: number;
};
type FundingBlocker = Omit<ProjectCompletionBlocker, "kind"> & {
  kind: ProjectCompletionBlocker["kind"] | "funding";
  unusedFunding?: {
    unallocated: number;
    taskAllocations: Array<{
      id: string;
      task: string;
      source: string;
      fiscalYear?: number;
      available: number;
    }>;
  };
};

export function ProjectFundingSummary({
  projectId,
  showCloseout,
  workspaceId,
  navigate,
}: {
  projectId: string;
  showCloseout?: boolean;
  workspaceId?: string;
  navigate: Navigate;
}) {
  const { profile } = useAuth();
  const facts = useFacts(
    `project-funding-summary:${profile?.id}:${projectId}`,
    async () => {
      const { data, error } = await supabase.rpc("project_flow_snapshot", {
        p_project: projectId,
      });
      if (error) throw new Error(error.message);
      if (data && data.project?.id !== projectId)
        throw new Error("Could not verify this project's funding.");
      return data as ProjectFundingTotals | null;
    },
    !!profile,
  );
  const closeout = useFacts(
    `project-funding-closeout:${profile?.id}:${projectId}`,
    async () => {
      const current = await fetchProjectCompletionReadiness(projectId);
      if (current.projectId !== projectId)
        throw new Error("Could not verify this project's completion checks.");
      return current;
    },
    !!profile && !!showCloseout,
  );
  const refresh = useCallback(async () => {
    await Promise.all([facts.refresh(), closeout.refresh()]);
  }, [facts.refresh, closeout.refresh]);
  useEffect(() => {
    if (!profile?.id) return;
    return netProjectUpdates(projectId, () => void refresh());
  }, [profile?.id, projectId, refresh]);
  useOfficeFinanceUpdates(
    facts.data?.project.org_id || "",
    undefined,
    !!profile && !facts.error,
    refresh,
  );
  const blockers = closeout.error
    ? []
    : ((closeout.data?.blockers as FundingBlocker[] | undefined) ?? []);
  const unused = blockers.find(
    (blocker) => blocker.unusedFunding,
  )?.unusedFunding;
  const unusedSubtasks = blockers.filter(
    (blocker) => blocker.status === "unused_subtask_funding",
  );
  const cash = blockers.filter((blocker) => blocker.kind === "cash");
  const openTaskFunding = (taskId: string) =>
    navigate({
      name: "task",
      id: taskId,
      projectId,
      workspaceId,
      view: "budget",
    });

  return (
    <Card title="Project funding">
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading label="Loading project funding" layout="summary" rows={4} />
      ) : facts.data ? (
        <>
          <LabelValue label="Authorized" value={peso(facts.data.total)} />
          <LabelValue label="Allocated" value={peso(facts.data.allocated)} />
          <LabelValue
            label="Unallocated"
            value={peso(facts.data.unallocated)}
          />
          <LabelValue label="Cash released" value={peso(facts.data.released)} />
          <LabelValue label="Actual spent" value={peso(facts.data.spent)} />
        </>
      ) : (
        <Empty kind="finance" title="Project funding summary unavailable" />
      )}
      {showCloseout && !!closeout.error && (
        <ErrorState
          error={closeout.error}
          retry={() => void closeout.refresh()}
        />
      )}
      {showCloseout && !closeout.error && closeout.data?.canComplete && (
        <Notice>The project is ready to complete from Project options.</Notice>
      )}
      {cash.map((blocker) => (
        <Card key={blocker.id} title={blocker.title}>
          <Notice>{blocker.detail}</Notice>
          {blocker.amount != null && (
            <LabelValue label="Cash to clear" value={peso(blocker.amount)} />
          )}
          {blocker.taskId && (
            <Button
              variant="outline"
              onPress={() => openTaskFunding(blocker.taskId!)}
            >
              Open task funding
            </Button>
          )}
        </Card>
      ))}
      {unusedSubtasks.length > 0 && (
        <Card title="Unused subtask funding">
          <Notice>
            The task lead returns these amounts to the parent task before
            closeout.
          </Notice>
          {unusedSubtasks.map((blocker) => (
            <Card key={blocker.id} title={blocker.title}>
              {blocker.amount != null && (
                <LabelValue label="Unused" value={peso(blocker.amount)} />
              )}
              {blocker.taskId && (
                <Button
                  variant="outline"
                  onPress={() => openTaskFunding(blocker.taskId!)}
                >
                  Open task funding
                </Button>
              )}
            </Card>
          ))}
        </Card>
      )}
      {unused && (
        <Card title="Return unused funding before completion">
          <Notice>
            Return unused task allocations to the project, then release the
            remaining funds to Office Budget.
          </Notice>
          {unused.taskAllocations.map((line) => (
            <LabelValue
              key={line.id}
              label={`${line.task} · ${line.source}${line.fiscalYear ? ` · FY ${line.fiscalYear}` : ""}`}
              value={peso(line.available)}
            />
          ))}
          {unused.unallocated > 0 && (
            <LabelValue
              label="Unallocated in the project"
              value={peso(unused.unallocated)}
            />
          )}
        </Card>
      )}
      {showCloseout && (
        <Button
          variant="outline"
          onPress={() =>
            navigate({
              name: "project",
              id: projectId,
              workspaceId,
              view: "funding_configuration",
              title: "Project budget",
            })
          }
        >
          Open project budget in eFlow Web
        </Button>
      )}
    </Card>
  );
}
