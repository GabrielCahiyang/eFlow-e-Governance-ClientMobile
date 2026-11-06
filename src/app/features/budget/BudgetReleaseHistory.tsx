import { View } from "../../components/ui/Primitives";
import { Text } from "../../components/ui/Typography";
import { budgetVersionChanges } from "../../../core/web/app/features/budget/selectors/budgetVersions";
import { useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Sheet,
  dateLabel,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import {
  fetchBudgetSections,
  confirmOfficeBudgetRelease,
} from "../../../core/web/app/features/budget/services/budgetSectionService";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";

export function BudgetReleaseHistory({
  office,
  year,
  onSaved,
}: {
  office: string;
  year: number;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const facts = useFacts(
    "office-budget-releases:" + profile?.id + ":" + office + ":" + year,
    () => fetchBudgetSections(office, year),
    !!office && !!profile,
  );
  const data = facts.data;
  const versions = data?.budgetVersions || [];
  const latest = [...versions].sort((a, b) => b.version - a.version)[0];
  const rows = (data?.sections || [])
    .filter(
      (a) =>
        !a.retired &&
        !(data?.sections || []).some(
          (child) => !child.retired && child.parentId === a.id,
        ),
    )
    .flatMap((a) =>
      (a.releaseSchedule || []).map((r) => ({ account: a, release: r })),
    )
    .sort((a, b) => a.release.date.localeCompare(b.release.date));
  const [month, setMonth] = useState(
    () => Number(getPhilippineCalendarDate().slice(5, 7)) - 1,
  );
  const [day, setDay] = useState("");
  const monthDate = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const first = monthDate.getUTCDay();
  const prefix = year + "-" + String(month + 1).padStart(2, "0");
  const visible = rows.filter(({ release }) =>
    day ? release.date === day : release.date.startsWith(prefix),
  );
  const [history, setHistory] = useState(false);
  const [selected, setSelected] = useState<(typeof rows)[number]>();
  const [reference, setReference] = useState("");
  const [expected, setExpected] = useState(0);
  const action = useAction();
  return (
    <>
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!latest && (
        <Card title={"Office Budget Â· V" + latest.version}>
          <LabelValue label="Total" value={peso(latest.total)} />
          <Notice>
            {latest.actorName} Â· {dateLabel(latest.createdAt)} Â·{" "}
            {latest.reason}
          </Notice>
          <Button variant="outline" onPress={() => setHistory(!history)}>
            {history ? "Hide version history" : "Show version history"}
          </Button>
          {history &&
            [...versions]
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <Card
                  key={version.version}
                  title={"Version " + version.version}
                >
                  <LabelValue label="Total" value={peso(version.total)} />
                  <Notice>
                    {version.actorName} Â· {dateLabel(version.createdAt)} Â·{" "}
                    {version.reason}
                  </Notice>
                  {version.q4Target !== undefined && (
                    <LabelValue
                      label="Q4 target"
                      value={version.q4Target + "%"}
                    />
                  )}
                  {(() => {
                    const prior = versions
                      .filter((v) => v.version < version.version)
                      .sort((a, b) => b.version - a.version)[0];
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
                          value={
                            peso(prior.total) + " → " + peso(version.total)
                          }
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
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
          <Text>
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
            <Text key={d} style={{ flex: 1, textAlign: "center" }}>
              {d}
            </Text>
          ))}
        </View>
        {Array.from({ length: Math.ceil((first + days) / 7) }, (_, week) => (
          <View key={week} style={{ flexDirection: "row" }}>
            {Array.from({ length: 7 }, (_, slot) => {
              const d = week * 7 + slot - first + 1;
              const key = prefix + "-" + String(d).padStart(2, "0");
              const count = rows.filter((r) => r.release.date === key).length;
              return (
                <View key={slot} style={{ flex: 1, minHeight: 46 }}>
                  {d > 0 && d <= days && (
                    <Button
                      style={{ paddingHorizontal: 0, flexShrink: 0 }}
                      variant={day === key ? "primary" : "ghost"}
                      accessibilityLabel={key + ", " + count + " releases"}
                      onPress={() => setDay(day === key ? "" : key)}
                    >
                      {String(d) + (count ? " •" : "")}
                    </Button>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        {day && (
          <Button variant="outline" onPress={() => setDay("")}>
            Show whole month
          </Button>
        )}
        {!visible.length && (
          <Notice>No releases scheduled for this selection.</Notice>
        )}
        {visible.map(({ account, release }) => (
          <Card
            key={account.id + ":" + release.id}
            title={dateLabel(release.date) + " Â· " + account.name}
          >
            <LabelValue
              label={release.status === "confirmed" ? "Confirmed" : "Pending"}
              value={peso(release.amount)}
            />
            {!!release.reference && (
              <Notice>
                {release.confirmedByName} Â· {release.reference}
              </Notice>
            )}
            {data?.canConfirmBudgetReleases &&
              release.status === "pending" &&
              !!release.date &&
              release.date <= getPhilippineCalendarDate() && (
                <Button
                  variant="outline"
                  onPress={() => {
                    action.clear();
                    setReference("");
                    setExpected(data.sectionsVersion);
                    setSelected({ account, release });
                  }}
                >
                  Confirm availability
                </Button>
              )}
          </Card>
        ))}
      </Card>
      {!!selected && (
        <Sheet
          open
          title="Confirm budget availability"
          busy={action.busy}
          onClose={() => {
            if (!action.busy) setSelected(undefined);
          }}
        >
          <Notice>
            Make {peso(selected.release.amount)} available to{" "}
            {selected.account.name}. This does not release physical cash.
          </Notice>
          <Field
            label="Confirmation reference"
            value={reference}
            onChangeText={setReference}
          />
          {!!action.error && <ErrorState context="action" error={action.error} />}
          <Button
            busy={action.busy}
            disabled={!reference.trim()}
            onPress={() =>
              void action.run(async () => {
                await confirmOfficeBudgetRelease(
                  selected.account.id,
                  selected.release.id,
                  expected,
                  reference,
                );
                setSelected(undefined);
                await facts.refresh();
                await onSaved().catch(() => {});
              })
            }
          >
            Confirm availability
          </Button>
        </Sheet>
      )}
    </>
  );
}
