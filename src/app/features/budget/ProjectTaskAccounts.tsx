import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import Plus from "lucide-react-native/icons/plus";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Wallet from "lucide-react-native/icons/wallet";
import X from "lucide-react-native/icons/x";
import {
  Button,
  Card,
  Choice,
  DetailGroup,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  MetricPair,
  Notice,
  peso,
  withOpacity,
} from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { PublicMessageError } from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { supabase } from "../../../platform/supabase";

type Source = {
  id: string;
  name: string;
  fiscal_year: number;
  available: number;
};
type Line = {
  id: string;
  taskId: string;
  sourceId?: string;
  source: string;
  fiscalYear?: number;
  amount: number;
  available: number;
};
type Flow = {
  ready: boolean;
  canAllocate: boolean;
  canExtendTaskFunding?: boolean;
  project: { status: string };
  funds: Source[];
  taskFunding: Line[];
  unallocated: number;
};
type Entry = { sourceId: string; amount: string };
type Attempt = { name: string; args: Record<string, unknown> };
const blank = (): Entry => ({ sourceId: "", amount: "" });
const total = (amounts: number[]) =>
  amounts.reduce((n, x) => n + Math.round(x * 100), 0) / 100;
const amountValue = (value: string) =>
  /^\d+(?:\.\d{1,2})?$/.test(value) ? Number(value) : 0;
async function command<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}

export function ProjectTaskAccounts({
  projectId,
  taskId,
  readOnly,
  onSaved,
}: {
  projectId: string;
  taskId: string;
  readOnly: boolean;
  onSaved: () => Promise<void>;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { profile } = useAuth();
  const facts = useFacts(
    "project-task-accounts:" + profile?.id + ":" + projectId,
    () => command<Flow>("project_flow_snapshot", { p_project: projectId }),
    !!profile,
  );
  const [rows, setRows] = useState<Entry[]>([blank()]);
  const [reason, setReason] = useState("");
  const [returning, setReturning] = useState<Line>();
  const [returnAmount, setReturnAmount] = useState("");
  const [retry, setRetry] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  const { toast } = useToast();
  const action = useAction();
  const data = facts.data;
  const lines = (data?.taskFunding || []).filter(
    (l) => l.taskId === taskId && l.amount > 0,
  );
  const used = new Set(lines.map((l) => l.sourceId));
  const year =
    lines[0]?.fiscalYear ||
    data?.funds.find((f) => used.has(f.id))?.fiscal_year;
  const sources = (data?.funds || []).filter(
    (f) =>
      f.available > 0 && !used.has(f.id) && (!year || f.fiscal_year === year),
  );
  const editable =
    !!data?.canAllocate &&
    !readOnly &&
    !["archived", "completed"].includes(data.project.status);
  const existing = total(lines.map((l) => l.amount));
  const adding = total(rows.map((r) => amountValue(r.amount)));
  const locked = action.busy || retry;
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";
  const update = (index: number, value: Partial<Entry>) =>
    setRows((old) =>
      old.map((row, i) => (i === index ? { ...row, ...value } : row)),
    );
  async function save() {
    if (!attempt.current) {
      if (!editable || !reason.trim())
        throw new PublicMessageError("Enter a reason before saving.");
      const key = crypto.randomUUID();
      if (returning) {
        const amount = amountValue(returnAmount);
        if (amount <= 0 || amount > returning.available)
          throw new PublicMessageError("Enter an amount within the unused balance.");
        attempt.current = {
          name: "release_project_task_funding",
          args: {
            p_line: returning.id,
            p_amount: amount,
            p_reason: reason.trim(),
            p_key: key,
          },
        };
      } else {
        if (!data?.ready || (lines.length && !data.canExtendTaskFunding))
          throw new PublicMessageError("Task allocation is unavailable.");
        if (new Set(rows.map((r) => r.sourceId)).size !== rows.length)
          throw new PublicMessageError("Choose each account only once.");
        const years = new Set<number>();
        const allocations = rows.map((r) => {
          const source = sources.find((s) => s.id === r.sourceId),
            amount = amountValue(r.amount);
          if (!source || !amount || !Number.isFinite(amount))
            throw new PublicMessageError("Choose an account and enter a positive amount.");
          if (amount > source.available)
            throw new PublicMessageError(
              source.name +
                " has only " +
                peso(source.available) +
                " available.",
            );
          years.add(source.fiscal_year);
          return { sourceId: r.sourceId, amount };
        });
        if (years.size !== 1)
          throw new PublicMessageError("Choose accounts from the same fiscal year.");
        attempt.current = {
          name: "allocate_project_task_funding",
          args: {
            p_task: taskId,
            p_lines: allocations,
            p_reason: reason.trim(),
            p_key: key,
          },
        };
      }
    }
    try {
      await command(attempt.current.name, attempt.current.args);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (
        !retry &&
        code &&
        /^[0-9A-Z]{5}$/.test(code) &&
        !code.startsWith("08") &&
        code !== "57014"
      )
        attempt.current = null;
      setRetry(!!attempt.current);
      throw error;
    }
    const wasReturning = attempt.current?.name === "release_project_task_funding";
    attempt.current = null;
    setRetry(false);
    setRows([blank()]);
    setReason("");
    setReturning(undefined);
    toast(
      wasReturning ? "Task funding returned." : "Task budget saved.",
      "success",
    );
    await facts.refresh();
    await onSaved().catch(() => {});
  }
  return (
    <Card
      title="Project budget accounts"
      icon={<Wallet size={16} color={palette.primary} />}
      badge={
        data
          ? `${lines.length} ${lines.length === 1 ? "line" : "lines"}`
          : undefined
      }
      style={{ gap: 12 }}
    >
      {facts.loading && !data && <Loading />}
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!data && (
        <>
          <MetricPair
            items={[
              {
                key: "left",
                label: "Project funds left",
                value: peso(data.unallocated),
                tone: data.unallocated > 0 ? "info" : "neutral",
                icon: <Wallet size={16} color={palette.blue} />,
              },
              {
                key: "allocated",
                label: "Already allocated",
                value: peso(existing),
                tone: existing > 0 ? "success" : "neutral",
                icon: <Check size={16} color={palette.success} />,
              },
            ]}
          />

          {lines.map((line) => (
            <View
              key={line.id}
              style={[
                styles.insetBox,
                {
                  backgroundColor: insetSurface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.insetHeader}>
                <Text style={[styles.insetTitle, { color: palette.text }]}>
                  {line.source}
                </Text>
                {!!line.fiscalYear && (
                  <View
                    style={[
                      styles.fyChip,
                      {
                        backgroundColor: palette.primarySoft,
                        borderColor: withOpacity(palette.primary, 0.24),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.fyChipText,
                        { color: palette.primaryDark },
                      ]}
                    >
                      FY {line.fiscalYear}
                    </Text>
                  </View>
                )}
              </View>
              <DetailGroup>
                <LabelValue label="Allocated" value={peso(line.amount)} />
                <LabelValue
                  label="Unused balance"
                  value={peso(line.available)}
                />
              </DetailGroup>
              {editable && line.available > 0 && !locked && (
                <Button
                  variant="outline"
                  icon={<RotateCcw size={15} color={palette.primary} />}
                  onPress={() => {
                    setReturning(line);
                    setReturnAmount(String(line.available));
                    setReason("");
                  }}
                >
                  {line.available === line.amount
                    ? "Cancel allocation"
                    : "Return unused funding"}
                </Button>
              )}
            </View>
          ))}

          {returning && (
            <View
              style={[
                styles.insetBox,
                {
                  backgroundColor: insetSurface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Notice tone="warning">
                Return unused funding to the project from {returning.source}.
              </Notice>
              <Field
                label="Amount to return"
                value={returnAmount}
                keyboardType="decimal-pad"
                editable={!locked}
                onChangeText={setReturnAmount}
              />
              {!locked && (
                <Button
                  variant="outline"
                  icon={<RotateCcw size={15} color={palette.primary} />}
                  onPress={() => {
                    setReturning(undefined);
                    setReason("");
                  }}
                >
                  Keep allocation
                </Button>
              )}
            </View>
          )}

          {!returning &&
            editable &&
            data.ready &&
            (!lines.length || data.canExtendTaskFunding) &&
            sources.length > 0 && (
              <>
                {rows.map((row, index) => (
                  <View
                    key={index}
                    style={[
                      styles.insetBox,
                      {
                        backgroundColor: insetSurface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.insetHeader}>
                      <Text
                        style={[styles.insetTitle, { color: palette.text }]}
                      >
                        Account {index + 1}
                      </Text>
                    </View>
                    <Choice
                      label="Funding account"
                      value={row.sourceId}
                      onChange={(v) => {
                        if (!locked) update(index, { sourceId: v });
                      }}
                      options={sources
                        .filter(
                          (s) =>
                            s.id === row.sourceId ||
                            !rows.some((r) => r.sourceId === s.id),
                        )
                        .map((s) => ({
                          value: s.id,
                          label:
                            "FY " +
                            s.fiscal_year +
                            " · " +
                            s.name +
                            " · " +
                            peso(s.available) +
                            " left",
                        }))}
                    />
                    <Field
                      label="Amount"
                      value={row.amount}
                      editable={!locked}
                      keyboardType="decimal-pad"
                      onChangeText={(v) => update(index, { amount: v })}
                    />
                    {!locked && rows.length > 1 && (
                      <Button
                        variant="ghost"
                        icon={<X size={15} color={palette.primary} />}
                        onPress={() =>
                          setRows((old) => old.filter((_, i) => i !== index))
                        }
                      >
                        Remove account
                      </Button>
                    )}
                  </View>
                ))}
                {!locked && rows.length < sources.length && (
                  <Button
                    variant="outline"
                    icon={<Plus size={15} color={palette.primary} />}
                    onPress={() => setRows((old) => [...old, blank()])}
                  >
                    Add another account
                  </Button>
                )}
                <DetailGroup>
                  <LabelValue label="Adding now" value={peso(adding)} />
                  <LabelValue
                    label="New task total"
                    value={peso(total([existing, adding]))}
                  />
                </DetailGroup>
              </>
            )}
          {!returning && !sources.length && (
            <Notice>No other project-funded accounts are available.</Notice>
          )}
          {(retry ||
            returning ||
            (editable &&
              data.ready &&
              (!lines.length || data.canExtendTaskFunding) &&
              sources.length > 0)) && (
            <>
              <Field
                label="Reason"
                value={reason}
                editable={!locked}
                onChangeText={setReason}
              />
              <Button
                busy={action.busy}
                icon={
                  returning ? (
                    <RotateCcw size={15} color={palette.onPrimary} />
                  ) : (
                    <Check size={15} color={palette.onPrimary} />
                  )
                }
                onPress={() => void action.run(save, "Task budget saved.")}
              >
                {retry
                  ? "Verify saved funding"
                  : returning
                    ? "Confirm return"
                    : "Save task allocation"}
              </Button>
            </>
          )}
          {!!action.notice && <Notice>{action.notice}</Notice>}
          {!!action.error && (
            <ErrorState context="action" error={action.error} />
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  insetBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  insetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  insetTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  fyChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  fyChipText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
});
