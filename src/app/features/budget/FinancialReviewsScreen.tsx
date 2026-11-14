import { AppState, Linking } from "react-native";
import { useEffect } from "react";
import {
  Card,
  Button,
  EditorialMetadataStrip,
  ErrorState,
  Screen,
  Loading,
  Empty,
  LabelValue,
  peso,
  Notice,
  Status,
} from "../../components/ui";
import { statusLabel } from "../../shared/statusLabels";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import { createReceiptSignedUrl } from "../../../core/web/app/features/budget/services/budgetService";
import { SettlementPanel } from "./SettlementPanel";
import { getStaffingReviewPackage } from "./staffingEscalation";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { cashRequestReference } from "./mobileFinanceScope";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
export function FinancialReviewsScreen({
  recordId,
  recordType,
}: { recordId?: string; recordType?: string } = {}) {
  const { profile, organization } = useAuth();
  const staffing = recordType === "settlement_staffing";
  const actor = profile?.id;
  const office = profile?.org_id;
  const facts = useFacts(
      `assigned-review-packages:${actor}:${office}:${staffing ? recordId : "assigned"}`,
      async () => {
        if (staffing) {
          const pack = await getStaffingReviewPackage(recordId!, office!);
          return pack ? [{ ...pack, context: null }] : [];
        }
        return getAssignedIndependentReviews(actor!);
      },
      !!actor &&
        (!staffing || !!(recordId && office && profile?.role === "head")),
    ),
    action = useAction();
  useEffect(() => {
    if (!actor || (staffing && profile?.role !== "head")) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer || AppState.currentState !== "active") return;
      timer = setTimeout(() => {
        timer = undefined;
        void facts.refresh();
      }, 250);
    };
    const channel = createPostgresChannel(`native-financial-reviews:${actor}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "petty_cash_liquidations",
          ...(staffing ? { filter: `id=eq.${recordId}` } : {}),
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${actor}`,
        },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    nativeWindow.addEventListener("eflow:finance-updated", refresh);
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const fallback = setInterval(refresh, 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      nativeWindow.removeEventListener("eflow:finance-updated", refresh);
      app.remove();
      void supabase.removeChannel(channel);
    };
  }, [actor, facts.refresh, profile?.role, recordId, staffing]);
  const packages = facts.data?.filter(
    (pack) =>
      !recordId ||
      pack.liquidation.id === recordId ||
      pack.context?.review?.id === recordId,
  );
  return (
    <Screen
      title={staffing ? "Escalated settlement" : "Assigned financial reviews"}
    >
      {!staffing && (
        <Notice>
          Review receipts assigned to you. Settlement and journal posting have
          separate permissions.
        </Notice>
      )}
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading label="Loading assigned review packages" layout="review" />
      ) : !packages?.length ? (
        <Empty
          kind="finance"
          title={
            recordId
              ? "This assigned review is no longer available"
              : "No assigned packages waiting"
          }
        />
      ) : (
        packages.map((pack) => (
          <Card key={pack.liquidation.id} title={pack.request.purpose}>
            <EditorialMetadataStrip
              variant="card"
              items={[
                {
                  label: "Status",
                  value: statusLabel(pack.request.status, "finance"),
                  status: pack.request.status,
                  domain: "finance",
                },
                {
                  label: "Declared",
                  value: peso(pack.liquidation.declaredSpent),
                },
              ]}
              style={{ marginBottom: 6 }}
            />
            <LabelValue
              label="Request"
              value={cashRequestReference(pack.request.requestNumber)}
            />
            {staffing && organization?.name && (
              <LabelValue label="Office" value={organization.name} />
            )}
            {"year" in pack && (
              <LabelValue label="Fiscal year" value={String(pack.year)} />
            )}
            {pack.request.status === "settled" && (
              <Notice>Settlement posted.</Notice>
            )}
            <LabelValue
              label="Declared spending"
              value={peso(pack.liquidation.declaredSpent)}
            />
            {pack.liquidation.receipts.map((receipt) => (
              <Card key={receipt.id} title={receipt.vendor}>
                <LabelValue
                  label="Receipt"
                  value={receipt.receiptNumber || "—"}
                />
                <LabelValue label="Amount" value={peso(receipt.amount)} />
                <LabelValue label="Description" value={receipt.description} />
                {receipt.items?.map((item) => (
                  <LabelValue
                    key={item.id}
                    label={item.particular}
                    value={`${item.quantity} ${item.unit} · ${peso(item.amount)}`}
                  />
                ))}
                <Button
                  variant="outline"
                  busy={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await Linking.openURL(
                        await createReceiptSignedUrl(receipt.filePath),
                      );
                    })
                  }
                >
                  Open receipt evidence
                </Button>
              </Card>
            ))}
            <SettlementPanel
              request={pack.request}
              liquidation={pack.liquidation}
              onSaved={facts.refresh}
            />
          </Card>
        ))
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Screen>
  );
}
