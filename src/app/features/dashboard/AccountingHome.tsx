import { useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import { ErrorState, LabelValue, Loading, Screen } from "../../components/ui";
import { recordedPeso } from "../../components/ui/theme";
import { statusLabel } from "../../shared/statusLabels";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { nativeWindow } from "../../../platform/webRuntime";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { accountingHomeQueue, assignedFinanceReviews } from "./homeFinance";
import { officeFinancialSummary } from "../budget/officeFinancialSummary";
import { HomeLink, HomeMessage, HomeSection } from "./HomeSections";

export function AccountingHome({ navigate }: { navigate: Navigate }) {
  const { profile, organization, can } = useAuth();
  const workspace = useWorkspace();
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
    .slice(0, 5);
  const loading = queue.loading || reviews.loading;
  const error = queue.error || reviews.error;
  return (
    <Screen
      compact
      title="Financial Work"
      description={
        office
          ? `${organization?.name || "Assigned Office"} · FY ${year}`
          : undefined
      }
      onRefresh={refresh}
    >
      {!office ? (
        <HomeMessage>
          An assigned Office is required to see financial work.
        </HomeMessage>
      ) : (
        <>
          <HomeSection title="Action Required">
            {actionRows.map((row) => (
              <HomeLink key={row.key} row={row} navigate={navigate} />
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
                  <HomeMessage>
                    No verified actions in your assigned Office.
                  </HomeMessage>
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
              <HomeSection title="Financial Workflow">
                {queue.error ? (
                  <HomeMessage>Request counts are unavailable.</HomeMessage>
                ) : transactions ? (
                  <>
                    <HomeMessage>
                      Requests visible to your account in this Office and fiscal
                      year.
                    </HomeMessage>
                    {transactions.counts.map(({ label, count }) => (
                      <LabelValue
                        key={label}
                        label={label}
                        value={count ?? "Unavailable"}
                      />
                    ))}
                  </>
                ) : queue.loading ? (
                  <Loading
                    label="Loading request counts"
                    layout="summary"
                    rows={2}
                  />
                ) : (
                  <HomeMessage>
                    No authorized fiscal budget is available for this year.
                  </HomeMessage>
                )}
                <HomeLink
                  row={{
                    title: "View requests and releases",
                    route: {
                      name: "accounting_releases",
                      financialOfficeId: office,
                      fiscalYear: year,
                    },
                  }}
                  navigate={navigate}
                />
              </HomeSection>
              <HomeSection title="Outstanding Transactions">
                {transactions?.outstanding.map((row) => (
                  <HomeLink
                    key={row.key}
                    row={{
                      ...row,
                      description: [
                        "Monitoring",
                        statusLabel(row.status, "finance"),
                        row.amount.value == null
                          ? undefined
                          : `${row.amount.label} ${recordedPeso(row.amount.value)}`,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    }}
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
            <HomeSection title="Financial Summary">
              {summary.error ? (
                <ErrorState
                  error="The Office financial summary is unavailable."
                  retry={() => void summary.refresh()}
                />
              ) : totals ? (
                <>
                  {totals.approved != null && (
                    <LabelValue
                      label="Approved appropriation"
                      value={recordedPeso(totals.approved)}
                    />
                  )}
                  {totals.settled != null && (
                    <LabelValue
                      label="Settled expenditure"
                      value={recordedPeso(totals.settled)}
                    />
                  )}
                  {totals.approved == null && totals.settled == null && (
                    <HomeMessage>
                      Verified financial amounts are unavailable.
                    </HomeMessage>
                  )}
                </>
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
              <HomeLink
                row={{
                  title: "Open Accounting",
                  route: { name: "accounting_overview" },
                }}
                navigate={navigate}
              />
            </HomeSection>
          )}
        </>
      )}
    </Screen>
  );
}
