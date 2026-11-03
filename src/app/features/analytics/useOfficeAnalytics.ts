import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../authentication";
import { fetchVisibleTasks } from "../tasks";
import { fetchProjects } from "../projects";
import { useFacts } from "../../shared/useFacts";
import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import type { Organization, UserProfile } from "../../../core/web/app/types";
import type { Employee } from "../../../core/web/app/services/employeeService";
import { getDepartmentEmployeeScopeIds } from "../../../core/web/app/features/members/services/departmentScope";
import { profileToDirectoryEmployee } from "../../../core/web/app/features/members/services/profileDirectoryAdapter";
import { isEligibleDepartmentDirectoryEmployee } from "../../../core/web/app/features/members/services/departmentDirectoryEligibility";
import {
  scopeTasks,
  scopeProjects,
} from "../../../core/web/app/features/tasks/selectors/scope";
import { fetchTeamWorkflowFacts } from "../../../core/web/app/features/team-management/services/teamWorkflowFactsService";
import { buildTeamAttentionItems } from "../../../core/web/app/features/team-management/selectors/attentionSelectors";
import { buildTeamHealthSummary } from "../../../core/web/app/features/team-management/selectors/healthSelectors";
import { buildTeamMemberMetrics } from "../../../core/web/app/features/team-management/selectors/teamMemberSelectors";
export function useOfficeAnalytics(includeCurrentUser = false) {
  const { profile } = useAuth();
  const result = useFacts(
    "office-analytics:" +
      profile?.id +
      ":" +
      profile?.org_id +
      ":" +
      includeCurrentUser,
    async () => {
      if (!profile?.org_id)
        throw new Error(
          "An assigned Office is required to load Office reports.",
        );
      const [visibleTasks, visibleProjects, orgs, profiles] = await Promise.all(
        [
          fetchVisibleTasks(),
          fetchProjects(),
          readAllRows<Organization>((from, to) =>
            supabase
              .from("organizations")
              .select("*", { count: "exact" })
              .order("id")
              .range(from, to),
          ),
          readAllRows<UserProfile>((from, to) =>
            supabase
              .from("profiles")
              .select("*", { count: "exact" })
              .order("id")
              .range(from, to),
          ),
        ],
      );
      const scope = getDepartmentEmployeeScopeIds(
          orgs,
          profile.org_id,
          "with_children",
        ),
        names = new Map(orgs.map((org) => [org.id, org.name]));
      const tasks = scopeTasks(visibleTasks, [...scope]),
        projects = scopeProjects(visibleProjects, [...scope]);
      const employees = profiles
        .map((person) => ({
          profile: person,
          employee: profileToDirectoryEmployee(person, names),
        }))
        .filter(
          (item): item is { profile: UserProfile; employee: Employee } =>
            !!item.employee &&
            isEligibleDepartmentDirectoryEmployee(item.employee, item.profile, {
              scopedOrgIds: scope,
              currentUserId: profile.id,
              currentUserEmail: profile.email,
              includeDepartmentHeads: true,
              includeCurrentUser,
              activeOnly: true,
              excludeAdmins: true,
            }),
        )
        .map((item) => item.employee);
      const facts = await fetchTeamWorkflowFacts(tasks.map((task) => task.id));
      const attention = buildTeamAttentionItems(tasks, facts),
        health = buildTeamHealthSummary(tasks, facts, attention),
        memberMetrics = buildTeamMemberMetrics(employees, tasks, facts);
      return {
        profiles,
        organizations: orgs,
        tasks,
        projects,
        employees,
        facts,
        attention,
        health,
        memberMetrics,
      };
    },
    !!profile && profile.role !== "admin",
  );
  useEffect(() => {
    if (!profile || profile.role === "admin") return;
    const poll = setInterval(() => void result.refresh(), 30000);
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void result.refresh();
    });
    return () => {
      clearInterval(poll);
      app.remove();
    };
  }, [profile?.id, profile?.org_id, result.refresh]);
  return result;
}
