import { HomeBody, HomeHero, HomeHeroStats } from "./HomeHero";
import { useEffect } from "react";
import { View } from "react-native";
import Banknote from "lucide-react-native/icons/banknote";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleCheck from "lucide-react-native/icons/circle-check-big";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Receipt from "lucide-react-native/icons/receipt";
import { ErrorState, Loading, Screen } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { radius, recordedPeso, space } from "../../components/ui/theme";
import { statusLabel } from "../../shared/statusLabels";
import { useFacts } from "../../shared/useFacts";
import type { AppRoute, Navigate } from "../../shared/routes";
import { nativeWindow } from "../../../platform/webRuntime";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { accountingHomeQueue, assignedFinanceReviews } from "./homeFinance";
import { officeFinancialSummary } from "../budget/officeFinancialSummary";
import { HomeCard, HomeMessage, HomeRow, HomeSection } from "./HomeSections";

export function AccountingHome({ navigate }: { navigate: Navigate }) {
  const { profile, organization, can } = useAuth();
  const workspace = useWorkspace();
  const palette = useTheme();
  const actor = profile?.id || "";
  const office = profile?.org_id;
  const year = getCurrentFiscalYear();
  const canOpenQueue = can("navigation.accounting_releases");
  const canRelease = can("accounting.release_cash");
  const canSettle =
    can("accounting.settle_liquidation") && can("accounting.post_journal");
  const canOpenAccounting = can("navigation.accounting_overview");
  const scope = JSON.stringify([actor, office, year]);
  const queue = useFacts(
    "accounting-home-queue:" + JSON.stringify([scope, canRelease, canSettle]),
    () => accountingHomeQueue(office!, year, actor, canRelease, canSettle),
    !!office && canOpenQueue,
  );
  const summary = useFacts(
    "accounting-home-summary:" + scope,
    () => officeFinancialSummary(office!, year),
    !!office && canOpenAccounting,
  );
  const reviews = useFacts(
    "accounting-home-reviews:" + scope,
    () => assignedFinanceReviews(actor, office!),
    !!office && !!actor,
  );
  const refresh = async () => {
    await Promise.all([queue.refresh(), summary.refresh(), reviews.refresh()]);
  };
  useEffect(() => {
    const reload = () => void refresh();
    nativeWindow.addEventListener("eflow:work-updated", reload);
    nativeWindow.addEventListener("eflow:finance-updated", reload);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", reload);
      nativeWindow.removeEventListener("eflow:finance-updated", reload);
    };
  }, [queue.refresh, summary.refresh, reviews.refresh]);
  const transactions = queue.error ? undefined : queue.data;
  const totals = summary.error ? undefined : summary.data;
  const sortedActions = [
    ...(transactions?.actions ?? []),
    ...(!reviews.error ? (reviews.data ?? []) : []),
  ].sort(
    (a, b) =>
      a.priority - b.priority ||
      a.sort - b.sort ||
      a.key.localeCompare(b.key),
  );
  const actionTotal = sortedActions.length;
  const actionRows = sortedActions.slice(0, 3);
  const scheduledCount =
    transactions?.counts?.find((c) =>
      c.label.toLowerCase().includes("author"),
    )?.count ?? 0;
  const openQueue = () =>
    navigate({
      name: "accounting_releases",
      financialOfficeId: office!,
      fiscalYear: year,
    });
  const loading =
    (queue.loading && !queue.data) || (reviews.loading && !reviews.data);
  const error = queue.error || reviews.error;
  return (
    <Screen compact edgeToEdge onRefresh={refresh} style={{ gap: 0 }}>
      <HomeHero navigate={navigate} subtitle={organization?.name}>
        {!!office && (
          <HomeHeroStats
            stats={[
              {
                key: "decisions",
                label: "Actions required",
                value: actionTotal,
                onPress: canOpenQueue ? openQueue : undefined,
                accessibilityLabel: `${actionTotal} financial action${actionTotal === 1 ? "" : "s"} required`,
              },
              {
                key: "today",
                label: "Scheduled releases",
                value: scheduledCount,
                onPress: canOpenQueue ? openQueue : undefined,
                accessibilityLabel: `${scheduledCount} scheduled release${scheduledCount === 1 ? "" : "s"}`,
              },
              {
                key: "risk",
                label: "Outstanding",
                value: transactions?.outstanding.length ?? 0,
                onPress: canOpenQueue ? openQueue : undefined,
                accessibilityLabel: `${transactions?.outstanding.length ?? 0} outstanding transaction${(transactions?.outstanding.length ?? 0) === 1 ? "" : "s"}`,
              },
            ]}
          />
        )}
      </HomeHero>
      <HomeBody>
      {!office ? (
        <HomeMessage>
          An assigned Office is required to see financial work.
        </HomeMessage>
      ) : (
        <>
          <HomeSection
            title="Action required"
            badge={actionTotal ? String(actionTotal) : undefined}
            onAction={canOpenQueue ? openQueue : undefined}
            actionAccessibilityLabel="See all financial actions required"
          >
            {!!actionRows.length && (
              <HomeCard>
                {actionRows.map((row, index) => (
                  <AccountingActionCardItem
                    key={row.key}
                    row={row}
                    isFirst={index === 0}
                    navigate={navigate}
                  />
                ))}
              </HomeCard>
            )}
            {error && (
              <ErrorState
                error="Some financial actions could not be verified."
                retry={() => void refresh()}
              />
            )}
            {!actionRows.length &&
              (loading ? (
                <Loading
                  label="Checking financial actions"
                  layout="summary"
                  rows={2}
                />
              ) : (
                !error && (
                  <HomeCard>
                    <View
                      style={{
                        padding: space.md,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space.md,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: palette.successSoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CircleCheck size={18} color={palette.success} />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: palette.mutedLabel,
                        }}
                      >
                        No verified actions in your assigned Office.
                      </Text>
                    </View>
                  </HomeCard>
                )
              ))}
            {workspace.selected?.workspace.office_id !== office && (
              <HomeMessage>
                This overview stays scoped to your assigned Office.
              </HomeMessage>
            )}
          </HomeSection>
          {canOpenQueue && (
            <>
              <HomeSection
                title="Financial workflow"
                onAction={openQueue}
                actionAccessibilityLabel="See all requests and releases"
              >
                <FinancialWorkflowCard
                  counts={transactions?.counts}
                  loading={queue.loading && !transactions}
                  error={queue.error ? new Error("Request counts are unavailable.") : undefined}
                  office={office}
                  year={year}
                  navigate={navigate}
                />
              </HomeSection>
              <HomeSection
                title="Outstanding transactions"
                badge={
                  transactions?.outstanding.length
                    ? String(transactions.outstanding.length)
                    : undefined
                }
                onAction={openQueue}
                actionAccessibilityLabel="See all outstanding transactions"
              >
                {!!transactions?.outstanding.length && (
                  <HomeCard>
                    {transactions.outstanding.slice(0, 3).map((row, index) => (
                      <OutstandingTransactionCardItem
                        key={row.key}
                        row={row}
                        isFirst={index === 0}
                        navigate={navigate}
                      />
                    ))}
                  </HomeCard>
                )}
                {transactions && !transactions.outstanding.length && (
                  <HomeMessage>
                    No unresolved requests in this preview.
                  </HomeMessage>
                )}
                {queue.error && (
                  <HomeMessage>
                    Outstanding requests are unavailable.
                  </HomeMessage>
                )}
              </HomeSection>
            </>
          )}
          {canOpenAccounting && (
            <HomeSection
              title="Financial summary"
              onAction={() =>
                navigate({
                  name: "accounting_overview",
                  view: "budget",
                  fiscalYear: year,
                })
              }
              actionAccessibilityLabel="See full office financial summary"
            >
              {summary.error ? (
                <ErrorState
                  error="The Office financial summary is unavailable."
                  retry={() => void summary.refresh()}
                />
              ) : totals ? (
                totals.approved != null || totals.settled != null ? (
                  <FinancialSummaryTiles
                    approved={totals.approved}
                    settled={totals.settled}
                  />
                ) : (
                  <HomeMessage>
                    Verified financial amounts are unavailable.
                  </HomeMessage>
                )
              ) : summary.loading ? (
                <Loading
                  label="Loading financial summary"
                  layout="summary"
                  rows={2}
                />
              ) : (
                <HomeMessage>
                  No financial summary is available for this fiscal year.
                </HomeMessage>
              )}
            </HomeSection>
          )}
        </>
      )}
      </HomeBody>
    </Screen>
  );
}

function AccountingActionCardItem({
  row,
  isFirst = false,
  navigate,
}: {
  row: {
    key: string;
    title: string;
    description: string;
    route: AppRoute;
  };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const isRelease =
    row.key.startsWith("release:") ||
    row.description.toLowerCase().includes("release");
  const isReview =
    row.key.startsWith("finance-review:") ||
    row.description.toLowerCase().includes("review");

  const categoryLabel = isRelease
    ? "Cash release due"
    : isReview
      ? "Review required"
      : "Settlement due";

  const iconColor = isRelease
    ? palette.warning
    : isReview
      ? palette.review
      : palette.success;

  const iconBg = isRelease
    ? palette.warningSoft
    : isReview
      ? palette.reviewSoft
      : palette.successSoft;

  const IconComponent = isRelease
    ? Banknote
    : isReview
      ? ClipboardCheck
      : Receipt;

  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={row.title}
      accessibilityHint={row.description}
      onPress={() => navigate(row.route)}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: iconColor,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {categoryLabel}
        </Text>
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            color: palette.text,
          }}
          numberOfLines={2}
        >
          {row.title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: palette.mutedLabel,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {row.description}
        </Text>
      </View>
      <ChevronRight size={18} color={palette.mutedLabel} />
    </HomeRow>
  );
}

function FinancialWorkflowCard({
  counts,
  loading,
  error,
  office,
  year,
  navigate,
}: {
  counts?: { label: string; count: number | null }[];
  loading: boolean;
  error?: Error;
  office: string;
  year: number;
  navigate: Navigate;
}) {
  const palette = useTheme();
  return (
    <HomeCard>
      <View style={{ padding: space.md, gap: space.md }}>
      {error ? (
        <HomeMessage>Request counts are unavailable.</HomeMessage>
      ) : counts ? (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: space.xs,
            }}
          >
            {counts.map(({ label, count }) => {
              const active = (count ?? 0) > 0;
              return (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: space.sm,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: active
                      ? palette.primarySoft
                      : palette.background,
                    borderWidth: 1,
                    borderColor: active ? "transparent" : palette.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: active
                        ? palette.primaryDark ?? palette.primary
                        : palette.mutedLabel,
                    }}
                  >
                    {count == null ? "—" : count}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? palette.text : palette.mutedLabel,
                    }}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
            {counts
              .filter(({ count }) => (count ?? 0) > 0)
              .map(({ label, count }) => `${count} ${label.toLowerCase()}`)
              .join(" · ") ||
              (counts.some(({ count }) => count == null)
                ? "Request counts are incomplete."
                : "No requests in the tracked stages.")}
            {counts.some(({ count }) => count == null) &&
            counts.some(({ count }) => (count ?? 0) > 0)
              ? " · Some stages unavailable"
              : ""}
          </Text>
        </>
      ) : loading ? (
        <Loading label="Loading request counts" layout="summary" rows={2} />
      ) : (
        <HomeMessage>
          No authorized fiscal budget is available for this year.
        </HomeMessage>
      )}
      </View>
    </HomeCard>
  );
}

function OutstandingTransactionCardItem({
  row,
  isFirst = false,
  navigate,
}: {
  row: {
    key: string;
    title: string;
    status: string;
    amount: { label: string; value?: number | null };
    route: AppRoute;
  };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const formattedAmount =
    row.amount.value == null
      ? undefined
      : `${row.amount.label} ${recordedPeso(row.amount.value)}`;
  const description = [
    "Monitoring",
    statusLabel(row.status, "finance"),
    formattedAmount,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={row.title}
      accessibilityHint={description}
      onPress={() => navigate(row.route)}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{ fontWeight: "700", fontSize: 15, color: palette.text }}
          numberOfLines={2}
        >
          {row.title}
        </Text>
        <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
          {description}
        </Text>
      </View>
      <ChevronRight size={18} color={palette.mutedLabel} />
    </HomeRow>
  );
}

function FinancialSummaryTiles({
  approved,
  settled,
}: {
  approved: number | null | undefined;
  settled: number | null | undefined;
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: space.sm,
      }}
    >
      <View
        style={{
          flexGrow: 1,
          flexBasis: 140,
          minHeight: 76,
          padding: space.md,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          justifyContent: "space-between",
          gap: space.xs,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: palette.mutedLabel,
          }}
        >
          Approved appropriation
        </Text>
        <Text
          style={{
            fontWeight: "800",
            fontSize: 20,
            color: palette.text,
          }}
        >
          {recordedPeso(approved)}
        </Text>
      </View>
      <View
        style={{
          flexGrow: 1,
          flexBasis: 140,
          minHeight: 76,
          padding: space.md,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          justifyContent: "space-between",
          gap: space.xs,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: palette.mutedLabel,
          }}
        >
          Settled expenditure
        </Text>
        <Text
          style={{
            fontWeight: "800",
            fontSize: 20,
            color: palette.text,
          }}
        >
          {recordedPeso(settled)}
        </Text>
      </View>
    </View>
  );
}
