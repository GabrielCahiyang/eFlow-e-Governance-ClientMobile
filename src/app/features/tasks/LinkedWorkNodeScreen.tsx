import {
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Screen,
  Status,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { supabase } from "../../../platform/supabase";
import {
  fetchWorkTree,
  WorkTreeUnavailable,
} from "../../../core/web/app/features/nested-work/services/workTreeService";
import { rowToSubtask } from "../../../core/web/app/features/subtasks";
import { WorkTreePanel } from "./WorkTreePanel";
import { OfficeSubitemActivity } from "./OfficeSubitemActivity";
import { TaskFundingCard } from "../budget/TaskFundingCard";
import type { AppRoute, Navigate } from "../../shared/routes";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";

export function LinkedWorkNodeScreen({
  route,
  navigate,
}: {
  route: AppRoute;
  navigate: Navigate;
}) {
  const { profile, organization } = useAuth();
  const actor = profile?.id;
  const personal = route.name === "personal_project";
  const rootId = personal ? route.taskId : route.id;
  const nodeId = route.nodeId;
  const projectId = personal ? route.id : route.projectId;
  const facts = useFacts(
    "linked-node:" + [actor, rootId, nodeId, projectId].join(":"),
    async () => {
      if (!rootId || !nodeId)
        throw new Error("This link is missing its task or subtask ID.");
      try {
        const tree = await fetchWorkTree(rootId);
        if (
          tree.root.kind !== (personal ? "personal" : "office") ||
          (projectId && tree.root.project !== projectId)
        )
          throw new Error(
            "This subtask is outside the linked project context.",
          );
        return {
          tree,
          node: tree.nodes.find(
            (item) => item.id === nodeId && item.task_id === rootId,
          ),
        };
      } catch (error) {
        if (!(error instanceof WorkTreeUnavailable) || personal) throw error;
        if (projectId) {
          const parent = await supabase
            .from("tasks")
            .select("linked_project_id")
            .eq("id", rootId)
            .maybeSingle();
          if (parent.error || parent.data?.linked_project_id !== projectId)
            throw new Error(
              "The linked project context could not be verified.",
            );
        }
        // Older Office feeds can carry a legacy subtask. Read only that exact record under RLS.
        const result = await supabase
          .from("subtasks")
          .select("*")
          .eq("task_id", rootId)
          .eq("id", nodeId)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        return { legacy: result.data ? rowToSubtask(result.data) : undefined };
      }
    },
  );
  const data = facts.data;
  return (
    <Screen
      compact
      title={data?.node?.title || data?.legacy?.title || "Linked subtask"}
      onRefresh={() => facts.refresh()}
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !data ? (
        <Loading label="Loading linked subtask" layout="task" />
      ) : data.tree && data.node ? (
        <WorkTreePanel
          data={data.tree}
          navigate={navigate}
          focusNodeId={data.node.id}
          readOnly={!data.tree.root.open || facts.loading}
          funding={
            !personal && data.tree.root.office ? (
              <TaskFundingCard
                key={data.node.id}
                task={{ id: data.tree.root.id, orgId: data.tree.root.office }}
                subtaskId={data.node.id}
                canManage={false}
                readOnly={!data.tree.root.open || facts.loading}
                onManageFunding={
                  data.tree.root.lead === actor ||
                  (profile?.org_id === data.tree.root.office &&
                    isAppointedOfficeHead(
                      profile,
                      organization ? [organization] : [],
                    ))
                    ? () =>
                        navigate({
                          ...route,
                          view: "funding_configuration",
                          projectId: data.tree!.root.project,
                        })
                    : undefined
                }
              />
            ) : undefined
          }
          onSaved={async () => {
            await facts.refresh();
          }}
        />
      ) : data.legacy ? (
        <>
          <Status value={data.legacy.status} />
          <LabelValue
            label="Progress"
            value={data.legacy.status === "completed" ? "100%" : "Unavailable"}
          />
          <OfficeSubitemActivity
            rootId={rootId}
            nodeId={data.legacy.id}
            actorId={actor || null}
          />
          {!!rootId && (
            <TaskFundingCard
              key={data.legacy.id}
              task={{ id: rootId }}
              subtaskId={data.legacy.id}
              canManage={false}
              readOnly
            />
          )}
        </>
      ) : (
        <Empty
          title="This subtask is no longer available"
          description="The linked task or branch may have changed, or access may have been withdrawn."
        />
      )}
    </Screen>
  );
}
