import { officeContextLabel } from "../../shared/officeLabels";
import { HomeBody, HomeHero, HomeHeroMetrics, HomeHeroStats } from "./HomeHero";
import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Banknote from "lucide-react-native/icons/banknote";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Coins from "lucide-react-native/icons/coins";
import Receipt from "lucide-react-native/icons/receipt";
import { Empty, ErrorState, Loading, Screen, Status } from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { recordedPeso, space, type, withOpacity } from "../../components/ui/theme";
import { statusLabel } from "../../shared/statusLabels";
import { useFacts } from "../../shared/useFacts";
import type { AppRoute, Navigate } from "../../shared/routes";
import { nativeWindow } from "../../../platform/webRuntime";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { accountingHomeQueue, assignedFinanceReviews } from "./homeFinance";
import {
  officeBudgetPosition,
  type OfficeBudgetPosition,
} from "../budget/officeFinancialSummary";
import { useOfficeFinanceUpdates } from "../budget/useOfficeFinanceUpdates";
import {
  HomeCard,
  HomeMessage,
  HomeRow,
  HomeRowChevron,
  HomeSection,
} from "./HomeSections";

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
    () => officeBudgetPosition(office!, year),
    !!office && canOpenAccounting,
  );
  const reviews = useFacts(
    "accounting-home-reviews:" + scope,
    () => assignedFinanceReviews(actor, office!),
    !!office && !!actor,
  );
  const refresh = useCallback(async () => {
    await Promise.all([queue.refresh(), summary.refresh(), reviews.refresh()]);
  }, [queue.refresh, summary.refresh, reviews.refresh]);
  useOfficeFinanceUpdates(
    office || "",
    year,
    !!office && (canOpenQueue || canOpenAccounting),
    refresh,
  );
  useEffect(() => {
    const reload = () => void refresh();
    nativeWindow.addEventListener("eflow:work-updated", reload);
    nativeWindow.addEventListener("eflow:finance-updated", reload);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", reload);
      nativeWindow.removeEventListener("eflow:finance-updated", reload);
    };
  }, [refresh]);
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
      <HomeHero navigate={navigate} subtitle={officeContextLabel(organization?.name)}>
        {!!office && (
          <>
            <HomeHeroStats
              stats={[
                {
                  key: "decisions",
                  label: "Actions required",
                  value: actionTotal,
                  accessibilityLabel: `${actionTotal} financial action${actionTotal === 1 ? "" : "s"} required`,
                },
                {
                  key: "today",
                  label: "Scheduled releases",
                  value: scheduledCount,
                  accessibilityLabel: `${scheduledCount} scheduled release${scheduledCount === 1 ? "" : "s"}`,
                },
                {
                  key: "risk",
                  label: "Outstanding",
                  value: transactions?.outstanding.length ?? 0,
                  accessibilityLabel: `${transactions?.outstanding.length ?? 0} outstanding transaction${(transactions?.outstanding.length ?? 0) === 1 ? "" : "s"}`,
                },
              ]}
            />
            {canOpenAccounting && (
              <HomeHeroMetrics
                loadingLabel={
                  summary.loading && !totals
                    ? "Loading financial summary"
                    : undefined
                }
                items={[
                  {
                    key: "approved",
                    label: "Approved appropriation",
                    value: recordedPeso(totals?.approved),
                    accessibilityLabel: `Approved appropriation ${totals?.approved != null ? recordedPeso(totals.approved) : "unavailable"}`,
                  },
                  {
                    key: "settled",
                    label: "Settled expenditure",
                    value: recordedPeso(totals?.settled),
                    accessibilityLabel: `Settled expenditure ${totals?.settled != null ? recordedPeso(totals.settled) : "unavailable"}`,
                  },
                ]}
              />
            )}
          </>
        )}
      </HomeHero>
      <HomeBody>
      {!office ? (
        <HomeCard>
          <Empty
            compact
            kind="people"
            title="Assigned Office required"
            description="An assigned Office is required to see financial work."
          />
        </HomeCard>
      ) : (
        <>
          <HomeSection
            title="Action required"
            tone={actionTotal > 0 ? "warning" : "primary"}
            icon={
              <Banknote
                size={15}
                color={actionTotal > 0 ? palette.warning : palette.primary}
              />
            }
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
                    <Empty
                      compact
                      kind="complete"
                      title="All clear"
                      description="No verified actions in your assigned Office."
                    />
                  </HomeCard>
                )
              ))}
            {workspace.selected?.workspace.office_id !== office && (
              <HomeMessage>
                This overview stays scoped to your assigned Office.
              </HomeMessage>
            )}
          </HomeSection>
          {canOpenAccounting && (
            <HomeSection
              title="Cash & budget position"
              tone="success"
              icon={<Coins size={15} color={palette.success} />}
              actionLabel="Open budget"
              onAction={() =>
                navigate({
                  name: "accounting_overview",
                  view: "overview",
                  fiscalYear: year,
                })
              }
              actionAccessibilityLabel="Open Office budget summary"
            >
              {summary.error ? (
                <ErrorState
                  error="The Office financial summary is unavailable."
                  retry={() => void summary.refresh()}
                />
              ) : totals ? (
                hasAnyBudgetMetric(totals) ? (
                  <CashBudgetPositionCard totals={totals} />
                ) : (
                  <HomeCard>
                    <Empty
                      compact
                      kind="budget"
                      title="Verified financial amounts unavailable"
                    />
                  </HomeCard>
                )
              ) : summary.loading ? (
                <Loading
                  label="Loading budget position"
                  layout="summary"
                  rows={3}
                />
              ) : (
                <HomeCard>
                  <Empty
                    compact
                    kind="budget"
                    title={`No fiscal budget is set for FY ${year}`}
                  />
                </HomeCard>
              )}
            </HomeSection>
          )}
          {canOpenQueue && (
            <HomeSection
              title="Outstanding transactions"
              tone="primary"
              icon={<Receipt size={15} color={palette.primary} />}
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
                <HomeCard>
                  <Empty
                    compact
                    kind="budget"
                    title="No unresolved requests in this preview"
                  />
                </HomeCard>
              )}
              {queue.error && (
                <HomeMessage>
                  Outstanding requests are unavailable.
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
    route: AppRoute;
  };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const isRelease = row.key.startsWith("cash-release:");
  const isReview = row.key.startsWith("finance-review:");

  const actionLabel = isRelease
    ? "Release cash"
    : isReview
      ? "Review receipts"
      : "Post settlement";

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
      accessibilityLabel={`${actionLabel}, ${row.title}`}
      accessibilityHint="Opens the financial record"
      onPress={() => navigate(row.route)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: iconBg,
          borderWidth: 1,
          borderColor: withOpacity(iconColor, 0.2),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IconComponent size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: iconBg,
            borderWidth: 1,
            borderColor: withOpacity(iconColor, 0.24),
          }}
        >
          <IconComponent size={11.5} color={iconColor} />
          <Text
            style={{
              fontWeight: "700",
              fontSize: 11,
              color: iconColor,
            }}
          >
            {actionLabel}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: palette.text,
            lineHeight: 19,
          }}
        >
          {row.title}
        </Text>
      </View>
      <HomeRowChevron />
    </HomeRow>
  );
}

function hasAnyBudgetMetric(totals: OfficeBudgetPosition) {
  return (
    totals.available != null ||
    totals.released != null ||
    totals.pending != null ||
    totals.dailyRemaining != null ||
    totals.approved != null ||
    totals.settled != null
  );
}

function BudgetPositionRow({
  label,
  value,
  caption,
  toneColor,
  captionToneColor,
  isFirst = false,
  children,
}: {
  label: string;
  value: string;
  caption?: string;
  toneColor?: string;
  captionToneColor?: string;
  isFirst?: boolean;
  children?: React.ReactNode;
}) {
  const palette = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={[label, value, caption].filter(Boolean).join(", ")}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
        borderTopWidth: isFirst ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: palette.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space.xs,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: palette.text,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: type.body,
            fontWeight: "800",
            color: toneColor ?? palette.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value}
        </Text>
      </View>
      {children}
      {!!caption && (
        <Text
          style={{
            fontSize: type.small,
            color: captionToneColor ?? palette.mutedLabel,
          }}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}

function BudgetPositionPod({
  label,
  value,
  caption,
  toneColor,
  captionToneColor,
}: {
  label: string;
  value: string;
  caption?: string;
  toneColor?: string;
  captionToneColor?: string;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  return (
    <View
      accessible
      accessibilityLabel={[label, value, caption].filter(Boolean).join(", ")}
      style={{
        flex: 1,
        minWidth: 140,
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: isDark
          ? withOpacity(palette.background, 0.72)
          : "#f7f9fd",
        gap: 3,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: palette.mutedLabel }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14.5,
          fontWeight: "800",
          color: toneColor ?? palette.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      {!!caption && (
        <Text
          style={{
            fontSize: 11,
            lineHeight: 15,
            color: captionToneColor ?? palette.mutedLabel,
          }}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}

function CashBudgetPositionCard({ totals }: { totals: OfficeBudgetPosition }) {
  const palette = useTheme();
  const approved = totals.approved ?? 0;
  const settled = totals.settled ?? 0;
  const committed = totals.committed ?? 0;
  const settledPct =
    approved > 0 ? Math.min(100, Math.max(0, (settled / approved) * 100)) : 0;
  const unspentCommittedPct =
    approved > 0 && totals.committed != null
      ? Math.min(
          100 - settledPct,
          Math.max(0, ((committed - settled) / approved) * 100),
        )
      : 0;

  const availableCaption = [
    totals.settled != null
      ? `${recordedPeso(totals.settled)} settled`
      : undefined,
    totals.committed != null
      ? `${recordedPeso(totals.committed)} authorized commitments`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const limitReached =
    totals.dailyRemaining === 0 && (totals.dailyLimit ?? 0) > 0;
  const dailyCaption = limitReached
    ? totals.releasedToday != null
      ? `Daily ceiling reached · ${recordedPeso(totals.releasedToday)} released today`
      : "Daily ceiling reached for today"
    : [
        totals.releasedToday != null
          ? `${recordedPeso(totals.releasedToday)} released today`
          : undefined,
        totals.scheduledToday != null
          ? `${recordedPeso(totals.scheduledToday)} scheduled`
          : undefined,
        totals.dailyLimit != null
          ? `${recordedPeso(totals.dailyLimit)} ceiling`
          : undefined,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <BudgetPositionPod
          label="Available Office budget"
          value={recordedPeso(totals.available)}
          caption={availableCaption || undefined}
        />
        <BudgetPositionPod
          label="Daily release capacity"
          value={recordedPeso(totals.dailyRemaining)}
          toneColor={limitReached ? palette.danger : undefined}
          caption={dailyCaption || undefined}
          captionToneColor={limitReached ? palette.danger : undefined}
        />
      </View>
      {approved > 0 && (
        <View
          style={{
            height: 7,
            borderRadius: 4,
            backgroundColor: palette.border,
            overflow: "hidden",
            flexDirection: "row",
          }}
        >
          {settledPct > 0 && (
            <View
              style={{
                height: 7,
                width: `${settledPct}%`,
                backgroundColor: palette.primary,
              }}
            />
          )}
          {unspentCommittedPct > 0 && (
            <View
              style={{
                height: 7,
                width: `${unspentCommittedPct}%`,
                backgroundColor: withOpacity(palette.blue, 0.35),
              }}
            />
          )}
        </View>
      )}
      <HomeCard>
        <BudgetPositionRow
          isFirst
          label="Budget released"
          value={recordedPeso(totals.released)}
        />
        <BudgetPositionRow
          label="Pending release"
          value={recordedPeso(totals.pending)}
        />
      </HomeCard>
    </View>
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
      <View style={{ flex: 1, gap: 5 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              fontSize: 14,
              color: palette.text,
              flex: 1,
            }}
            numberOfLines={2}
          >
            {row.title}
          </Text>
          {row.amount.value != null && (
            <Text
              style={{
                fontWeight: "800",
                fontSize: 13.5,
                color: palette.text,
                fontVariant: ["tabular-nums"],
              }}
            >
              {recordedPeso(row.amount.value)}
            </Text>
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Status value={row.status} domain="finance" variant="pill" />
          <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
            Monitoring
          </Text>
        </View>
      </View>
      <HomeRowChevron />
    </HomeRow>
  );
}
