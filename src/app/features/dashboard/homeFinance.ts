import { supabase } from "../../../platform/supabase";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import {
  authorizedStatuses,
  releasedStatuses,
  reviewStatuses,
  cashWorkflowStages,
  cashRequestAmount,
  cashRequestReference,
} from "../budget/mobileFinanceScope";
import type { AppRoute } from "../../shared/routes";
import {
  getSettlementReview,
  headSettlementAction,
  settlementAllowsAccountingPosting,
} from "../budget/staffingEscalation";

async function fiscalBudget(office: string, year: number) {
  const { data, error } = await supabase
    .from("department_fiscal_budgets")
    .select("id,status")
    .eq("org_id", office)
    .eq("fiscal_year", year)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; status: string } | null;
}

const requestColumns =
  "id,task_id,subtask_id,purpose,request_number,status,needed_by,created_at,funding_org_id,requested_amount,approved_amount,released_amount,actual_spent";
const requestTitle = (row: { request_number: number; purpose: string }) =>
  [cashRequestReference(row.request_number), row.purpose]
    .filter(Boolean)
    .join(" · ");

export async function assignedFinanceReviews(actor: string, office: string) {
  const packs = await getAssignedIndependentReviews(actor);
  return packs
    .filter(
      ({ request, context, liquidation }) =>
        (request.fundingOrgId || request.orgId) === office &&
        context.current &&
        context.canReview &&
        context.review?.status === "pending" &&
        context.liquidationId === liquidation.id,
    )
    .slice(0, 5)
    .map(({ request, liquidation }) => ({
      key: "finance-review:" + liquidation.id,
      title: requestTitle({
        request_number: request.requestNumber,
        purpose: request.purpose,
      }),
      description: "Action required · Independent receipt review",
      route: {
        name: "financial_reviews",
        recordId: liquidation.id,
      } as AppRoute,
      priority: 1,
      sort: liquidation.submittedAt || Number.MAX_SAFE_INTEGER,
    }));
}

export async function headCashDecisions(
  office: string,
  year: number,
  workspaceId: string,
  actor: string,
  projectIds: ReadonlySet<string>,
) {
  const budget = await fiscalBudget(office, year);
  if (!budget || budget.status !== "locked") return [];
  const { data, error } = await supabase
    .from("petty_cash_requests")
    .select(
      `${requestColumns},org_id,requester_id,cash_recipient_id,leader_decided_by,tasks!inner(linked_project_id,assigned_to,recommendation_lead_id,projects(org_id,project_lead_id))`,
    )
    .eq("fiscal_budget_id", budget.id)
    .eq("funding_org_id", office)
    .eq("status", "pending_department_approval")
    .neq("requester_id", actor)
    .order("needed_by", { nullsFirst: false })
    .order("created_at")
    .order("id")
    .limit(15);
  if (error) throw error;
  type Candidate = {
    id: string;
    task_id: string;
    subtask_id?: string;
    purpose: string;
    request_number: number;
    needed_by?: string;
    created_at: string;
    org_id: string;
    requester_id: string;
    cash_recipient_id?: string;
    leader_decided_by?: string;
    tasks?: {
      linked_project_id?: string;
      assigned_to?: string;
      recommendation_lead_id?: string;
      projects?: { org_id: string; project_lead_id?: string } | null;
    };
  };
  const decisions = ((data ?? []) as unknown as Candidate[])
    .filter((row) => {
      if (
        !row.task_id ||
        [
          row.requester_id,
          row.cash_recipient_id,
          row.leader_decided_by,
        ].includes(actor) ||
        !row.tasks
      )
        return false;
      const project = row.tasks.projects;
      if (
        row.tasks.linked_project_id &&
        (!project || !projectIds.has(row.tasks.linked_project_id))
      )
        return false;
      const lead = project?.project_lead_id;
      return lead
        ? lead ===
            (row.tasks.assigned_to || row.tasks.recommendation_lead_id) ||
          lead === row.requester_id
          ? project?.org_id === office
          : lead === actor
        : row.org_id === office;
    })
    .slice(0, 5)
    .map((row) => ({
      key: "cash-decision:" + row.id,
      title: requestTitle(row),
      description: "Action required · Cash authorization",
      route: {
        name: "task",
        id: row.task_id,
        nodeId: row.subtask_id || undefined,
        projectId: row.tasks?.linked_project_id || undefined,
        recordId: row.id,
        view: "budget",
        workspaceId,
        workspaceKind: "office",
      } as AppRoute,
      priority:
        row.needed_by && row.needed_by <= getPhilippineCalendarDate() ? 0 : 1,
      sort: Date.parse(row.needed_by || row.created_at),
    }));
  const settlements = await settlementActions(
    budget.id,
    office,
    year,
    actor,
    true,
  );
  return [...decisions, ...settlements];
}

async function settlementActions(
  budget: string,
  office: string,
  year: number,
  actor: string,
  head: boolean,
) {
  const { data, error } = await supabase
    .from("petty_cash_liquidations")
    .select(
      "id,version,submitted_at,request_id,department_decided_at,petty_cash_requests!inner(id,purpose,request_number,liquidation_due_at,funding_org_id)",
    )
    .eq("status", "pending_department_settlement")
    .eq("petty_cash_requests.fiscal_budget_id", budget)
    .eq("petty_cash_requests.funding_org_id", office)
    .eq("petty_cash_requests.status", "pending_department_settlement")
    .order("submitted_at")
    .order("id")
    .limit(5);
  if (error) throw error;
  const verified = await Promise.allSettled(
    (data ?? []).map(async (row) => {
      const request = row.petty_cash_requests as unknown as {
        request_number: number;
        purpose: string;
        liquidation_due_at?: string;
      } | null;
      if (!request) return;
      const context = await getSettlementReview(row.id);
      if (
        !context.current ||
        context.version !== row.version ||
        (head
          ? !headSettlementAction(context, row.version)
          : !settlementAllowsAccountingPosting(context, actor) ||
            (!row.department_decided_at &&
              !!request.liquidation_due_at &&
              Date.parse(row.submitted_at) >
                Date.parse(request.liquidation_due_at)))
      )
        return;
      return {
        key: "settlement:" + row.id,
        title: requestTitle(request),
        requestId: row.request_id,
        description: head
          ? "Action required · Escalated settlement"
          : "Action required · Post settlement",
        route: (head
          ? {
              name: "financial_reviews",
              recordId: row.id,
              recordType: "settlement_staffing",
              financialOfficeId: office,
            }
          : {
              name: "accounting_releases",
              recordId: row.request_id,
              financialOfficeId: office,
              fiscalYear: year,
            }) as AppRoute,
        priority: 1,
        sort: Date.parse(row.submitted_at),
      };
    }),
  );
  return verified.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}

export async function accountingHomeQueue(
  office: string,
  year: number,
  actor: string,
  canRelease: boolean,
  canSettle: boolean,
) {
  const budget = await fiscalBudget(office, year);
  if (!budget) return null;
  const route = (id: string): AppRoute => ({
    name: "accounting_releases",
    recordId: id,
    financialOfficeId: office,
    fiscalYear: year,
    title: "Cash request",
  });
  const [counts, scheduled, open] = await Promise.all([
    Promise.all(
      cashWorkflowStages.map(async ([label, statuses]) => {
        const { count, error } = await supabase
          .from("petty_cash_requests")
          .select("id", { count: "exact", head: true })
          .eq("fiscal_budget_id", budget.id)
          .in("status", statuses);
        return { label, count: error ? null : count };
      }),
    ),
    canRelease && budget.status === "locked"
      ? supabase
          .from("petty_cash_releases")
          .select(
            "id,scheduled_date,petty_cash_requests!inner(id,purpose,request_number,funding_org_id)",
          )
          .eq("org_id", office)
          .eq("status", "scheduled")
          .eq("petty_cash_requests.fiscal_budget_id", budget.id)
          .eq("petty_cash_requests.org_id", office)
          .in("petty_cash_requests.status", authorizedStatuses)
          .not("petty_cash_requests.approved_amount", "is", null)
          .lte("scheduled_date", getPhilippineCalendarDate())
          .order("scheduled_date")
          .order("id")
          .limit(10)
      : { data: [], error: null },
    supabase
      .from("petty_cash_requests")
      .select(requestColumns)
      .eq("fiscal_budget_id", budget.id)
      .in("status", [
        ...authorizedStatuses,
        ...releasedStatuses,
        ...reviewStatuses,
      ])
      .order("needed_by", { nullsFirst: false })
      .order("id")
      .limit(10),
  ]);
  if (scheduled.error || open.error) throw scheduled.error || open.error;
  const releaseRequests = new Set<string>();
  const actions = (scheduled.data ?? []).flatMap((release) => {
    // The foreign key points to one request. Verify the returned scope as well.
    const request = release.petty_cash_requests as unknown as {
      id: string;
      funding_org_id: string;
      request_number: number;
      purpose: string;
    } | null;
    if (
      !request ||
      request.funding_org_id !== office ||
      releaseRequests.has(request.id)
    )
      return [];
    releaseRequests.add(request.id);
    return [
      {
        key: "cash-release:" + release.id,
        title: requestTitle(request),
        description: "Action required · Scheduled cash release",
        route: { ...route(request.id), id: release.id, recordType: "release" },
        priority: 0,
        sort: Date.parse(release.scheduled_date),
      },
    ];
  });
  const settlements = canSettle
    ? await settlementActions(budget.id, office, year, actor, false)
    : [];
  const settlementRequests = new Set(settlements.map((item) => item.requestId));
  const outstanding = (open.data ?? [])
    .filter(
      (row) => !releaseRequests.has(row.id) && !settlementRequests.has(row.id),
    )
    .slice(0, 5)
    .map((row) => {
      const amount = cashRequestAmount({
        status: row.status,
        requestedAmount: row.requested_amount,
        approvedAmount: row.approved_amount ?? undefined,
        releasedAmount: row.released_amount ?? undefined,
        actualSpent: row.actual_spent ?? undefined,
      });
      return {
        key: row.id,
        title: requestTitle(row),
        status: row.status,
        route: route(row.id),
        amount,
      };
    });
  return { counts, actions: [...actions, ...settlements], outstanding };
}
