import {
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
import { useEffect } from "react";
import { netProjectUpdates } from "./subscriptions";
import { fetchProjectCompletionReadiness } from "../../../core/web/app/features/projects/services/projectLifecycleService";
import type { ProjectCompletionBlocker } from "../../../core/web/app/features/projects/services/projectLifecycleService";

type ProjectFundingTotals = {
  total: number;
  allocated: number;
  released: number;
  spent: number;
};
type FundingBlocker = ProjectCompletionBlocker & {
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
}: {
  projectId: string;
  showCloseout?: boolean;
}) {
  const { profile } = useAuth();
  const facts = useFacts(
    `project-funding-summary:${profile?.id}:${projectId}`,
    async () => {
      const { data, error } = await supabase.rpc("project_flow_snapshot", {
        p_project: projectId,
      });
      if (error) throw new Error(error.message);
      return data as ProjectFundingTotals | null;
    },
    !!profile,
  );
  const closeout = useFacts(
    `project-funding-closeout:${profile?.id}:${projectId}`,
    () => fetchProjectCompletionReadiness(projectId),
    !!profile && !!showCloseout,
  );
  useEffect(
    () =>
      netProjectUpdates(projectId, () => {
        void facts.refresh();
        void closeout.refresh();
      }),
    [projectId, facts.refresh, closeout.refresh],
  );
  const blockers =
    (closeout.data?.blockers as FundingBlocker[] | undefined) || [];
  const unused = blockers.find(
    (blocker) => blocker.unusedFunding,
  )?.unusedFunding;

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
      {blockers
        .filter((blocker) => blocker.kind === "cash")
        .map((blocker) => (
          <Card key={blocker.id} title={blocker.title}>
            <Notice>{blocker.detail}</Notice>
          </Card>
        ))}
      {unused && (
        <Card title="Return unused funding before completion">
          <Notice>
            Return unused task allocations to the project, then release the
            remaining funds to Office Budget in eFlow Web.
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
      {!unused && <Notice>Set up funding in eFlow Web.</Notice>}
    </Card>
  );
}
