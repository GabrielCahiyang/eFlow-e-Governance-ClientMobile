import { Linking } from "react-native";
import {
  Card,
  Button,
  ErrorState,
  Screen,
  Loading,
  Empty,
  LabelValue,
  peso,
  Notice,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import { createReceiptSignedUrl } from "../../../core/web/app/features/budget/services/budgetService";
import { SettlementPanel } from "./SettlementPanel";
export function FinancialReviewsScreen({
  recordId,
}: { recordId?: string } = {}) {
  const { profile } = useAuth(),
    facts = useFacts("assigned-review-packages:" + profile!.id, () =>
      getAssignedIndependentReviews(profile!.id),
    ),
    action = useAction();
  const packages = facts.data?.filter(
    (pack) =>
      !recordId ||
      pack.liquidation.id === recordId ||
      pack.context.review?.id === recordId,
  );
  return (
    <Screen
      title="Assigned financial reviews"
      onRefresh={() => facts.refresh()}

    >
      <Notice>
        These packages are assigned to you. Review approval does not grant
        settlement or journal-posting permission.
      </Notice>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data ? (
        <Loading label="Loading assigned review packages" layout="review" />
      ) : !packages?.length ? (
        <Empty
          kind="finance"
          action={
            <Button variant="outline" onPress={() => void facts.refresh()}>
              Refresh assigned reviews
            </Button>
          }
          title={
            recordId
              ? "This assigned review is no longer available"
              : "No assigned packages waiting"
          }
        />
      ) : (
        packages.map((pack) => (
          <Card key={pack.liquidation.id} title={pack.request.purpose}>
            <LabelValue label="Request" value={pack.request.requestNumber} />
            <LabelValue
              label="Actual spent"
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
