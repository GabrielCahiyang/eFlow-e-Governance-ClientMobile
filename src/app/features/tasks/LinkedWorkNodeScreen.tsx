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
import { fetchProject } from "../projects/services";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import { useWorkRecordUpdates } from "./useWorkRecordUpdates";

export function LinkedWorkNodeScreen({
  route,
  navigate,
}: {
  route: AppRoute;
  navigate: Navigate;
}) {
  const { profile } = useAuth();
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
        if (!personal) await fetchProject(tree.root.project);
        const node = tree.nodes.find(
          (item) => item.id === nodeId && item.task_id === rootId,
        );
        return { tree, node };
      } catch (error) {
        if (!(error instanceof WorkTreeUnavailable) || personal) throw error;
        {
          const parent = await supabase
            .from("tasks")
            .select("linked_project_id")
            .eq("id", rootId)
            .maybeSingle();
          if (
            parent.error ||
            !parent.data ||
            (projectId && parent.data.linked_project_id !== projectId)
          )
            throw new Error(
              "The linked project context could not be verified.",
            );
          if (parent.data.linked_project_id)
            await fetchProject(parent.data.linked_project_id);
        }
        // Older Office feeds can carry a legacy subtask. Read only that exact record under RLS.
        const result = await supabase
          .from("subtasks")
          .select("*")
          .eq("task_id", rootId)
          .eq("id", nodeId)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        return {
          legacy: result.data ? rowToSubtask(result.data) : undefined,
          customStatusId: typeof result.data?.custom_status_id === "string" ? result.data.custom_status_id : undefined,
        };
      }
    },
  );
  useWorkRecordUpdates(rootId, facts.refresh, personal);
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
                task={{
                  id: data.tree.root.id,
                  orgId: data.tree.root.office,
                  status: data.tree.root.status === "completed" || data.tree.root.status === "cancelled"
                    ? data.tree.root.status
                    : undefined,
                }}
                subtaskId={data.node.id}
                canManage={false}
                readOnly={!data.tree.root.open || facts.loading}
                showWebSetup={data.tree.root.lead === actor}
              />
            ) : undefined
          }
          onSaved={async () => {
            await facts.refresh();
          }}
        />
      ) : data.legacy ? (
        <>
          <Status value={data.legacy.status} work customId={data.customStatusId} />
          <LabelValue
            label="Due date"
            value={workDateLabel(data.legacy.dueDate, "Asia/Manila")}
          />
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
