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
  Sheet,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { supabase } from "../../../platform/supabase";

type Source = { id: string; name: string; available: number };
type Snapshot = {
  canAuthorize: boolean;
  canAllocate: boolean;
  total: number;
  allocated: number;
  unallocated: number;
  released: number;
  spent: number;
  returned?: number;
  outstanding?: number;
  funds: Source[];
  sources: Source[];
  fundingRequests: {
    id: string;
    reason: string;
    lines: { amount: number }[];
  }[];
};
type Decision = {
  kind: "release" | "request" | "approve" | "decline";
  id?: string;
  label: string;
  maximum?: number;
};
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}
export function ProjectFundingCloseout({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const { profile } = useAuth();
  const facts = useFacts(
    "project-funding-closeout:" + profile?.id + ":" + projectId,
    () => rpc<Snapshot>("project_flow_snapshot", { p_project: projectId }),
    !!profile,
  );
  const [edit, setEdit] = useState<Decision>(),
    [reason, setReason] = useState(""),
    [source, setSource] = useState(""),
    [amount, setAmount] = useState(""),
    [retry, setRetry] = useState(false);
  const pending = useRef<{
    name: string;
    args: Record<string, unknown>;
  } | null>(null);
  const action = useAction();
  const data = facts.data;
  const start = (decision: Decision) => {
    action.clear();
    setEdit(decision);
    setReason("");
    setSource("");
    setAmount(decision.maximum?.toString() || "");
  };
  const save = () =>
    action.run(async () => {
      if (!data || !edit) return;
      if (!pending.current) {
        if (!reason.trim()) throw new Error("Enter a reason.");
        const value = Number(amount),
          key = crypto.randomUUID();
        if (edit.kind === "release" || edit.kind === "request") {
          const limit =
            edit.kind === "release"
              ? edit.maximum
              : data.sources.find((s) => s.id === source)?.available;
          if (
            !limit ||
            !/^\d+(\.\d{1,2})?$/.test(amount) ||
            !Number.isFinite(value) ||
            value <= 0 ||
            value > limit
          )
            throw new Error(
              "Choose an available account and enter an amount within its balance.",
            );
        }
        pending.current =
          edit.kind === "release"
            ? {
                name: "release_project_funding",
                args: {
                  p_project: projectId,
                  p_source: edit.id,
                  p_amount: value,
                  p_reason: reason.trim(),
                  p_key: key,
                },
              }
            : edit.kind === "request"
              ? {
                  name: data.canAuthorize
                    ? "authorize_project_funding"
                    : "request_project_funding",
                  args: {
                    p_project: projectId,
                    p_lines: [{ partitionId: source, amount: value }],
                    p_reason: reason.trim(),
                    p_key: key,
                  },
                }
              : {
                  name: "decide_project_funding",
                  args: {
                    p_request: edit.id,
                    p_approve: edit.kind === "approve",
                    p_reason: reason.trim(),
                  },
                };
      }
      try {
        await rpc(pending.current.name, pending.current.args);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (
          !retry &&
          code &&
          /^[A-Z0-9]{5}$/.test(code) &&
          !code.startsWith("08") &&
          code !== "57014"
        )
          pending.current = null;
        setRetry(!!pending.current);
        throw error;
      }
      pending.current = null;
      setRetry(false);
      setEdit(undefined);
      await facts.refresh();
    }, "Project funding updated.");
  return (
    <Card title="Project funding">
      {facts.loading && !data && <Loading />}
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      {data && (
        <>
          {Object.entries({
            Authorized: data.total,
            Allocated: data.allocated,
            Unallocated: data.unallocated,
            "Cash released": data.released,
            "Actual spent": data.spent,
            "Cash returned": data.returned,
            "Outstanding advances": data.outstanding,
          }).map(
            ([label, value]) =>
              value !== undefined && (
                <LabelValue key={label} label={label} value={peso(value)} />
              ),
          )}
          {data.funds.map((s) => (
            <Card key={s.id} title={s.name}>
              <LabelValue label="Unallocated" value={peso(s.available)} />
              {data.canAuthorize && s.available > 0 && (
                <Button
                  variant="outline"
                  onPress={() =>
                    start({
                      kind: "release",
                      id: s.id,
                      label: "Release unused funding",
                      maximum: s.available,
                    })
                  }
                >
                  Release unused to Office Budget
                </Button>
              )}
            </Card>
          ))}
          {!readOnly &&
            (data.canAllocate || data.canAuthorize) &&
            data.sources.some((s) => s.available > 0) && (
              <Button
                variant="outline"
                onPress={() =>
                  start({
                    kind: "request",
                    label: data.canAuthorize
                      ? "Authorize additional funding"
                      : "Request additional funding",
                  })
                }
              >
                {data.canAuthorize
                  ? "Authorize additional funding"
                  : "Request additional funding"}
              </Button>
            )}
          {(data.fundingRequests || []).map((r) => (
            <Card key={r.id} title="Pending funding request">
              <Notice>{r.reason}</Notice>
              <LabelValue
                label="Requested"
                value={peso(
                  r.lines.reduce((sum, l) => sum + Number(l.amount || 0), 0),
                )}
              />
              {!readOnly && data.canAuthorize && (
                <>
                  <Button
                    onPress={() =>
                      start({
                        kind: "approve",
                        id: r.id,
                        label: "Authorize funding request",
                      })
                    }
                  >
                    Authorize
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() =>
                      start({
                        kind: "decline",
                        id: r.id,
                        label: "Decline funding request",
                      })
                    }
                  >
                    Decline
                  </Button>
                </>
              )}
            </Card>
          ))}
        </>
      )}
      {edit && (
        <Sheet
          open
          title={edit.label}
          busy={action.busy}
          onClose={() => {
            if (!retry && !action.busy) setEdit(undefined);
          }}
        >
          {edit.kind === "release" && (
            <Notice>
              Unused project money returns to Office Budget. Existing
              commitments remain protected.
            </Notice>
          )}
          {edit.kind === "request" && (
            <Choice
              label="Office Budget account"
              value={source}
              onChange={(v) => {
                if (!retry) setSource(v);
              }}
              options={(data?.sources || [])
                .filter((s) => s.available > 0)
                .map((s) => ({
                  value: s.id,
                  label: s.name + " · " + peso(s.available),
                }))}
            />
          )}
          {["release", "request"].includes(edit.kind) && (
            <Field
              label="Amount"
              value={amount}
              editable={!retry && !action.busy}
              keyboardType="decimal-pad"
              onChangeText={setAmount}
            />
          )}
          <Field
            label="Reason"
            value={reason}
            editable={!retry && !action.busy}
            onChangeText={setReason}
          />
          {!!action.error && <ErrorState context="action" error={action.error} />}
          <Button busy={action.busy} onPress={() => void save()}>
            {retry ? "Verify saved decision" : "Confirm"}
          </Button>
        </Sheet>
      )}
    </Card>
  );
}
