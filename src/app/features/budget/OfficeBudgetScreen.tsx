import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Status,
  Tabs,
  dateLabel,
  peso,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { WorkspaceLoadingSkeleton } from "../../components/ui/loading/WorkspaceLoadingSkeleton";
import { OfficePettyCash } from "../office-petty-cash";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { fetchDepartmentFiscalYears } from "../../../core/web/app/features/budget/services/budgetService";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import { useBudget } from "./useBudget";
import { AnnualBudgetSheet } from "./AnnualBudgetSheet";
import { BudgetReleaseHistory } from "./BudgetReleaseHistory";
import { BudgetOverview } from "./BudgetOverview";
import { CashRequestCard } from "./CashRequestCard";
import { SettlementPanel } from "./SettlementPanel";
import { AccountMappings } from "./AccountMappings";
import { JournalPanel } from "./JournalPanel";
import type { Navigate } from "../../shared/routes";
import { financialOffices } from "./financialScope";
import { BudgetExport } from "./BudgetExport";
import { AllocationDecision } from "./AllocationDecision";
export function OfficeBudgetScreen({
  initialView = "overview",
  navigate,
}: {
  initialView?: string;
  navigate: Navigate;
}) {
  const { profile, organization, can } = useAuth(),
    [orgId, setOrgId] = useState(profile?.org_id || ""),
    [year, setYear] = useState(getCurrentFiscalYear),
    [view, setView] = useState(initialView),
    [edit, setEdit] = useState(false),
    [search, setSearch] = useState(""),
    [cashStatus, setCashStatus] = useState("all");
  const [queue, setQueue] = useState("all");
  const scopes = useFacts(
    "financial-offices:" + profile?.id,
    () => financialOffices(profile!.id, profile!.org_id || ""),
    !!profile,
  );
  const selectedOffice = scopes.data?.find((office) => office.id === orgId);
  const facts = useBudget(orgId, year),
    years = useFacts(
      `budget-years:${profile?.id}:${orgId}`,
      () => fetchDepartmentFiscalYears(orgId),
      !!orgId,
    ),
    reviews = useFacts(
      `assigned-financial-reviews:${profile?.id}`,
      () => getAssignedIndependentReviews(profile!.id),
      !!profile && view === "reviews",
    );
  const data = facts.data,
    head =
      isAppointedOfficeHead(profile, organization ? [organization] : []) &&
      profile?.org_id === orgId,
    accounting = profile?.role === "accounting_staff",
    refresh = async () => {
      await Promise.all([facts.refresh(), years.refresh(), reviews.refresh()]);
    };
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "annual", label: "Annual budget" },
    { id: "petty-cash", label: "Office petty cash" },
    { id: "funding", label: "Task funding" },
    { id: "requests", label: "Requests & releases" },
    { id: "settlements", label: "Settlements" },
    { id: "reviews", label: "Independent reviews" },
    { id: "expenses", label: "Expenses" },
    { id: "journal", label: "General Journal" },
    { id: "audit", label: "Financial Audit Trail" },
    ...(accounting ? [{ id: "mapping", label: "Account mapping" }] : []),
  ];
  const requests = (data?.requests || []).filter(
    (r) =>
      (cashStatus === "all" || r.status === cashStatus) &&
      (queue === "all" ||
        (queue === "mine" && r.requesterId === profile?.id) ||
        (queue === "approval" &&
          [
            "pending",
            "pending_leader_review",
            "pending_department_approval",
          ].includes(r.status)) ||
        (queue === "release" &&
          ["approved", "partially_released", "scheduled_for_release"].includes(
            r.status,
          )) ||
        (queue === "acknowledgment" &&
          data?.releases.some(
            (item) => item.requestId === r.id && !item.acknowledgedAt,
          )) ||
        (queue === "corrections" &&
          [
            "leader_changes_requested",
            "department_changes_requested",
            "changes_requested",
          ].includes(r.status)) ||
        (queue === "settled" && r.status === "settled")) &&
      `${r.purpose} ${r.requestNumber} ${r.requesterName} ${r.taskTitle}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (view !== "settlements" ||
        [
          "liquidation_submitted",
          "pending_leader_liquidation_review",
          "pending_department_settlement",
          "overdue_liquidation",
          "settled",
          "changes_requested",
        ].includes(r.status)),
  );
  return (
    <Screen
      title={accounting ? "Accounting" : "Office Budget"}
      description={`${selectedOffice?.name || organization?.name || "Office"} · FY ${year}`}
      refreshing={facts.loading}
      onRefresh={() => void refresh()}
      actions={
        head && view === "annual" ? (
          <Button onPress={() => setEdit(true)}>
            {data?.summary ? "Manage annual budget" : "Create annual budget"}
          </Button>
        ) : undefined
      }
    >
      {!!scopes.error && (
        <ErrorState error={scopes.error} retry={() => void scopes.refresh()} />
      )}
      {!!scopes.data && scopes.data.length > 1 && (
        <Choice
          label="Authorized Office"
          value={orgId}
          options={scopes.data.map((o) => ({ value: o.id, label: o.name }))}
          onChange={(value) => {
            setOrgId(value);
            setEdit(false);
          }}
        />
      )}
      <Choice
        label="Fiscal year"
        value={String(year)}
        onChange={(value: string) => setYear(Number(value))}
        options={[
          ...new Set([
            getCurrentFiscalYear() + 1,
            getCurrentFiscalYear(),
            getCurrentFiscalYear() - 1,
            ...(years.data || []).map((y) => y.year),
          ]),
        ]
          .sort((a, b) => b - a)
          .map((y) => ({
            value: String(y),
            label: `FY ${y}${years.data?.find((row) => row.year === y) ? " · " + years.data.find((row) => row.year === y)!.status : ""}`,
          }))}
      />
      <Tabs value={view} onChange={setView} items={tabs} />
      {!!orgId && ["overview", "annual"].includes(view) && (
        <BudgetReleaseHistory
          key={orgId + ":" + year}
          office={orgId}
          year={year}
          onSaved={refresh}
        />
      )}
      {!!data &&
        !facts.error &&
        !["journal", "mapping", "reviews", "petty-cash"].includes(view) && (
          <BudgetExport
            data={data}
            view={view}
            title={`${selectedOffice?.name || organization?.name || "Office"} · FY ${year}`}
          />
        )}
      {view === "petty-cash" ? (
        <OfficePettyCash key={profile?.id + ":" + orgId} office={orgId} />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !data ? (
        <WorkspaceLoadingSkeleton label="Loading Office Budget" />
      ) : (
        <>
          {!!data.summary && <Status value={data.summary.status} />}
          {data.schemaWarnings?.map((w) => (
            <Notice key={w}>{w}</Notice>
          ))}
          {!data.summary ? (
            <Empty
              title="No annual budget for this fiscal year"
              description={
                head
                  ? "Create the budget, add detailed sections and lock it before authorizing task funding."
                  : "The appointed Office Head prepares and locks the annual budget."
              }
              action={
                head ? (
                  <Button onPress={() => setEdit(true)}>
                    Create annual budget
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {!!(view === "overview") && <BudgetOverview data={data} />}
              {!!(view === "annual") && (
                <>
                  <BudgetOverview data={data} />
                  {!!head && (
                    <Button variant="outline" onPress={() => setEdit(true)}>
                      Open annual budget controls
                    </Button>
                  )}
                </>
              )}
              {!!(view === "funding") && (
                <>
                  <Notice>
                    Task funding comes from authorized Office Budget sources.
                    Open a task’s Budget tab to request cash or inspect its
                    spending.
                  </Notice>
                  {data.commitments.map((c) => (
                    <Card key={c.id} title={c.title}>
                      <Status value={c.status} />
                      <LabelValue label="Committed" value={peso(c.amount)} />
                      {data.allocations
                        .filter((a) => a.commitmentId === c.id)
                        .map((a) => (
                          <Card
                            key={a.id}
                            title={a.subtaskTitle || "Task allocation"}
                          >
                            <LabelValue label="Budget" value={peso(a.amount)} />
                            <Status value={a.status} />
                            {head &&
                              a.status === "pending" &&
                              a.requestedBy !== profile?.id && (
                                <AllocationDecision
                                  allocation={a}
                                  onSaved={refresh}
                                />
                              )}
                            <Button
                              variant="outline"
                              onPress={() =>
                                navigate({
                                  name: "task",
                                  id: a.taskId,
                                  nodeId: a.subtaskId,
                                  view: "budget",
                                })
                              }
                            >
                              Open work funding
                            </Button>
                          </Card>
                        ))}
                    </Card>
                  ))}
                </>
              )}
              {!!(view === "requests" || view === "settlements") && (
                <>
                  <Choice
                    label="Queue"
                    value={queue}
                    onChange={setQueue}
                    options={[
                      { value: "all", label: "All requests" },
                      { value: "mine", label: "My requests" },
                      { value: "approval", label: "Awaiting approval" },
                      { value: "release", label: "Awaiting cash release" },
                      {
                        value: "acknowledgment",
                        label: "Awaiting acknowledgment",
                      },
                      { value: "corrections", label: "Corrections requested" },
                      { value: "settled", label: "Settled" },
                    ]}
                  />
                  <SearchField
                    value={search}
                    onChange={setSearch}
                    placeholder="Search cash requests"
                  />
                  <Choice
                    label="Request status"
                    value={cashStatus}
                    onChange={setCashStatus}
                    options={[
                      { value: "all", label: "All statuses" },
                      ...[...new Set(data.requests.map((r) => r.status))].map(
                        (status) => ({
                          value: status,
                          label: status.replaceAll("_", " "),
                        }),
                      ),
                    ]}
                  />
                  {requests.length ? (
                    requests.map((request) => (
                      <CashRequestCard
                        key={request.id}
                        request={request}
                        bundle={data}
                        onSaved={refresh}
                        onCorrect={() =>
                          navigate({
                            name: "task",
                            id: request.taskId,
                            nodeId: request.subtaskId,
                            view: "budget",
                          })
                        }
                      />
                    ))
                  ) : (
                    <Empty title="No cash requests in this view" />
                  )}
                </>
              )}
              {!!(view === "reviews") &&
                (reviews.error ? (
                  <ErrorState
                    error={reviews.error}
                    retry={() => void reviews.refresh()}
                  />
                ) : reviews.loading && !reviews.data ? (
                  <Loading />
                ) : reviews.data?.length ? (
                  reviews.data.map((pack) => (
                    <Card
                      key={pack.liquidation.id}
                      title={pack.request.purpose}
                    >
                      <LabelValue
                        label="Actual spent"
                        value={peso(pack.liquidation.declaredSpent)}
                      />
                      <SettlementPanel
                        request={pack.request}
                        liquidation={pack.liquidation}
                        onSaved={refresh}
                      />
                    </Card>
                  ))
                ) : (
                  <Empty title="No assigned independent reviews" />
                ))}
              {!!(
                view === "journal" &&
                (can("navigation.accounting_journal") || head)
              ) && <JournalPanel orgId={orgId} year={year} data={data} />}
              {!!(view === "audit") && (
                <>
                  {data.ledger.map((entry) => (
                    <Card
                      key={entry.id}
                      title={entry.entryType.replaceAll("_", " ")}
                    >
                      <Text>{entry.description}</Text>
                      <LabelValue label="Amount" value={peso(entry.amount)} />
                      <LabelValue
                        label="Date"
                        value={dateLabel(entry.createdAt)}
                      />
                      <LabelValue
                        label="Actor role"
                        value={entry.actorRole || "System"}
                      />
                      {!!entry.reason && <Text>{entry.reason}</Text>}
                      {!!entry.previousState && (
                        <LabelValue
                          label="Previous state"
                          value={entry.previousState}
                        />
                      )}
                      {!!entry.newState && (
                        <LabelValue label="New state" value={entry.newState} />
                      )}
                    </Card>
                  ))}
                  {!data.ledger.length && <Empty title="No financial events" />}
                </>
              )}
              {!!(view === "expenses") && (
                <>
                  {data.requests
                    .filter((r) => r.status === "settled")
                    .map((r) => (
                      <Card key={r.id} title={r.taskTitle || r.purpose}>
                        <LabelValue
                          label="Cash released"
                          value={peso(r.releasedAmount || 0)}
                        />
                        <LabelValue
                          label="Actual spent"
                          value={peso(r.actualSpent || 0)}
                        />
                        <LabelValue
                          label="Cash returned"
                          value={peso(r.returnedAmount || 0)}
                        />
                        <Button
                          variant="outline"
                          onPress={() =>
                            navigate({
                              name: "task",
                              id: r.taskId,
                              view: "budget",
                            })
                          }
                        >
                          Open expense evidence
                        </Button>
                      </Card>
                    ))}
                  {!data.requests.some((r) => r.status === "settled") && (
                    <Empty title="No settled expenses" />
                  )}
                </>
              )}
              {!!(view === "mapping" && accounting) && (
                <AccountMappings data={data} onSaved={refresh} />
              )}
            </>
          )}
        </>
      )}
      {!!(!!edit && !!data && head) && (
        <AnnualBudgetSheet
          orgId={orgId}
          year={year}
          data={data}
          onSaved={refresh}
          onClose={() => setEdit(false)}
        />
      )}
    </Screen>
  );
}
