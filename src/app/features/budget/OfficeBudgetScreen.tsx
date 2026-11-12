import { recordedPeso } from "../../components/ui/theme";
import { statusLabel } from "../../shared/statusLabels";
import { useCallback, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  Card,
  Button,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Screen,
  SearchField,
} from "../../components/ui";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { retryTransientRead } from "../../shared/retryTransientRead";
import type { Navigate } from "../../shared/routes";
import { supabase } from "../../../platform/supabase";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { officeFinancialSummary } from "./officeFinancialSummary";
import { budgetReportRead } from "../../../core/web/app/features/budget/services/budgetReportReads";
import { readOfficeCashRequest } from "./focusedSubtaskFunding";
import { useCashRequestUpdates } from "./useCashRequestUpdates";
import { useOfficeFinanceUpdates } from "./useOfficeFinanceUpdates";
import { BudgetReleaseHistory } from "./BudgetReleaseHistory";
import { CashRequestCard } from "./CashRequestCard";
import { financialOffices } from "./financialScope";
import {
  accountingView,
  accountingRequestVisible,
  cashRequestAmount,
  cashRequestReference,
  cashWorkflowStages,
} from "./mobileFinanceScope";

export function OfficeBudgetScreen({
  initialView,
  navigate,
  recordId,
  officeId,
  fiscalYear,
  releaseId,
}: {
  initialView?: string;
  navigate: Navigate;
  recordId?: string;
  officeId?: string;
  fiscalYear?: number;
  releaseId?: string;
}) {
  const { profile, organization, can } = useAuth();
  const accounting = profile?.role === "accounting_staff";
  const view = accountingView(initialView);
  const focused = useIsFocused();
  const [selectedOffice, setOffice] = useState(officeId || "");
  const [showBudgetReleases, setShowBudgetReleases] = useState(false);
  const [year, setYear] = useState(fiscalYear ?? getCurrentFiscalYear());
  const scopes = useFacts(
    "financial-offices:" + profile?.id,
    () => financialOffices(profile!.id, profile!.org_id || ""),
    !!profile && accounting,
  );
  const otherOffice = scopes.data?.find(
    (office) => office.id === selectedOffice,
  );
  const orgId =
    selectedOffice && selectedOffice !== profile?.org_id
      ? (!scopes.error ? otherOffice?.id : undefined) || ""
      : profile?.org_id || "";
  const officeName = otherOffice?.name || organization?.name || "Office";
  const detail = useFacts(
    JSON.stringify(["office-cash-request", profile?.id, orgId, year, recordId]),
    () =>
      retryTransientRead(() => readOfficeCashRequest(orgId, year, recordId!)),
    view === "requests" &&
      !!recordId &&
      !!orgId &&
      !!profile &&
      can("navigation.accounting_releases"),
  );
  const years = useFacts(
    `budget-years:${profile?.id}:${orgId}`,
    () =>
      retryTransientRead(async () => {
        const { data, error } = await supabase
          .from("department_fiscal_budgets")
          .select("id,fiscal_year")
          .eq("org_id", orgId)
          .order("fiscal_year", { ascending: false });
        if (error) throw error;
        return data;
      }),
    !!orgId && !recordId && (view === "requests" || showBudgetReleases),
  );
  const fiscalBudgetId = years.data?.find(
    (row) => Number(row.fiscal_year) === year,
  )?.id;
  const queue = useFacts(
    `mobile-cash-queue:${profile?.id}:${orgId}:${fiscalBudgetId}`,
    async () => {
      const result = await budgetReportRead(() => ({
        range: (from, to) =>
          retryTransientRead(async () => {
            const page = await supabase
              .from("petty_cash_requests")
              .select(
                "id,request_number,purpose,status,requested_amount,approved_amount,released_amount,actual_spent",
                { count: "exact" },
              )
              .eq("fiscal_budget_id", fiscalBudgetId!)
              .order("created_at", { ascending: false })
              .order("id", { ascending: true })
              .range(from, to);
            if (page.error)
              throw Object.assign(new Error(page.error.message), {
                status: page.status,
                code: page.error.code,
              });
            return page;
          }),
      }));
      if (result.error) throw new Error(result.error.message);
      return (result.data || []).map((row) => ({
        id: String(row.id),
        requestNumber: Number(row.request_number),
        purpose: String(row.purpose || ""),
        status: String(row.status),
        requestedAmount: Number(row.requested_amount),
        approvedAmount:
          row.approved_amount == null ? undefined : Number(row.approved_amount),
        releasedAmount:
          row.released_amount == null ? undefined : Number(row.released_amount),
        actualSpent:
          row.actual_spent == null ? undefined : Number(row.actual_spent),
      }));
    },
    !!fiscalBudgetId && !recordId && focused,
  );
  const summary = useFacts(
    `mobile-financial-summary:${profile?.id}:${orgId}:${year}`,
    () => officeFinancialSummary(orgId, year),
    !!orgId && view === "overview",
  );
  const [search, setSearch] = useState("");
  const [showStages, setShowStages] = useState(false);
  const data = detail.data;
  const requests = (queue.error || years.error ? [] : queue.data || []).filter(
    (request) =>
      accountingRequestVisible(request, accounting) &&
      `${cashRequestReference(request.requestNumber)} ${request.requestNumber} ${request.purpose}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const activeRequest =
    recordId && !detail.error
      ? data?.requests.find(
          (request) =>
            request.id === recordId &&
            accountingRequestVisible(request, accounting),
        )
      : undefined;

  const linkedWork = useFacts(
    `cash-work:${profile?.id}:${orgId}:${activeRequest?.id}`,
    async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,linked_project_id")
        .eq("id", activeRequest!.taskId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    !!activeRequest?.taskId && can("navigation.projects"),
  );
  useCashRequestUpdates(
    activeRequest?.taskId || "",
    !!activeRequest && focused,
    detail.refresh,
    activeRequest?.subtaskId,
  );
  const refreshFinance = useCallback(async () => {
    await Promise.all([summary.refresh(), queue.refresh()]);
  }, [summary.refresh, queue.refresh]);
  useOfficeFinanceUpdates(orgId, year, focused && !recordId, refreshFinance);
  return (
    <Screen
      compact
      title={view === "overview" ? "Accounting" : undefined}
      description={orgId ? `${officeName} · FY ${year}` : `FY ${year}`}
      onRefresh={() => {
        if (view === "overview") return summary.refresh();
        if (recordId) return detail.refresh();
        return Promise.all([years.refresh(), queue.refresh()]);
      }}
    >
      {accounting && !!scopes.error && (
        <ErrorState
          error="Other Offices could not be loaded."
          retry={() => void scopes.refresh()}
        />
      )}
      {accounting && (scopes.data?.length ?? 0) > 1 && !recordId && (
        <Choice
          label="Authorized Office"
          value={orgId}
          options={scopes.data!.map((office) => ({
            value: office.id,
            label: office.name,
          }))}
          onChange={(id) => {
            setOffice(id);
            setYear(getCurrentFiscalYear());
          }}
        />
      )}
      {view === "overview" && !!orgId && !!profile?.id && (
        <>
          <Button variant="outline" onPress={() => setShowBudgetReleases((visible) => !visible)}>
            {showBudgetReleases ? "Hide budget releases" : "View budget releases"}
          </Button>
          {showBudgetReleases && (
            <>
              {(years.data?.length ?? 0) > 1 && <Choice label="Budget fiscal year" value={String(year)}
                options={years.data!.map((row) => ({ value: String(row.fiscal_year), label: "FY " + row.fiscal_year }))}
                onChange={(value) => setYear(Number(value))} />}
              <BudgetReleaseHistory key={profile.id + ":" + orgId + ":" + year}
                actor={profile.id} office={orgId} year={year} onChanged={refreshFinance} />
            </>
          )}
        </>
      )}
      {view === "overview" && accounting && !!orgId && (
        <Card title="Cash work">
          {can("navigation.accounting_releases") && (
            <NavigationRow
              title="Requests & releases"
              description="Cash releases, acknowledgments and settlement records"
              onPress={() =>
                navigate({
                  name: "accounting_releases",
                  financialOfficeId: orgId,
                  fiscalYear: year,
                })
              }
            />
          )}
          <NavigationRow
            title="Assigned reviews"
            description="Receipt packages assigned to you"
            onPress={() => navigate({ name: "financial_reviews" })}
          />
        </Card>
      )}
      {!orgId ? (
        scopes.loading ? (
          <Loading label="Verifying Office access" layout="verification" />
        ) : (
          <Empty kind="finance" compact title="Office access unavailable" />
        )
      ) : view === "overview" ? (
        <Card title="Office budget summary">
          {summary.error ? (
            <ErrorState
              error={summary.error}
              retry={() => void summary.refresh()}
            />
          ) : summary.data ? (
            <>
              <LabelValue
                stacked
                label="Total allocated budget"
                value={recordedPeso(summary.data.approved)}
              />
              <LabelValue
                stacked
                label="Budget released"
                value={recordedPeso(summary.data.released)}
              />
              <LabelValue
                stacked
                label="Pending release"
                value={recordedPeso(summary.data.pending)}
              />
              <LabelValue
                stacked
                label="Settled expenditure"
                value={recordedPeso(summary.data.settled)}
              />
              <LabelValue
                stacked
                label="Available Office budget"
                value={recordedPeso(summary.data.available)}
              />
              <Notice>
                Only released budget can be committed. Scheduled releases use Philippine time.
              </Notice>
              {profile?.role === "head" && can("navigation.projects") && (
                <Button
                  variant="outline"
                  onPress={() =>
                    navigate({
                      name: "budget",
                      view: "annual",
                      financialOfficeId: orgId,
                      fiscalYear: year,
                    })
                  }
                >
                  Open Office Budget in eFlow Web
                </Button>
              )}
            </>
          ) : summary.loading ? (
            <Loading label="Loading Office summary" layout="summary" />
          ) : (
            <Empty
              kind="finance"
              compact
              title="No Office summary for this fiscal year"
            />
          )}
        </Card>
      ) : (
        <>
          {!recordId &&
            years.data?.some(
              (row) => Number(row.fiscal_year) !== getCurrentFiscalYear(),
            ) && (
              <Choice
                label="Fiscal year"
                value={String(year)}
                onChange={(value) => setYear(Number(value))}
                options={[
                  ...new Set([
                    getCurrentFiscalYear(),
                    ...years.data!.map((row) => Number(row.fiscal_year)),
                  ]),
                ].map((value) => ({
                  value: String(value),
                  label: `FY ${value}`,
                }))}
              />
            )}
          {!recordId && !!years.error && (
            <ErrorState
              error={years.error}
              retry={() => void years.refresh()}
            />
          )}
          {!!(recordId ? detail.error : queue.error) && (
            <ErrorState
              error={recordId ? detail.error! : queue.error!}
              retry={() => void (recordId ? detail.refresh() : queue.refresh())}
            />
          )}
          {activeRequest && data ? (
            <>
              {!linkedWork.error && linkedWork.data?.linked_project_id && (
                <NavigationRow
                  title="Open linked project"
                  onPress={() =>
                    navigate({
                      name: "project",
                      id: linkedWork.data!.linked_project_id,
                    })
                  }
                />
              )}
              {releaseId &&
                !data.releases.some(
                  (release) =>
                    release.id === releaseId &&
                    release.requestId === activeRequest.id,
                ) && (
                  <ErrorState error="This scheduled release is no longer available." />
                )}
              <CashRequestCard
                key={activeRequest.id}
                request={activeRequest}
                bundle={data}
                focusedReleaseId={releaseId}
                readOnly={
                  detail.loading ||
                  !!detail.error ||
                  !!(otherOffice && (scopes.loading || scopes.error))
                }
                onSaved={detail.refresh}
                onCorrect={() =>
                  navigate({
                    name: "task",
                    id: activeRequest.taskId,
                    nodeId: activeRequest.subtaskId,
                    view: "budget",
                    recordId: activeRequest.id,
                  })
                }
              />
            </>
          ) : recordId ? (
            detail.loading ? (
              <Loading label="Loading cash request" layout="request" />
            ) : (
              !detail.error && (
                <Empty
                  kind="finance"
                  compact
                  title="This cash request is unavailable here"
                />
              )
            )
          ) : (queue.loading || years.loading) && !queue.data ? (
            <Loading label="Loading cash requests" layout="navigation" />
          ) : (
            <>
              {queue.data && !queue.error && !years.error && (
                <>
                  <Button
                    variant="outline"
                    onPress={() => setShowStages((value) => !value)}
                  >
                    {showStages ? "Hide request stages" : "View request stages"}
                  </Button>
                  {showStages && (
                    <Card title="Requests by stage">
                      {cashWorkflowStages.map(([label, statuses]) => (
                        <LabelValue
                          key={label}
                          label={label}
                          value={
                            queue.data!.filter((row) =>
                              (statuses as readonly string[]).includes(
                                row.status,
                              ),
                            ).length
                          }
                        />
                      ))}
                      <Notice>
                        Counts include all requests visible in this Office and
                        fiscal year.
                      </Notice>
                    </Card>
                  )}
                </>
              )}
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search cash requests"
              />
              {requests.map((request) => {
                const amount = cashRequestAmount(request);
                return (
                  <NavigationRow
                    key={request.id}
                    title={`${cashRequestReference(request.requestNumber)} · ${request.purpose || "Cash request"}`}
                    description={`${statusLabel(request.status, "finance")} · ${amount.label} ${recordedPeso(amount.value)}`}
                    onPress={() =>
                      navigate({
                        name: "accounting_releases",
                        recordId: request.id,
                        financialOfficeId: orgId,
                        fiscalYear: year,
                        title: "Cash request",
                      })
                    }
                  />
                );
              })}
              {!requests.length && !queue.error && !years.error && (
                <Empty
                  kind="finance"
                  compact
                  title={
                    search
                      ? "No matching cash requests"
                      : "No cash requests here yet"
                  }
                  description={
                    search
                      ? "Try another reference or purpose."
                      : "Authorized requests for this Office and fiscal year will appear here."
                  }
                  action={
                    search ? (
                      <Button variant="outline" onPress={() => setSearch("")}>
                        Clear search
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onPress={() => void queue.refresh()}
                      >
                        Refresh cash requests
                      </Button>
                    )
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
