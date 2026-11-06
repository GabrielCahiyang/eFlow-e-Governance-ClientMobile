import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  peso,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { supabase } from "../../../platform/supabase";

type ProjectFundingTotals = {
  total: number;
  allocated: number;
  released: number;
  spent: number;
};

export function ProjectFundingSummary({
  projectId,
  onManageFunding,
}: {
  projectId: string;
  onManageFunding: () => void;
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
      <Button variant="outline" onPress={onManageFunding}>
        Funding setup on eFlow Web
      </Button>
    </Card>
  );
}
