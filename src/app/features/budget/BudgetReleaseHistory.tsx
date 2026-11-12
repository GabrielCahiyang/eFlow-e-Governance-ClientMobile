import { View } from "react-native";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { budgetVersionChanges } from "../../../core/web/app/features/budget/selectors/budgetVersions";
import { useCallback, useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  dateLabel,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
  const [reference, setReference] = useState("");
  const palette = useTheme();
  const [history, setHistory] = useState(false);
  const [month, setMonth] = useState(
    () => Number(getPhilippineCalendarDate().slice(5, 7)) - 1,
  );
  const [day, setDay] = useState("");
  const action = useAction();
  const data = facts.error ? undefined : facts.data;
  const today = getPhilippineCalendarDate();

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
      setTarget(undefined);
      setReference("");
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
  return (
    <>
      {!!latest && (
        <Card title={"Office Budget · V" + latest.version}>
          <LabelValue label="Total" value={peso(latest.total)} />
          <Notice>
            {latest.actorName} · {dateLabel(latest.createdAt)} · {latest.reason}
          </Notice>
          <Button variant="outline" onPress={() => setHistory(!history)}>
            {history ? "Hide version history" : "Show version history"}
          </Button>
          {history &&
            versions.map((version, index) => (
              <Card key={version.version} title={"Version " + version.version}>
                <LabelValue label="Total" value={peso(version.total)} />
                <Notice>
                  {version.actorName} · {dateLabel(version.createdAt)} ·{" "}
                  {version.reason}
                </Notice>
                {version.q4Target !== undefined && (
                  <LabelValue
                    label="Q4 target"
                    value={version.q4Target + "%"}
                  />
                )}
                {(() => {
                  const prior = versions[index + 1];
                  if (!prior)
                    return version.accounts.map((a) => (
                      <LabelValue
                        key={a.id}
                        label={a.name}
                        value={peso(a.amount)}
                      />
                    ));
                  const changes = budgetVersionChanges(prior, version);
                  return (
                    <>
                      <LabelValue
                        label={"Total compared with V" + prior.version}
                        value={peso(prior.total) + " → " + peso(version.total)}
                      />
                      {!changes.length && (
                        <Notice>No account changes recorded.</Notice>
                      )}
                      {changes.map((c, i) => (
                        <LabelValue
                          key={i}
                          label={c.account + " · " + c.field}
                          value={c.before + " → " + c.after}
                        />
                      ))}
                    </>
                  );
                })()}
              </Card>
            ))}
        </Card>
      )}
      <Card title="Budget release schedule">
        <Notice>
          Scheduled amounts become available on their release date, Philippine
          time.
        </Notice>
        {data?.available && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Button
                variant="ghost"
                disabled={month === 0}
                onPress={() => {
                  setMonth(month - 1);
                  setDay("");
                }}
              >
                Previous
              </Button>
              <Text style={{ color: palette.text }}>
                {monthDate.toLocaleDateString("en-PH", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </Text>
              <Button
                variant="ghost"
                disabled={month === 11}
                onPress={() => {
                  setMonth(month + 1);
                  setDay("");
                }}
              >
                Next
              </Button>
            </View>
            <View style={{ flexDirection: "row" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Text
                  key={d}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: palette.mutedLabel,
                  }}
                >
                  {d}
                </Text>
              ))}
            </View>
            {Array.from(
              { length: Math.ceil((first + days) / 7) },
              (_, week) => (
                <View key={week} style={{ flexDirection: "row" }}>
                  {Array.from({ length: 7 }, (_, slot) => {
                    const d = week * 7 + slot - first + 1;
                    const key = prefix + "-" + String(d).padStart(2, "0");
                    const count = rows.filter(
                      (r) => r.release.date === key,
                    ).length;
                    return (
                      <View key={slot} style={{ flex: 1, minHeight: 46 }}>
                        {d > 0 && d <= days && (
                          <Button
                            style={{ paddingHorizontal: 0, flexShrink: 0 }}
                            variant={
                              day === key
                                ? "primary"
                                : count
                                  ? "outline"
                                  : "ghost"
                            }
                            accessibilityLabel={
                              key + ", " + count + " releases"
                            }
                            onPress={() => setDay(day === key ? "" : key)}
                          >
                            {String(d)}
                          </Button>
                        )}
                      </View>
                    );
                  })}
                </View>
              ),
            )}
            {day && (
              <Button variant="outline" onPress={() => setDay("")}>
                Show whole month
              </Button>
            )}
          </>
        )}
        {!!action.notice && <Notice>{action.notice}</Notice>}
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
          visible.map(({ account, title, release }) => (
            <Card key={account + ":" + release.id} title={title}>
              <LabelValue
                label={workDateLabel(release.date, "Asia/Manila")}
                value={peso(release.amount)}
              />
              <Notice>
                {release.status === "confirmed"
                  ? release.automatic
                    ? "Released automatically"
                    : "Released"
                  : release.date <= today
                    ? "Release due"
                    : "Scheduled"}
              </Notice>
              {release.status === "confirmed" && release.confirmedByName && (
                <LabelValue
                  label="Confirmed by"
                  value={release.confirmedByName}
                />
              )}
              {release.status === "confirmed" && !!release.reference && (
                <LabelValue label="Reference" value={release.reference} />
              )}
              {data.canConfirm &&
                release.status === "pending" &&
                release.date <= today && (
                  <Button
                    variant="outline"
                    disabled={facts.loading}
                    onPress={() => {
                      action.clear();
                      setReference("");
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
                )}
            </Card>
          ))
        ) : (
          <Empty
            kind="finance"
            compact
            title="No releases scheduled for this selection"
          />
        )}
        {target && (
          <Sheet
            open
            title="Confirm budget availability"
            description={target.title}
            busy={action.busy}
            onClose={() => setTarget(undefined)}
            footer={
              <Row>
                <Button
                  variant="outline"
                  disabled={action.busy}
                  onPress={() => setTarget(undefined)}
                >
                  Cancel
                </Button>
                <Button
                  busy={action.busy}
                  disabled={!reference.trim()}
                  onPress={() => void submit()}
                >
                  Confirm availability
                </Button>
              </Row>
            }
          >
            <LabelValue label="Amount" value={peso(target.amount)} />
            <Notice>This makes budget available for commitments.</Notice>
            <Field
              label="Reference or note"
              value={reference}
              onChangeText={setReference}
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
    </>
  );
}
