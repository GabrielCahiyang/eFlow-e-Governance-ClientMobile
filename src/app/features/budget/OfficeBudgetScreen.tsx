import { recordedPeso } from "../../components/ui/theme";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Coins from "lucide-react-native/icons/coins";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import Receipt from "lucide-react-native/icons/receipt";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Wallet from "lucide-react-native/icons/wallet";
import {
  Button,
  Card,
  Choice,
  DetailGroup,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  MetricPair,
  Notice,
  Screen,
  SearchField,
  Sheet,
  Status,
  peso,
  withOpacity,
} from "../../components/ui";
import { View } from "../../components/ui/Primitives";
import { Text } from "../../components/ui/Typography";
import { FilterChip } from "../../components/ui/FilterChip";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
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
  authorizedStatuses,
  cashRequestAmount,
  cashRequestReference,
  cashWorkflowStages,
  releasedStatuses,
  reviewStatuses,
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
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stackSummary = fontScale > 1.35 || width < 330;
  const accounting = profile?.role === "accounting_staff";
  const view = accountingView(initialView);
  const focused = useIsFocused();
  const [selectedOffice, setOffice] = useState(officeId || "");
  const [showBudgetReleases, setShowBudgetReleases] = useState(false);
  const [year, setYear] = useState(fiscalYear ?? getCurrentFiscalYear());
  const [contextOpen, setContextOpen] = useState(false);
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
      if (result.error) throw result.error;
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
    !!fiscalBudgetId && !recordId,
  );
  const summary = useFacts(
    `mobile-financial-summary:${profile?.id}:${orgId}:${year}`,
    () => officeFinancialSummary(orgId, year),
    !!orgId && view === "overview",
  );
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<
    "all" | "release" | "receipts" | "review" | "settled" | "requested"
  >("all");
  const data = detail.data;
  const visibleQueue = (
    queue.error || years.error ? [] : queue.data || []
  ).filter((request) => accountingRequestVisible(request, accounting));

  const requestedStatuses: readonly string[] = cashWorkflowStages[0][1];
  const stageGroups = {
    release: visibleQueue.filter((r) => authorizedStatuses.includes(r.status)),
    receipts: visibleQueue.filter((r) => releasedStatuses.includes(r.status)),
    review: visibleQueue.filter((r) => reviewStatuses.includes(r.status)),
    settled: visibleQueue.filter((r) => r.status === "settled"),
    requested: visibleQueue.filter((r) => requestedStatuses.includes(r.status)),
  };
  const sumAmounts = (items: typeof visibleQueue) =>
    items.reduce((sum, r) => sum + (cashRequestAmount(r).value ?? 0), 0);

  const query = search.trim().toLowerCase();
  const requests = visibleQueue.filter((request) => {
    const matchesStage =
      stage === "all" || stageGroups[stage].some((item) => item.id === request.id);
    if (!matchesStage) return false;
    if (!query) return true;
    return `${cashRequestReference(request.requestNumber)} ${request.requestNumber} ${request.purpose}`
      .toLowerCase()
      .includes(query);
  });
  const stageTabs = [
    { key: "all" as const, label: "All", count: visibleQueue.length },
    {
      key: "release" as const,
      label: "To release",
      count: stageGroups.release.length,
    },
    {
      key: "receipts" as const,
      label: "Receipts",
      count: stageGroups.receipts.length,
    },
    {
      key: "review" as const,
      label: "Review",
      count: stageGroups.review.length,
    },
    {
      key: "settled" as const,
      label: "Settled",
      count: stageGroups.settled.length,
    },
    ...(stageGroups.requested.length > 0
      ? [
          {
            key: "requested" as const,
            label: "Requested",
            count: stageGroups.requested.length,
          },
        ]
      : []),
  ];
  const alternateYears =
    years.data?.some(
      (row) => Number(row.fiscal_year) !== getCurrentFiscalYear(),
    ) ?? false;
  const officeOptions = scopes.data ?? [];
  const yearOptions = [
    ...new Set([
      getCurrentFiscalYear(),
      ...(years.data ?? []).map((row) => Number(row.fiscal_year)),
    ]),
  ];
  const canSwitchContext =
    (accounting && officeOptions.length > 1) || alternateYears;
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
  const pageTitle = recordId
    ? "Cash request"
    : view === "overview"
      ? accounting
        ? "Accounting"
        : "Office Budget"
      : "Requests & releases";
  const pageSubtitle = orgId ? `${officeName} · FY ${year}` : `FY ${year}`;

  return (
    <Screen
      compact
      title={pageTitle}
      description={pageSubtitle}
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
      {view === "overview" && accounting && (scopes.data?.length ?? 0) > 1 && !recordId && (
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
          <Button
            variant="outline"
            icon={<History size={15} color={palette.primary} />}
            onPress={() => setShowBudgetReleases((visible) => !visible)}
          >
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
        <Card
          title="Office budget summary"
          icon={<Wallet size={16} color={palette.primary} />}
          badge={`FY ${year}`}
        >
          {summary.error ? (
            <ErrorState
              error={summary.error}
              retry={() => void summary.refresh()}
            />
          ) : summary.data ? (
            <>
              <MetricPair
                items={[
                  {
                    label: "Total allocated budget",
                    value: recordedPeso(summary.data.approved),
                    icon: <Wallet size={18} color={palette.primary} />,
                  },
                  {
                    label: "Available Office budget",
                    value: recordedPeso(summary.data.available),
                    tone: "success",
                    icon: <Coins size={18} color={palette.success} />,
                  },
                ]}
              />
              <DetailGroup>
                <LabelValue
                  label="Budget released"
                  value={recordedPeso(summary.data.released)}
                />
                <LabelValue
                  label="Pending release"
                  value={recordedPeso(summary.data.pending)}
                  tone={summary.data.pending ? "warning" : "neutral"}
                />
                <LabelValue
                  label="Settled expenditure"
                  value={recordedPeso(summary.data.settled)}
                />
              </DetailGroup>
              <Notice tone="neutral">
                Only released budget can be committed. Scheduled releases use
                Philippine time.
              </Notice>
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
          {!recordId && canSwitchContext && (
            <View style={s.contextRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change Office or fiscal year"
                onPress={() => setContextOpen(true)}
                style={({ pressed }) => [
                  s.contextPill,
                  {
                    backgroundColor: pressed
                      ? palette.primarySoft
                      : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text
                  style={[s.contextText, { color: palette.text }]}
                  numberOfLines={1}
                >
                  {officeName} · FY {year}
                </Text>
                <ChevronDown size={14} color={palette.mutedLabel} />
              </Pressable>
            </View>
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
                onOpenProject={
                  !linkedWork.error && linkedWork.data?.linked_project_id
                    ? () =>
                        navigate({
                          name: "project",
                          id: linkedWork.data!.linked_project_id,
                        })
                    : undefined
                }
                readOnly={
                  (detail.loading && !data) ||
                  !!detail.error ||
                  !!(otherOffice && ((scopes.loading && !scopes.data) || scopes.error))
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
            detail.loading && !data ? (
              <Loading label="Loading cash request" layout="request" />
            ) : (
              !detail.error && (
                <Empty
                  kind="budget"
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
                <LinearGradient
                  colors={[palette.heroStart, palette.heroEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    s.heroCard,
                    {
                      borderColor: isDark
                        ? withOpacity(palette.primary, 0.28)
                        : "rgba(148, 186, 255, 0.24)",
                    },
                  ]}
                >
                  <View style={[s.heroSplit, stackSummary && s.heroStacked]}>
                    <View style={s.heroCol}>
                      <Text style={s.heroK}>READY TO RELEASE</Text>
                      <Text style={s.heroV}>
                        {peso(sumAmounts(stageGroups.release))}
                      </Text>
                      <Text style={s.heroSub}>
                        {stageGroups.release.length}{" "}
                        {stageGroups.release.length === 1
                          ? "authorized request"
                          : "authorized requests"}
                      </Text>
                    </View>
                    <View
                      style={
                        stackSummary ? s.heroDividerHorizontal : s.heroDivider
                      }
                    />
                    <View style={s.heroCol}>
                      <Text style={s.heroK}>IN REVIEW</Text>
                      <Text style={s.heroV}>
                        {peso(sumAmounts(stageGroups.review))}
                      </Text>
                      <Text style={s.heroSub}>
                        {stageGroups.review.length}{" "}
                        {stageGroups.review.length === 1
                          ? "receipt package"
                          : "receipt packages"}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              )}
              <View style={s.filterCluster}>
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search cash requests"
                />
                {visibleQueue.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tabsRow}
                  >
                    {stageTabs.map((item) => (
                      <FilterChip
                        key={item.key}
                        label={item.label}
                        count={item.count}
                        showZeroCount
                        selected={stage === item.key}
                        accessibilityLabel={`${item.label} · ${item.count}`}
                        onPress={() => setStage(item.key)}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
              {requests.length > 0 && (
                <Card
                  title="Cash requests"
                  icon={<Receipt size={16} color={palette.primary} />}
                  badge={`${requests.length} visible`}
                >
                  <View style={s.rowsList}>
                    {requests.map((request) => {
                      const amount = cashRequestAmount(request);
                      return (
                        <Pressable
                          key={request.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${cashRequestReference(request.requestNumber)} · ${request.purpose || "Cash request"}`}
                          onPress={() =>
                            navigate({
                              name: "accounting_releases",
                              recordId: request.id,
                              financialOfficeId: orgId,
                              fiscalYear: year,
                              title: "Cash request",
                            })
                          }
                          style={({ pressed }) => [
                            s.queueRow,
                            {
                              backgroundColor: pressed
                                ? palette.primarySoft
                                : isDark
                                  ? withOpacity(palette.background, 0.72)
                                  : "#f7f9fd",
                              borderColor: palette.border,
                            },
                          ]}
                        >
                          <View style={s.rowLine1}>
                            <Text
                              numberOfLines={2}
                              style={[s.rowPurpose, { color: palette.text }]}
                            >
                              {request.purpose || "Cash request"}
                            </Text>
                            <View style={s.rowRight}>
                              <Text
                                style={[s.rowAmt, { color: palette.text }]}
                              >
                                {recordedPeso(amount.value)}
                              </Text>
                              <ChevronRight
                                size={15}
                                color={palette.mutedLabel}
                              />
                            </View>
                          </View>
                          <View style={s.rowLine2}>
                            <Text
                              style={[
                                s.refPlain,
                                { color: palette.mutedLabel },
                              ]}
                            >
                              {cashRequestReference(request.requestNumber)} ·{" "}
                              {amount.label}
                            </Text>
                            <Status
                              value={request.status}
                              domain="finance"
                              variant="pill"
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              )}
              {!requests.length && !queue.error && !years.error && (
                <Empty
                  kind={search || stage !== "all" ? "search" : "budget"}
                  compact
                  title={
                    search || stage !== "all"
                      ? "No matching cash requests"
                      : "No cash requests here yet"
                  }
                  description={
                    search || stage !== "all"
                      ? "Try another reference, purpose or stage filter."
                      : "Authorized requests for this Office and fiscal year will appear here."
                  }
                  action={
                    search || stage !== "all" ? (
                      <Button
                        variant="outline"
                        icon={<RotateCcw size={15} color={palette.primary} />}
                        onPress={() => {
                          setSearch("");
                          setStage("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </>
          )}
          <Sheet
            open={contextOpen}
            title="Office & fiscal year"
            onClose={() => setContextOpen(false)}
          >
            {accounting && officeOptions.length > 1 && (
              <Choice
                label="Authorized Office"
                value={orgId}
                options={officeOptions.map((office) => ({
                  value: office.id,
                  label: office.name,
                }))}
                onChange={(id) => {
                  setOffice(id);
                  setYear(getCurrentFiscalYear());
                }}
              />
            )}
            {alternateYears && (
              <Choice
                label="Fiscal year"
                value={String(year)}
                searchable={false}
                onChange={(value) => setYear(Number(value))}
                options={yearOptions.map((value) => ({
                  value: String(value),
                  label: `FY ${value}`,
                }))}
              />
            )}
          </Sheet>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  contextPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
  },
  contextText: {
    fontSize: 12.5,
    fontWeight: "600",
    flexShrink: 1,
  },
  contextLabel: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
  },
  heroSplit: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  heroStacked: {
    flexDirection: "column",
  },
  heroCol: {
    flex: 1,
    minWidth: 0,
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroDividerHorizontal: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroK: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: "rgba(219, 234, 254, 0.78)",
  },
  heroV: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  heroSub: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "rgba(219, 234, 254, 0.82)",
    marginTop: 2,
  },
  filterCluster: {
    gap: 9,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 1,
  },
  rowsList: {
    gap: 8,
  },
  queueRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 7,
  },
  rowLine1: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  rowPurpose: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 19,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  rowAmt: {
    fontSize: 13.5,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  rowLine2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  refPlain: {
    fontSize: 11.5,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
