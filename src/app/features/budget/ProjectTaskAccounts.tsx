import { useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
  const update = (index: number, value: Partial<Entry>) =>
    setRows((old) =>
      old.map((row, i) => (i === index ? { ...row, ...value } : row)),
    );
  async function save() {
    if (!attempt.current) {
      if (!editable || !reason.trim())
        throw new Error("Enter a reason before saving.");
      const key = crypto.randomUUID();
      if (returning) {
        const amount = amountValue(returnAmount);
        if (amount <= 0 || amount > returning.available)
          throw new Error("Enter an amount within the unused balance.");
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
          throw new Error("Task allocation is unavailable.");
        if (new Set(rows.map((r) => r.sourceId)).size !== rows.length)
          throw new Error("Choose each account only once.");
        const years = new Set<number>();
        const allocations = rows.map((r) => {
          const source = sources.find((s) => s.id === r.sourceId),
            amount = amountValue(r.amount);
          if (!source || !amount || !Number.isFinite(amount))
            throw new Error("Choose an account and enter a positive amount.");
          if (amount > source.available)
            throw new Error(
              source.name +
                " has only " +
                peso(source.available) +
                " available.",
            );
          years.add(source.fiscal_year);
          return { sourceId: r.sourceId, amount };
        });
        if (years.size !== 1)
          throw new Error("Choose accounts from the same fiscal year.");
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
    attempt.current = null;
    setRetry(false);
    setRows([blank()]);
    setReason("");
    setReturning(undefined);
    await facts.refresh();
    await onSaved().catch(() => {});
  }
  return (
    <Card title="Project budget accounts">
      {facts.loading && !data && <Loading />}
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!data && (
        <>
          <LabelValue
            label="Project funds left"
            value={peso(data.unallocated)}
          />
          <LabelValue label="Already allocated" value={peso(existing)} />
          {lines.map((line) => (
            <Card key={line.id} title={line.source}>
              <LabelValue label="Allocated" value={peso(line.amount)} />
              <LabelValue label="Unused balance" value={peso(line.available)} />
              {editable && line.available > 0 && !locked && (
                <Button
                  variant="outline"
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
            </Card>
          ))}
          {returning && (
            <>
              <Notice>
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
                  onPress={() => {
                    setReturning(undefined);
                    setReason("");
                  }}
                >
                  Keep allocation
                </Button>
              )}
            </>
          )}
          {!returning &&
            editable &&
            data.ready &&
            (!lines.length || data.canExtendTaskFunding) &&
            sources.length > 0 && (
              <>
                {rows.map((row, index) => (
                  <Card key={index} title={"Account " + (index + 1)}>
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
                        onPress={() =>
                          setRows((old) => old.filter((_, i) => i !== index))
                        }
                      >
                        Remove account
                      </Button>
                    )}
                  </Card>
                ))}
                {!locked && rows.length < sources.length && (
                  <Button
                    variant="outline"
                    onPress={() => setRows((old) => [...old, blank()])}
                  >
                    Add another account
                  </Button>
                )}
                <LabelValue label="Adding now" value={peso(adding)} />
                <LabelValue
                  label="New task total"
                  value={peso(total([existing, adding]))}
                />
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
          {!!action.error && <ErrorState error={action.error} />}
        </>
      )}
    </Card>
  );
}
