import { Pressable, StyleSheet, View } from "react-native";
import Calendar from "lucide-react-native/icons/calendar";
import Check from "lucide-react-native/icons/check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import X from "lucide-react-native/icons/x";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { budgetVersionChanges } from "../../../core/web/app/features/budget/selectors/budgetVersions";
import { useCallback, useState } from "react";
import {
  Button,
  Card,
  DetailGroup,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  Status,
  dateLabel,
  peso,
  withOpacity,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import { nativeWindow } from "../../../platform/webRuntime";
import { supabase } from "../../../platform/supabase";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import {
  confirmOfficeBudgetRelease,
  fetchBudgetSections,
} from "../../../core/web/app/features/budget/services/budgetSectionService";
import { useOfficeFinanceUpdates } from "./useOfficeFinanceUpdates";

type ReleaseTarget = {
  account: string;
  release: string;
  title: string;
  date: string;
  amount: number;
  version: number;
};

async function loadSchedule(office: string, year: number) {
  const [sections, summary] = await Promise.all([
    fetchBudgetSections(office, year),
    supabase.rpc("department_budget_summary", {
      p_org_id: office,
      p_fiscal_year: year,
    }),
  ]);
  if (summary.error) throw summary.error;
  const budget = summary.data;
  if (budget && (budget.orgId !== office || Number(budget.fiscalYear) !== year))
    throw new PublicMessageError(
      "Could not verify this Office and fiscal year.",
    );
  const canConfirm =
    budget?.status === "locked" &&
    "canConfirmBudgetReleases" in sections &&
    sections.canConfirmBudgetReleases === true;
  const releases = sections.sections
    .filter(
      (account) =>
        !account.retired &&
        !sections.sections.some(
          (child) => !child.retired && child.parentId === account.id,
        ),
    )
    .flatMap((account) =>
      (account.releaseSchedule ?? []).map((release) => ({
        account: account.id,
        title: account.name,
        release,
      })),
    )
    .sort((first, second) =>
      first.release.date.localeCompare(second.release.date),
    );
  return {
    available:
      "releaseScheduleAvailable" in sections &&
      sections.releaseScheduleAvailable === true,
    version: sections.sectionsVersion,
    versions: sections.budgetVersions ?? [],
    canConfirm,
    releases,
  };
}

export function BudgetReleaseHistory({
  actor,
  office,
  year,
  onChanged,
}: {
  actor: string;
  office: string;
  year: number;
  onChanged: () => Promise<unknown>;
}) {
  const facts = useFacts(
    JSON.stringify(["office-budget-releases", actor, office, year]),
    () => loadSchedule(office, year),
  );
  const reload = useCallback(() => facts.refresh(), [facts.refresh]);
  useOfficeFinanceUpdates(office, year, true, reload);
  const [target, setTarget] = useState<ReleaseTarget>();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const insetBg = isDark ? withOpacity(palette.background, 0.72) : "#f7f9fd";
  const [history, setHistory] = useState(false);
  const [month, setMonth] = useState(
    () => Number(getPhilippineCalendarDate().slice(5, 7)) - 1,
  );
  const [day, setDay] = useState("");
  const action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(
      actor,
      "budget-release-confirm:" +
        office +
        ":" +
        year +
        ":" +
        (target ? target.account + ":" + target.release : "none"),
    ),
    !!target,
    () => ({ reference: "" }), { restoreOnOpen: false },
  );
  const reference = draft.reference;
  const data = facts.error ? undefined : facts.data;
  const today = getPhilippineCalendarDate();
  const closeTarget = () => {
    if (action.busy) return;
    action.clear();
    setTarget(undefined);
  };

  const submit = () =>
    action.run(async () => {
      if (!target || !reference.trim()) return;
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor)
        throw new PublicMessageError(
          "Sign in with the same account to continue.",
        );
      const latest = await loadSchedule(office, year);
      const match = latest.releases.find(
        ({ account, release }) =>
          account === target.account && release.id === target.release,
      );
      if (!latest.canConfirm || !match)
        throw new PublicMessageError(
          "This release is no longer available to confirm.",
        );
      if (match.release.status === "pending") {
        if (
          match.release.date > getPhilippineCalendarDate() ||
          match.release.date !== target.date ||
          match.release.amount !== target.amount ||
          latest.version !== target.version
        ) {
          await reload();
          setTarget(undefined);
          throw new PublicMessageError(
            "The release schedule changed. Open the latest release to confirm it.",
          );
        }
        try {
          await confirmOfficeBudgetRelease(
            target.account,
            target.release,
            target.version,
            reference,
          );
        } catch (error) {
          const verified = await loadSchedule(office, year).catch(
            () => undefined,
          );
          if (
            !verified?.releases.some(
              ({ account, release }) =>
                account === target.account &&
                release.id === target.release &&
                release.status === "confirmed",
            )
          )
            throw error;
        }
      }
      clearDraft();
      setTarget(undefined);
      nativeWindow.dispatchEvent({
        type: "eflow:finance-updated",
        detail: { orgId: office, fiscalYear: year },
      });
      await Promise.all([reload(), onChanged()]).catch(() => {});
    }, "Budget availability updated.");

  const versions = [...(data?.versions ?? [])].sort(
    (a, b) => b.version - a.version,
  );
  const latest = versions[0];
  const rows = data?.releases ?? [];
  const prefix = year + "-" + String(month + 1).padStart(2, "0");
  const monthDate = new Date(Date.UTC(year, month, 1));
  const first = monthDate.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const visible = rows.filter(({ release }) =>
    day ? release.date === day : release.date.startsWith(prefix),
  );
  const monthLabel = monthDate.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Card
        title="Budget release schedule"
        icon={<Calendar size={16} color={palette.primary} />}
        badge={
          data?.available
            ? `${visible.length} ${visible.length === 1 ? "release" : "releases"}`
            : undefined
        }
      >
        {data?.available && (
          <View style={s.calendarSection}>
            <View
              style={[
                s.monthBar,
                { backgroundColor: insetBg, borderColor: palette.border },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                accessibilityState={{ disabled: month === 0 }}
                disabled={month === 0}
                hitSlop={6}
                onPress={() => {
                  setMonth(month - 1);
                  setDay("");
                }}
                style={({ pressed }) => [
                  s.monthBtn,
                  {
                    backgroundColor: pressed
                      ? palette.primarySoft
                      : palette.surface,
                    borderColor: palette.border,
                    opacity: month === 0 ? 0.4 : 1,
                  },
                ]}
              >
                <ChevronLeft size={16} color={palette.primary} />
              </Pressable>
              <Text style={[s.monthTitle, { color: palette.text }]}>
                {monthLabel}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                accessibilityState={{ disabled: month === 11 }}
                disabled={month === 11}
                hitSlop={6}
                onPress={() => {
                  setMonth(month + 1);
                  setDay("");
                }}
                style={({ pressed }) => [
                  s.monthBtn,
                  {
                    backgroundColor: pressed
                      ? palette.primarySoft
                      : palette.surface,
                    borderColor: palette.border,
                    opacity: month === 11 ? 0.4 : 1,
                  },
                ]}
              >
                <ChevronRight size={16} color={palette.primary} />
              </Pressable>
            </View>

            <View style={s.weekHeader}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Text
                  key={d}
                  style={[s.weekDayText, { color: palette.mutedLabel }]}
                >
                  {d}
                </Text>
              ))}
            </View>

            <View style={s.weeksGrid}>
              {Array.from(
                { length: Math.ceil((first + days) / 7) },
                (_, week) => (
                  <View key={week} style={s.weekRow}>
                    {Array.from({ length: 7 }, (_, slot) => {
                      const d = week * 7 + slot - first + 1;
                      const key = prefix + "-" + String(d).padStart(2, "0");
                      const count = rows.filter(
                        (r) => r.release.date === key,
                      ).length;
                      const isSelected = day === key;
                      const hasReleases = count > 0;
                      return (
                        <View key={slot} style={s.daySlot}>
                          {d > 0 && d <= days && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                key + ", " + count + " releases"
                              }
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => setDay(isSelected ? "" : key)}
                              style={({ pressed }) => [
                                s.dayCell,
                                {
                                  backgroundColor: isSelected
                                    ? palette.primary
                                    : hasReleases
                                      ? palette.primarySoft
                                      : pressed
                                        ? insetBg
                                        : "transparent",
                                  borderColor: isSelected
                                    ? palette.primary
                                    : hasReleases
                                      ? withOpacity(palette.primary, 0.28)
                                      : "transparent",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  s.dayText,
                                  {
                                    color: isSelected
                                      ? palette.onPrimary
                                      : hasReleases
                                        ? palette.primary
                                        : palette.text,
                                    fontWeight:
                                      isSelected || hasReleases ? "700" : "500",
                                  },
                                ]}
                              >
                                {String(d)}
                              </Text>
                              {hasReleases && (
                                <View
                                  style={[
                                    s.dayMarker,
                                    {
                                      backgroundColor: isSelected
                                        ? palette.onPrimary
                                        : palette.primary,
                                    },
                                  ]}
                                />
                              )}
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ),
              )}
            </View>

            {day && (
              <Button
                compact
                variant="outline"
                icon={<Calendar size={14} color={palette.primary} />}
                onPress={() => setDay("")}
              >
                Show whole month
              </Button>
            )}
          </View>
        )}

        {!!action.notice && <Notice tone="success">{action.notice}</Notice>}
        {!target && !!action.error && (
          <ErrorState context="action" error={action.error} />
        )}

        {facts.error ? (
          <ErrorState error={facts.error} retry={() => void reload()} />
        ) : !data ? (
          <Loading label="Loading budget releases" layout="summary" />
        ) : !data.available ? (
          <Empty
            kind="finance"
            compact
            title="Budget release schedule unavailable"
          />
        ) : visible.length ? (
          <View style={s.releaseList}>
            {visible.map(({ account, title, release }) => {
              const isConfirmed = release.status === "confirmed";
              const isDue = !isConfirmed && release.date <= today;
              const statusText = isConfirmed
                ? release.automatic
                  ? "Released automatically"
                  : "Released"
                : isDue
                  ? "Release due"
                  : "Scheduled";
              const statusCode = isConfirmed
                ? "completed"
                : isDue
                  ? "pending"
                  : "scheduled_for_release";

              return (
                <View
                  key={account + ":" + release.id}
                  style={[
                    s.releaseCard,
                    { backgroundColor: insetBg, borderColor: palette.border },
                  ]}
                >
                  <View style={s.releaseHeader}>
                    <Text style={[s.releaseTitle, { color: palette.text }]}>
                      {title}
                    </Text>
                    <Text style={[s.releaseAmount, { color: palette.text }]}>
                      {peso(release.amount)}
                    </Text>
                  </View>

                  <View style={s.releaseMetaRow}>
                    <Status
                      value={statusCode}
                      label={statusText}
                      variant="pill"
                    />
                    <View style={s.releaseDateTag}>
                      <Calendar size={12} color={palette.mutedLabel} />
                      <Text
                        style={[s.releaseDateText, { color: palette.mutedLabel }]}
                      >
                        {workDateLabel(release.date, "Asia/Manila")}
                      </Text>
                    </View>
                  </View>

                  {isConfirmed &&
                    (release.confirmedByName || release.reference) && (
                      <DetailGroup>
                        {release.confirmedByName && (
                          <LabelValue
                            label="Confirmed by"
                            value={release.confirmedByName}
                          />
                        )}
                        {!!release.reference && (
                          <LabelValue
                            label="Reference"
                            value={release.reference}
                          />
                        )}
                      </DetailGroup>
                    )}

                  {data.canConfirm &&
                    release.status === "pending" &&
                    release.date <= today && (
                      <View style={s.releaseActionRow}>
                        <Button
                          compact
                          variant="outline"
                          disabled={facts.loading}
                          icon={<Check size={14} color={palette.primary} />}
                          onPress={() => {
                            action.clear();
                            setTarget({
                              account,
                              release: release.id,
                              title,
                              date: release.date,
                              amount: release.amount,
                              version: data.version,
                            });
                          }}
                        >
                          Confirm availability
                        </Button>
                      </View>
                    )}
                </View>
              );
            })}
          </View>
        ) : (
          <Empty
            kind="finance"
            compact
            title="No releases scheduled for this selection"
          />
        )}

        <Notice tone="neutral">
          Scheduled amounts become available on their release date.
        </Notice>

        {target && (
          <Sheet
            open
            title="Confirm budget availability"
            description={target.title}
            busy={action.busy}
            onClose={closeTarget}
            footer={
              <Row>
                <Button
                  variant="outline"
                  disabled={action.busy}
                  icon={<X size={15} color={palette.primary} />}
                  onPress={closeTarget}
                >
                  Cancel confirmation
                </Button>
                <Button
                  busy={action.busy}
                  disabled={!reference.trim()}
                  icon={<Check size={15} color={palette.onPrimary} />}
                  onPress={() => void submit()}
                >
                  Confirm availability
                </Button>
              </Row>
            }
          >
            <DetailGroup>
              <LabelValue label="Account" value={target.title} />
              <LabelValue
                label="Scheduled date"
                value={workDateLabel(target.date, "Asia/Manila")}
              />
              <LabelValue label="Amount" value={peso(target.amount)} />
            </DetailGroup>
            <Notice tone="neutral">
              This makes budget available for commitments.
            </Notice>
            <Field
              label="Reference or note"
              value={reference}
              onChangeText={(next) => updateDraft({ reference: next })}
              maxLength={1000}
              editable={!action.busy}
              multiline
            />
            {!!action.error && (
              <ErrorState context="action" error={action.error} />
            )}
          </Sheet>
        )}
      </Card>

      {!!latest && (
        <Card
          title={"Office Budget · V" + latest.version}
          icon={<History size={16} color={palette.primary} />}
          badge={"V" + latest.version}
        >
          <DetailGroup>
            <LabelValue label="Total" value={peso(latest.total)} />
            <LabelValue
              label="Recorded"
              value={`${latest.actorName} · ${dateLabel(latest.createdAt)}`}
            />
            {!!latest.reason && (
              <LabelValue label="Reason" value={latest.reason} />
            )}
          </DetailGroup>

          <Button
            compact
            variant="outline"
            icon={<History size={14} color={palette.primary} />}
            onPress={() => setHistory(!history)}
          >
            {history ? "Hide version history" : "Show version history"}
          </Button>

          {history && (
            <View style={s.releaseList}>
              {versions.map((version, index) => {
                const prior = versions[index + 1];
                const changes = prior
                  ? budgetVersionChanges(prior, version)
                  : undefined;
                return (
                  <View
                    key={version.version}
                    style={[
                      s.releaseCard,
                      { backgroundColor: insetBg, borderColor: palette.border },
                    ]}
                  >
                    <View style={s.releaseHeader}>
                      <Text style={[s.releaseTitle, { color: palette.text }]}>
                        {"Version " + version.version}
                      </Text>
                      <Text style={[s.releaseAmount, { color: palette.text }]}>
                        {peso(version.total)}
                      </Text>
                    </View>
                    <Text
                      style={[s.versionMeta, { color: palette.mutedLabel }]}
                    >
                      {version.actorName} · {dateLabel(version.createdAt)}
                      {version.reason ? ` · ${version.reason}` : ""}
                    </Text>
                    <DetailGroup>
                      {version.q4Target !== undefined && (
                        <LabelValue
                          label="Q4 target"
                          value={version.q4Target + "%"}
                        />
                      )}
                      {!prior ? (
                        version.accounts.map((a) => (
                          <LabelValue
                            key={a.id}
                            label={a.name}
                            value={peso(a.amount)}
                          />
                        ))
                      ) : (
                        <>
                          <LabelValue
                            label={"Total compared with V" + prior.version}
                            value={
                              peso(prior.total) + " → " + peso(version.total)
                            }
                          />
                          {changes!.map((c, i) => (
                            <LabelValue
                              key={i}
                              label={c.account + " · " + c.field}
                              value={c.before + " → " + c.after}
                            />
                          ))}
                        </>
                      )}
                    </DetailGroup>
                    {prior && !changes?.length && (
                      <Notice tone="neutral">
                        No account changes recorded.
                      </Notice>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}
    </>
  );
}

const s = StyleSheet.create({
  calendarSection: {
    gap: 10,
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  monthBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  monthTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  weekHeader: {
    flexDirection: "row",
    paddingTop: 2,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  weeksGrid: {
    gap: 4,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  daySlot: {
    flex: 1,
    minHeight: 40,
  },
  dayCell: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 3,
  },
  dayText: {
    fontSize: 13,
    lineHeight: 17,
    fontVariant: ["tabular-nums"],
  },
  dayMarker: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
  },
  releaseList: {
    gap: 10,
  },
  releaseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 9,
  },
  releaseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  releaseTitle: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "700",
  },
  releaseAmount: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  releaseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  releaseDateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  releaseDateText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  releaseActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 2,
  },
  versionMeta: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
