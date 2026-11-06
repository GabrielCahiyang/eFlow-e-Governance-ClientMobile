import { useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  Card,
  Button,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Screen,
  SearchField,
  peso,
} from "../../components/ui";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { supabase } from "../../../platform/supabase";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { mapBudgetSummary } from "../../../core/web/app/features/budget/services/budgetMappers";
import { budgetReportRead } from "../../../core/web/app/features/budget/services/budgetReportReads";
import { useBudget } from "./useBudget";
import { CashRequestCard } from "./CashRequestCard";
import { financialOffices } from "./financialScope";
import {
  accountingView,
  accountingRequestVisible,
  cashRequestReference,
} from "./mobileFinanceScope";

export function OfficeBudgetScreen({
  initialView,
  navigate,
  recordId,
  officeId,
  fiscalYear,
}: {
  initialView?: string;
  navigate: Navigate;
  recordId?: string;
  officeId?: string;
  fiscalYear?: number;
}) {
  const { profile, organization, can } = useAuth();
  const accounting = profile?.role === "accounting_staff";
  const view = accountingView(initialView);
  const focused = useIsFocused();
  const [selectedOffice, setOffice] = useState(officeId || "");
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
      ? otherOffice?.id || ""
      : profile?.org_id || "";
  const officeName = otherOffice?.name || organization?.name || "Office";
  const detail = useBudget(view === "requests" && recordId ? orgId : "", year);
  const years = useFacts(
    `budget-years:${profile?.id}:${orgId}`,
    async () => {
      const { data, error } = await supabase
        .from("department_fiscal_budgets")
        .select("id,fiscal_year")
        .eq("org_id", orgId)
        .order("fiscal_year", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    !!orgId && view === "requests" && !recordId,
  );
  const fiscalBudgetId = years.data?.find(
    (row) => Number(row.fiscal_year) === year,
  )?.id;
  const queue = useFacts(
    `mobile-cash-queue:${profile?.id}:${orgId}:${fiscalBudgetId}`,
    async () => {
      const result = await budgetReportRead(() =>
        supabase
          .from("petty_cash_requests")
          .select(
            "id,request_number,purpose,status,requested_amount,released_amount",
            { count: "exact" },
          )
          .eq("fiscal_budget_id", fiscalBudgetId!)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }),
      );
      if (result.error) throw new Error(result.error.message);
      return (result.data || []).map((row) => ({
        id: String(row.id),
        requestNumber: Number(row.request_number),
        purpose: String(row.purpose || ""),
        status: String(row.status),
        requestedAmount: Number(row.requested_amount),
        releasedAmount: Number(row.released_amount || 0),
      }));
    },
    !!fiscalBudgetId && !recordId && focused,
  );
  const summary = useFacts(
    `mobile-financial-summary:${profile?.id}:${orgId}:${year}`,
    async () => {
      const result = await supabase.rpc("department_budget_summary", {
        p_org_id: orgId,
        p_fiscal_year: year,
      });
      if (result.error) throw new Error(result.error.message);
      if (!result.data) return null;
      if (
        Array.isArray(result.data) ||
        !result.data.id ||
        result.data.orgId !== orgId
      )
        throw new Error("Office financial scope could not be verified.");
      return mapBudgetSummary(result.data);
    },
    !!orgId && view === "overview",
  );
  const [search, setSearch] = useState("");
  const data = detail.data;
  const requests = (queue.data || []).filter(
    (request) =>
      accountingRequestVisible(request, accounting) &&
      `${cashRequestReference(request.requestNumber)} ${request.requestNumber} ${request.purpose}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const activeRequest = recordId
    ? data?.requests.find(
        (request) =>
          request.id === recordId &&
          accountingRequestVisible(request, accounting),
      )
    : undefined;

  return (
    <Screen
      compact
      title={
        view === "requests"
          ? "Requests & releases"
          : accounting
            ? "Accounting"
            : "Office Budget"
      }
      description={`${officeName} · FY ${year}`}
      onRefresh={() => {
        if (view === "overview") return summary.refresh();
        if (recordId) return detail.refresh();
        return Promise.all([years.refresh(), queue.refresh()]);
      }}
    >
      {view === "overview" && accounting && (
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
                label="Approved appropriation"
                value={peso(summary.data.approvedAmount)}
              />
              <LabelValue
                label="Settled spending"
                value={peso(summary.data.spentAmount)}
              />
              <LabelValue
                label="Available Office Budget"
                value={peso(summary.data.availableAmount)}
              />
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
              error="Fiscal years could not be loaded."
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
              <CashRequestCard
                key={activeRequest.id}
                request={activeRequest}
                bundle={data}
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
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search cash requests"
              />
              {requests.map((request) => (
                <NavigationRow
                  key={request.id}
                  title={`${cashRequestReference(request.requestNumber)} · ${request.purpose || "Cash request"}`}
                  description={`${peso(request.requestedAmount)} · ${request.status.replaceAll("_", " ")}`}
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
              ))}
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
