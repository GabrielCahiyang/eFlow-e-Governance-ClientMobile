import { officeLabel as mobileOfficeLabel } from "../../shared/officeLabels";
import { Linking, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import FileText from "lucide-react-native/icons/file-text";
import ImageIcon from "lucide-react-native/icons/image";
import Receipt from "lucide-react-native/icons/receipt";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import {
  Card,
  ErrorState,
  Screen,
  Loading,
  Empty,
  peso,
  Notice,
  withOpacity,
} from "../../components/ui";
import { View } from "../../components/ui/Primitives";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { statusLabel } from "../../shared/statusLabels";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import { createReceiptSignedUrl } from "../../../core/web/app/features/budget/services/budgetService";
import { SettlementPanel } from "./SettlementPanel";
import { getStaffingReviewPackage } from "./staffingEscalation";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { cashRequestReference } from "./mobileFinanceScope";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";

export function FinancialReviewsScreen({
  recordId,
  recordType,
}: { recordId?: string; recordType?: string } = {}) {
  const { profile, organization } = useAuth();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stackMetrics = fontScale > 1.35 || width < 320;
  const insetBg = isDark ? withOpacity(palette.background, 0.72) : "#f7f9fd";
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
    const live = createLiveRefreshController({
      onRefresh: () => void facts.refresh(),
      debounceMs: 250,
      hasRealtime: true,
    });
    const refresh = live.schedule;
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
      .subscribe(live.onChannelStatus);
    nativeWindow.addEventListener("eflow:finance-updated", refresh);
    return () => {
      live.dispose();
      nativeWindow.removeEventListener("eflow:finance-updated", refresh);
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
      compact
      title={staffing ? "Escalated settlement" : "Assigned financial reviews"}
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading label="Loading assigned review packages" layout="review" />
      ) : !packages?.length ? (
        <Empty
          compact
          kind={recordId ? "budget" : "complete"}
          title={
            recordId
              ? "This assigned review is no longer available"
              : "No assigned packages waiting"
          }
        />
      ) : (
        packages.map((pack) => {
          const yearSuffix = "year" in pack ? ` · FY ${pack.year}` : "";
          const officeLabel =
            staffing && organization?.name ? `${mobileOfficeLabel(organization.name)} · ` : "";
          return (
            <View key={pack.liquidation.id} style={s.packageRoot}>
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
                <View style={s.heroTopRow}>
                  <View style={s.heroRefPill}>
                    <Text style={s.heroRefText}>
                      {cashRequestReference(pack.request.requestNumber)}
                      {staffing ? " · Escalated" : ""}
                    </Text>
                  </View>
                  <View
                    accessibilityLabel={`Status: ${statusLabel(pack.request.status, "finance")}`}
                    style={s.heroStatusPill}
                  >
                    <ShieldCheck aria-hidden size={11.5} color="#ffffff" />
                    <Text style={s.heroStatusText}>
                      {statusLabel(pack.request.status, "finance")}
                    </Text>
                  </View>
                </View>

                <Text style={s.heroPurpose}>{pack.request.purpose}</Text>

                <View style={[s.heroSplit, stackMetrics && s.heroStacked]}>
                  <View style={s.heroCol}>
                    <Text style={s.heroK}>DECLARED SPENT</Text>
                    <Text style={s.heroV}>
                      {peso(pack.liquidation.declaredSpent)}
                    </Text>
                  </View>
                  <View
                    style={
                      stackMetrics ? s.heroDividerHorizontal : s.heroDivider
                    }
                  />
                  <View style={s.heroCol}>
                    <Text style={s.heroK}>RECEIPTS</Text>
                    <Text style={s.heroCountV}>
                      {pack.liquidation.receipts.length} attached
                    </Text>
                  </View>
                </View>

                <View style={s.heroFooter}>
                  <Text style={s.heroFooterText}>
                    {staffing
                      ? `${officeLabel}Escalated independent settlement${yearSuffix}`
                      : `Review receipts assigned to you. Settlement and journal posting have separate permissions.${yearSuffix}`}
                  </Text>
                </View>
              </LinearGradient>

              {pack.request.status === "settled" && (
                <Notice tone="success">Settlement posted.</Notice>
              )}

              {pack.liquidation.receipts.length > 0 && (
                <Card
                  title="Receipt evidence"
                  icon={<Receipt size={16} color={palette.primary} />}
                  badge={`${pack.liquidation.receipts.length} ${pack.liquidation.receipts.length === 1 ? "file" : "files"}`}
                >
                  <View style={s.rowsList}>
                    {pack.liquidation.receipts.map((receipt) => {
                      const Icon = receipt.mimeType?.startsWith("image/")
                        ? ImageIcon
                        : FileText;
                      return (
                        <View
                          key={receipt.id}
                          style={[
                            s.insetBox,
                            {
                              backgroundColor: insetBg,
                              borderColor: palette.border,
                            },
                          ]}
                        >
                          <View style={s.receiptTop}>
                            <Text
                              style={[s.receiptVendor, { color: palette.text }]}
                            >
                              {receipt.vendor}
                            </Text>
                            <Text
                              style={[s.receiptAmt, { color: palette.text }]}
                            >
                              {peso(receipt.amount)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              s.receiptMeta,
                              { color: palette.mutedLabel },
                            ]}
                          >
                            {receipt.receiptNumber
                              ? `${receipt.receiptNumber} · `
                              : ""}
                            {receipt.description}
                          </Text>
                          {receipt.items?.map((item) => (
                            <Text
                              key={item.id}
                              style={[
                                s.itemLine,
                                { color: palette.mutedLabel },
                              ]}
                            >
                              {item.particular} · {item.quantity} {item.unit} ·{" "}
                              {peso(item.amount)}
                            </Text>
                          ))}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Open receipt evidence for ${receipt.vendor}`}
                            disabled={action.busy}
                            onPress={() =>
                              void action.run(async () => {
                                await Linking.openURL(
                                  await createReceiptSignedUrl(receipt.filePath),
                                );
                              })
                            }
                            style={({ pressed }) => [
                              s.fileChip,
                              {
                                backgroundColor: pressed
                                  ? palette.primarySoft
                                  : palette.surface,
                                borderColor: palette.border,
                                opacity: action.busy ? 0.55 : 1,
                              },
                            ]}
                          >
                            <Icon size={13} color={palette.primary} />
                            <Text
                              style={[s.fileChipText, { color: palette.text }]}
                            >
                              Open receipt evidence
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              )}

              <SettlementPanel
                request={pack.request}
                liquidation={pack.liquidation}
                onSaved={facts.refresh}
              />
            </View>
          );
        })
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  packageRoot: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  heroRefPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroRefText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(226, 232, 240, 0.94)",
    fontVariant: ["tabular-nums"],
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  heroStatusText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroPurpose: {
    fontSize: 16.5,
    fontWeight: "800",
    lineHeight: 22,
    color: "#ffffff",
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
  heroCountV: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 6,
  },
  heroFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.14)",
  },
  heroFooterText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    color: "rgba(219, 234, 254, 0.88)",
  },
  rowsList: {
    gap: 8,
  },
  insetBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 6,
  },
  receiptTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  receiptVendor: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  receiptAmt: {
    fontSize: 14.5,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  receiptMeta: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  itemLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  fileChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 3,
  },
  fileChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
