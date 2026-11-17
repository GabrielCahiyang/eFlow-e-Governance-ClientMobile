import Coins from "lucide-react-native/icons/coins";
import Wallet from "lucide-react-native/icons/wallet";
import {
  AllocationBar,
  Button,
  Card,
  DetailGroup,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  MetricPair,
  Notice,
  peso,
} from "../../components/ui";
import { View } from "../../components/ui/Primitives";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
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
  const palette = useTheme();
  const { isDark } = useAppearance();
  const facts = useFacts(
    `project-funding-summary:${profile?.id}:${projectId}`,
    async () => {
      const { data, error } = await supabase.rpc("project_flow_snapshot", {
        p_project: projectId,
      });
      if (error) throw error;
      if (data && data.project?.id !== projectId)
        throw new PublicMessageError("Could not verify this project's funding.");
      return data as ProjectFundingTotals | null;
    },
    !!profile,
  );
  const closeout = useFacts(
    `project-funding-closeout:${profile?.id}:${projectId}`,
    async () => {
      const current = await fetchProjectCompletionReadiness(projectId);
      if (current.projectId !== projectId)
        throw new PublicMessageError(
          "Could not verify this project's completion checks.",
        );
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

  const allocPct =
    facts.data && facts.data.total > 0
      ? Math.min(100, Math.round((facts.data.allocated / facts.data.total) * 100))
      : 0;
  const insetSurface = isDark ? "#0f1733" : palette.background;

  return (
    <Card
      title="Project funding"
      icon={<Wallet size={16} color={palette.primary} />}
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading label="Loading project funding" layout="summary" rows={4} />
      ) : facts.data ? (
        <>
          <MetricPair
            items={[
              {
                label: "Authorized",
                value: peso(facts.data.total),
                icon: <Wallet size={18} color={palette.primary} />,
              },
              {
                label: "Unallocated",
                value: peso(facts.data.unallocated),
                tone: "success",
                icon: <Coins size={18} color={palette.success} />,
              },
            ]}
          />
          {facts.data.total > 0 && (
            <AllocationBar
              label="Project allocation progress"
              summary={`${allocPct}% · ${peso(facts.data.allocated)}`}
              percent={(facts.data.allocated / facts.data.total) * 100}
            />
          )}
          <DetailGroup>
            <LabelValue label="Allocated" value={peso(facts.data.allocated)} />
            <LabelValue
              label="Cash released"
              value={peso(facts.data.released)}
            />
            <LabelValue label="Actual spent" value={peso(facts.data.spent)} />
          </DetailGroup>
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
        <Notice tone="success">
          The project is ready to complete from Project options.
        </Notice>
      )}
      {cash.map((blocker) => (
        <View
          key={blocker.id}
          style={{
            backgroundColor: insetSurface,
            borderColor: palette.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            gap: 10,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{ fontSize: 15, fontWeight: "700", color: palette.text }}
          >
            {blocker.title}
          </Text>
          <Notice tone="danger">{blocker.detail}</Notice>
          {blocker.amount != null && (
            <DetailGroup inset={false}>
              <LabelValue
                label="Cash to clear"
                value={peso(blocker.amount)}
                tone="danger"
              />
            </DetailGroup>
          )}
          {blocker.taskId && (
            <Button
              variant="outline"
              icon={<Wallet size={16} color={palette.primary} />}
              onPress={() => openTaskFunding(blocker.taskId!)}
            >
              Open task funding
            </Button>
          )}
        </View>
      ))}
      {unusedSubtasks.length > 0 && (
        <Card
          flat
          title="Unused subtask funding"
          badge={String(unusedSubtasks.length)}
          badgeTone="warning"
        >
          <Notice tone="warning">
            The task lead returns these amounts to the parent task before
            closeout.
          </Notice>
          {unusedSubtasks.map((blocker) => (
            <View
              key={blocker.id}
              style={{
                backgroundColor: insetSurface,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 10,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{ fontSize: 15, fontWeight: "700", color: palette.text }}
              >
                {blocker.title}
              </Text>
              {blocker.amount != null && (
                <DetailGroup inset={false}>
                  <LabelValue
                    label="Unused"
                    value={peso(blocker.amount)}
                    tone="warning"
                  />
                </DetailGroup>
              )}
              {blocker.taskId && (
                <Button
                  variant="outline"
                  icon={<Wallet size={16} color={palette.primary} />}
                  onPress={() => openTaskFunding(blocker.taskId!)}
                >
                  Open task funding
                </Button>
              )}
            </View>
          ))}
        </Card>
      )}
      {unused && (
        <Card
          flat
          title="Return unused funding before completion"
          badgeTone="warning"
        >
          <Notice tone="warning">
            Return unused task allocations to the project, then release the
            remaining funds to Office Budget.
          </Notice>
          <DetailGroup>
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
          </DetailGroup>
        </Card>
      )}
    </Card>
  );
}
