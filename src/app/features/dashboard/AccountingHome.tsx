import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
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
import { HomeMessage, HomeSection } from "./HomeSections";

export function AccountingHome({ navigate }: { navigate: Navigate }) {
  const { profile, organization, can } = useAuth();
  const workspace = useWorkspace();
  const palette = useTheme();
  const focused = useIsFocused();
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
    focused && !!office && canOpenQueue,
  );
  const summary = useFacts(
    "accounting-home-summary:" + scope,
    () => officeFinancialSummary(office!, year),
    focused && !!office && canOpenAccounting,
  );
  const reviews = useFacts(
    "accounting-home-reviews:" + scope,
    () => assignedFinanceReviews(actor, office!),
    focused && !!office && !!actor,
  );
  const refresh = async () => {
    await Promise.all([queue.refresh(), summary.refresh(), reviews.refresh()]);
  };
  useEffect(() => {
    if (!focused) return;
    const reload = () => void refresh();
    nativeWindow.addEventListener("eflow:work-updated", reload);
    nativeWindow.addEventListener("eflow:finance-updated", reload);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", reload);
      nativeWindow.removeEventListener("eflow:finance-updated", reload);
    };
  }, [focused, queue.refresh, summary.refresh, reviews.refresh]);
  const transactions = queue.error || queue.loading ? undefined : queue.data;
  const totals = summary.error ? undefined : summary.data;
  const actionRows = [
    ...(transactions?.actions ?? []),
    ...(!reviews.error && !reviews.loading ? (reviews.data ?? []) : []),
  ]
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.sort - b.sort ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 3);
  const loading = queue.loading || reviews.loading;
  const error = queue.error || reviews.error;
  return (
    <Screen compact onRefresh={refresh}>
      {!office ? (
        <HomeMessage>
          An assigned Office is required to see financial work.
        </HomeMessage>
      ) : (
        <>
          <AccountingCommandOverview
            officeName={organization?.name || "Assigned Office"}
            year={year}
            actionCount={actionRows.length}
            scheduledCount={
              transactions?.counts?.find((c) =>
                c.label.toLowerCase().includes("author"),
              )?.count ?? 0
            }
            onPressReleases={
              canOpenQueue
                ? () =>
                    navigate({
                      name: "accounting_releases",
                      financialOfficeId: office,
                      fiscalYear: year,
                    })
                : undefined
            }
          />

          <HomeSection
            title="Action Required"
            badge={actionRows.length ? String(actionRows.length) : undefined}
            onAction={
              canOpenQueue
                ? () =>
                    navigate({
                      name: "accounting_releases",
                      financialOfficeId: office,
                      fiscalYear: year,
                    })
                : undefined
            }
            actionAccessibilityLabel="See all financial actions required"
          >
            {actionRows.map((row) => (
              <AccountingActionCardItem
                key={row.key}
                row={row}
                navigate={navigate}
              />
            ))}
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
                  <View
                    style={{
                      padding: space.md,
                      borderRadius: radius.surface,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
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
                title="Financial Workflow"
                onAction={() =>
                  navigate({
                    name: "accounting_releases",
                    financialOfficeId: office,
                    fiscalYear: year,
                  })
                }
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
                title="Outstanding Transactions"
                badge={transactions?.outstanding.length ? String(transactions.outstanding.length) : undefined}
                onAction={() =>
                  navigate({
                    name: "accounting_releases",
                    financialOfficeId: office,
                    fiscalYear: year,
                  })
                }
                actionAccessibilityLabel="See all outstanding transactions"
              >
                {transactions?.outstanding.slice(0, 3).map((row) => (
                  <OutstandingTransactionCardItem
                    key={row.key}
                    row={row}
                    navigate={navigate}
                  />
                ))}
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
              title="Financial Summary"
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
    </Screen>
  );
}

function AccountingCommandOverview({
  officeName,
  year,
  actionCount,
  scheduledCount,
  onPressActions,
  onPressReleases,
}: {
  officeName: string;
  year: number;
  actionCount: number;
  scheduledCount: number;
  onPressActions?: () => void;
  onPressReleases?: () => void;
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        padding: space.md,
        gap: space.sm,
        marginBottom: space.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: actionCount > 0 ? palette.warning : palette.primary,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: palette.primary,
            }}
          >
            Accounting Overview
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: palette.mutedLabel,
            fontWeight: "500",
          }}
        >
          {officeName} · FY {year}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: palette.text,
            letterSpacing: -0.2,
          }}
        >
          {actionCount > 0
            ? `${actionCount} ${actionCount === 1 ? "action" : "actions"} required`
            : "All financial queues up to date"}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: palette.mutedLabel,
          }}
        >
          {scheduledCount > 0
            ? `${scheduledCount} ${scheduledCount === 1 ? "scheduled release" : "scheduled releases"}`
            : "No scheduled releases today"}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          paddingTop: space.xs,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionCount} actions required`}
          onPress={onPressActions}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 6,
            paddingHorizontal: space.sm,
            borderRadius: radius.surface,
            backgroundColor: pressed
              ? palette.primarySoft
              : actionCount > 0
                ? palette.primarySoft
                : palette.background,
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: actionCount > 0 ? palette.primary : palette.mutedLabel,
            }}
          >
            Actions
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: actionCount > 0 ? palette.primary : palette.text,
            }}
          >
            {actionCount}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${scheduledCount} scheduled releases`}
          onPress={onPressReleases}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 6,
            paddingHorizontal: space.sm,
            borderRadius: radius.surface,
            backgroundColor: pressed ? palette.primarySoft : palette.background,
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: palette.mutedLabel,
            }}
          >
            Releases
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: palette.text,
            }}
          >
            {scheduledCount}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AccountingActionCardItem({
  row,
  navigate,
}: {
  row: {
    key: string;
    title: string;
    description: string;
    route: AppRoute;
  };
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      accessibilityHint={row.description}
      onPress={() => navigate(row.route)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        marginBottom: space.xs,
        gap: space.md,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={20} color={iconColor} />
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
    </Pressable>
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
    <View
      style={{
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        gap: space.md,
      }}
    >
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
  );
}

function OutstandingTransactionCardItem({
  row,
  navigate,
}: {
  row: {
    key: string;
    title: string;
    status: string;
    amount: { label: string; value?: number | null };
    route: AppRoute;
  };
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      accessibilityHint={description}
      onPress={() => navigate(row.route)}
      style={({ pressed }) => ({
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        marginBottom: space.xs,
        gap: space.xs,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            color: palette.text,
            flex: 1,
          }}
          numberOfLines={2}
        >
          {row.title}
        </Text>
        <ChevronRight size={18} color={palette.mutedLabel} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
        }}
      >
        <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
          {description}
        </Text>
      </View>
    </Pressable>
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
          borderRadius: radius.surface,
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
          borderRadius: radius.surface,
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
