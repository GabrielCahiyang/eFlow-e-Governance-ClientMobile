import { Card, Empty, ErrorState, Loading } from "../../components/ui";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { useFacts } from "../../shared/useFacts";
import { supabase } from "../../../platform/supabase";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
import type { Navigate } from "../../shared/routes";

export function OfficeAttention({
  navigate,
  refreshToken,
}: {
  navigate: Navigate;
  refreshToken?: number;
}) {
  const { profile, can } = useAuth();
  const { selected } = useWorkspace();
  const office = selected?.workspace.office_id;
  const enabled =
    profile?.role === "head" && !!office && office === profile.org_id;
  const facts = useFacts(
    `office-attention:${profile?.id}:${office}:${refreshToken || 0}`,
    async () => {
      const today = getPhilippineCalendarDate();
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,status,linked_project_id,deadline")
        .eq("org_id", office!)
        .is("deleted_at", null)
        .is("archived_at", null)
        .not("status", "in", "(completed,cancelled)")
        .or(`status.in.(for_review,changes_requested),deadline.lte.${today}`)
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("id")
        .limit(6);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled,
  );
  if (!enabled) return null;
  return (
    <Card title="Office attention">
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data ? (
        <Loading label="Loading Office attention" layout="navigation" />
      ) : !facts.data.length ? (
        <Empty compact kind="work" title="No Office tasks need attention" />
      ) : (
        facts.data.map((task) => (
          <NavigationRow
            key={task.id}
            title={task.title}
            description={
              task.status === "for_review"
                ? "Awaiting review"
                : task.status === "changes_requested"
                  ? "Changes requested"
                  : "Due or overdue"
            }
            onPress={() =>
              navigate({
                name: "task",
                id: task.id,
                projectId: task.linked_project_id || undefined,
                title: task.title,
                view: task.status === "for_review" ? "review" : "details",
              })
            }
          />
        ))
      )}
      {can("navigation.team_supervision") && (
        <NavigationRow
          title="Office Team on eFlow Web"
          onPress={() => navigate({ name: "office_team" })}
        />
      )}
    </Card>
  );
}
