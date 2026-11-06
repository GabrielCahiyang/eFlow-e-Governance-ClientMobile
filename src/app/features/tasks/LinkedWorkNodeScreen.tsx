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
import type { AppRoute, Navigate } from "../../shared/routes";

export function LinkedWorkNodeScreen({
  route,
  navigate,
}: {
  route: AppRoute;
  navigate: Navigate;
}) {
  const actor = useAuth().profile?.id;
  const personal = route.name === "personal_project";
  const rootId = personal ? route.taskId : route.id;
  const nodeId = route.nodeId;
  const projectId = personal ? route.id : route.projectId;
  const facts = useFacts(
    "linked-node:" + [actor, rootId, nodeId, projectId].join(":"),
    async () => {
      if (!rootId || !nodeId)
        throw new Error("This link is missing its task or subitem ID.");
      try {
        const tree = await fetchWorkTree(rootId);
        if (
          tree.root.kind !== (personal ? "personal" : "office") ||
          (projectId && tree.root.project !== projectId)
        )
          throw new Error(
            "This subitem is outside the linked project context.",
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
      title={data?.node?.title || data?.legacy?.title || "Linked subitem"}
      onRefresh={() => facts.refresh()}

    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !data ? (
        <Loading label="Loading linked subitem" layout="task" />
      ) : data.tree && data.node ? (
        <WorkTreePanel
          data={data.tree}
          navigate={navigate}
          focusNodeId={data.node.id}
          readOnly={!data.tree.root.open || facts.loading}
          onSaved={async () => {
            await facts.refresh();
          }}
        />
      ) : data.legacy ? (
        <>
          <Status value={data.legacy.status} />
          <LabelValue
            label="Progress"
            value={data.legacy.percentComplete + "%"}
          />
          <Empty
            title="Subitem details available"
            description="Refresh this subitem to check which actions are available to you."
          />
        </>
      ) : (
        <Empty
          title="This subitem is no longer available"
          description="The linked task or branch may have changed, or access may have been withdrawn."
        />
      )}
    </Screen>
  );
}
