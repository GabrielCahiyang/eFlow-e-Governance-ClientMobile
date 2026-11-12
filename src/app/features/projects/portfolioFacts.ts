import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { rowToProject } from "../../../core/web/app/features/projects/services/projectMappers";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
import { buildProjectPortfolioSummary } from "../../../core/web/app/features/projects/selectors/projectCommandSelectors";

export const projectLifecycle = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;

export function verifiedProjectStatus(value: unknown) {
  return typeof value === "string" &&
    projectLifecycle.includes(value as (typeof projectLifecycle)[number])
    ? value
    : undefined;
}

export async function readPortfolioFacts(ids: string[]) {
  if (!ids.length)
    return {
      projects: [] as Record<string, unknown>[],
      tasks: [] as Record<string, unknown>[],
      offices: [] as Record<string, unknown>[],
      owners: [] as Record<string, unknown>[],
    };
  const batches = Array.from(
    { length: Math.ceil(ids.length / 100) },
    (_, index) => ids.slice(index * 100, index * 100 + 100),
  );
  const projects: Record<string, unknown>[] = [];
  const tasks: Record<string, unknown>[] = [];
  for (const batch of batches) {
    const [projectRows, taskRows] = await Promise.all([
      readAllRows<Record<string, unknown>>((from, to) =>
        supabase
          .from("projects")
          .select("id,status,org_id,owner_id,target_date,description", {
            count: "exact",
          })
          .in("id", batch)
          .order("id")
          .range(from, to),
      ),
      readAllRows<Record<string, unknown>>((from, to) =>
        supabase
          .from("tasks")
          .select(
            "id,linked_project_id,status,deadline,due_date,archived_at,assigned_to,recommendation_lead_id",
            {
              count: "exact",
            },
          )
          .in("linked_project_id", batch)
          .is("deleted_at", null)
          .order("id")
          .range(from, to),
      ),
    ]);
    projects.push(...projectRows);
    tasks.push(...taskRows);
  }
  const officeIds = [
    ...new Set(
      projects
        .map((row) => row.org_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const ownerIds = [
    ...new Set(
      projects
        .map((row) => row.owner_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const [offices, owners] = await Promise.all([
    officeIds.length
      ? readAllRows<Record<string, unknown>>((from, to) =>
          supabase
            .from("organizations")
            .select("id,name", { count: "exact" })
            .in("id", officeIds)
            .order("id")
            .range(from, to),
        ).catch(() => [])
      : Promise.resolve([]),
    ownerIds.length
      ? readAllRows<Record<string, unknown>>((from, to) =>
          supabase
            .from("profiles")
            .select("id,full_name", { count: "exact" })
            .in("id", ownerIds)
            .order("id")
            .range(from, to),
        ).catch(() => [])
      : Promise.resolve([]),
  ]);
  return { projects, tasks, offices, owners };
}

export function portfolioSummary(
  project: Record<string, unknown>,
  tasks: Record<string, unknown>[],
) {
  if (!verifiedProjectStatus(project.status)) return undefined;
  return buildProjectPortfolioSummary(
    rowToProject(project),
    tasks
      .filter((task) => task.linked_project_id === project.id)
      .map(rowToTask),
  );
}
