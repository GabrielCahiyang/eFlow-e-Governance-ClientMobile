import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  peso,
  colors,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useFinancialAction } from "./useFinancialCommand";
import { draftStore } from "../../../platform/draftStore";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { OfficePettyCash } from "../office-petty-cash";
import { useAuth } from "../authentication";
import { useBudget } from "./useBudget";
import { ProjectTaskAccounts } from "./ProjectTaskAccounts";
import { DirectFundingSheet } from "./DirectFundingSheet";
import { CashRequestSheet } from "./CashRequestSheet";
import {
  fetchTaskFundingContext,
  setSubtaskBudgetCap,
  removeSubtaskBudgetCap,
} from "../../../core/web/app/features/budget/services/budgetService";
import { isOpenDirectFundingWork } from "../../../core/web/app/features/budget/selectors/directFundingEligibility";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { PettyCashRequest } from "../../../core/web/app/features/budget/types";
import { CashRequestCard } from "./CashRequestCard";
export function TaskFundingCard({
  task,
  subtaskId,
  canAuthorize,
  canManage,
  readOnly,
}: {
  task: Task;
  subtaskId?: string;
  canAuthorize: boolean;
  canManage: boolean;
  readOnly: boolean;
}) {
  const { profile } = useAuth();
  const [officeCash, setOfficeCash] = useState(false);
  const [year, setYear] = useState(getCurrentFiscalYear),
    [fund, setFund] = useState(false),
    [request, setRequest] = useState(false),
    [correction, setCorrection] = useState<PettyCashRequest>(),
    [capOpen, setCapOpen] = useState(false),
    [capAmount, setCapAmount] = useState(""),
    [capLine, setCapLine] = useState(""),
    [capReason, setCapReason] = useState("");
  const funding = useFacts(
    `funding:${profile?.id}:${task.id}:${subtaskId}`,
    () => fetchTaskFundingContext(task.id, subtaskId),
  );
  const budget = useBudget(
    funding.data?.fundingOrgId || task.orgId || profile?.org_id || "",
    funding.data?.fiscalYear || year,
  );
  const action = useFinancialAction(
    profile?.id || "",
    `cap:${task.id}:${subtaskId}:${JSON.stringify(funding.data?.cap || null)}`,
    JSON.stringify([funding.data?.cap, capLine, capAmount, capReason]),
  );
  const commandKey = async (mode: string) => {
    if (!profile) throw new Error("Current work access is required.");
    const scope = `cap-command:${task.id}:${subtaskId}:${mode}`;
    const fingerprint = JSON.stringify([
      funding.data?.cap,
      capLine,
      capAmount,
      capReason,
    ]);
    const old = await draftStore.get<{ key: string; fingerprint: string }>(
      profile.id,
      scope,
    );
    if (old && old.fingerprint === fingerprint) return old.key;
    const key = crypto.randomUUID();
    await draftStore.set(profile.id, scope, { key, fingerprint });
    return key;
  };
  const context = funding.data,
    requests =
      budget.data?.requests.filter(
        (r) =>
          r.taskId === task.id &&
          (subtaskId ? r.subtaskId === subtaskId : !r.subtaskId),
      ) || [];
  const refresh = async () => {
    await Promise.all([funding.refresh(), budget.refresh()]);
  };
  return (
    <>
      {!!profile?.org_id && (
        <>
          <Button variant="outline" onPress={() => setOfficeCash(true)}>
            Office petty cash · separate fund
          </Button>
          {officeCash && (
            <Sheet
              open
              title="Office petty cash"
              onClose={() => setOfficeCash(false)}
            >
              <OfficePettyCash
                key={profile.id + ":" + profile.org_id}
                office={profile.org_id}
              />
            </Sheet>
          )}
        </>
      )}
      {!!task.linkedProjectId && !subtaskId && (
        <ProjectTaskAccounts
          key={profile?.id + ":" + task.id}
          projectId={task.linkedProjectId}
          taskId={task.id}
          readOnly={readOnly}
          onSaved={refresh}
        />
      )}
      <Card title="Task Budget">
        {funding.error ? (
          <ErrorState
            error={funding.error}
            retry={() => void funding.refresh()}
          />
        ) : funding.loading && !context ? (
          <Loading />
        ) : (
          context && (
            <>
              <LabelValue
                label="Authorized budget"
                value={peso(context.taskBudget)}
              />
              <LabelValue
                label="Cash released"
                value={peso(
                  requests.reduce((s, r) => s + (r.releasedAmount || 0), 0),
                )}
              />
              <LabelValue
                label="Actual spent"
                value={peso(
                  requests
                    .filter((r) => r.status === "settled")
                    .reduce((s, r) => s + (r.actualSpent || 0), 0),
                )}
              />
              <LabelValue
                label="Available to request"
                value={peso(context.available)}
              />
              {!!context.cap && (
                <LabelValue
                  label="Subtask funding cap"
                  value={peso(context.cap.amount)}
                />
              )}
              <Notice>
                {task.linkedProjectId
                  ? "Task allocations use authorized project funding."
                  : "Task Budget reserves Office authority."}{" "}
                Cash release and verified spending are recorded separately.
              </Notice>
              {!context.funded && (
                <Notice>This work has no authorized funding yet.</Notice>
              )}
              {!!(
                !readOnly &&
                canAuthorize &&
                !subtaskId &&
                !task.linkedProjectId &&
                isOpenDirectFundingWork(task) &&
                !context.funded &&
                budget.data?.summary?.status === "locked"
              ) && (
                <Button onPress={() => setFund(true)}>
                  Authorize task Budget
                </Button>
              )}
              {!!(
                !readOnly &&
                context.funded &&
                context.available > 0 &&
                (profile?.id === context.taskLeaderId || canManage)
              ) && (
                <Button
                  onPress={() => {
                    setCorrection(undefined);
                    setRequest(true);
                  }}
                >
                  Request task cash
                </Button>
              )}
              {!!(!readOnly && canManage && subtaskId && context.funded) && (
                <Button variant="outline" onPress={() => setCapOpen(true)}>
                  {context.cap ? "Edit funding cap" : "Set subtask funding cap"}
                </Button>
              )}
              <Button variant="ghost" onPress={() => void refresh()}>
                Refresh funding
              </Button>
            </>
          )
        )}
        {!!budget.error && (
          <ErrorState
            error={budget.error}
            retry={() => void budget.refresh()}
          />
        )}
      </Card>
      {!!budget.data &&
        requests.map((r) => (
          <CashRequestCard
            key={r.id}
            request={r}
            bundle={budget.data!}
            onSaved={refresh}
            readOnly={readOnly}
            onCorrect={
              !readOnly
                ? () => {
                    setCorrection(r);
                    setRequest(true);
                  }
                : undefined
            }
          />
        ))}
      {!!(fund && budget.data) && (
        <DirectFundingSheet
          task={task}
          budget={budget.data}
          onClose={() => setFund(false)}
          onSaved={refresh}
        />
      )}
      {!!(request && context) && (
        <CashRequestSheet
          context={context}
          orgId={funding.data?.fundingOrgId || task.orgId || ""}
          correction={correction}
          onClose={() => setRequest(false)}
          onSaved={refresh}
        />
      )}
      <Sheet
        open={capOpen}
        title="Subtask funding cap"
        onClose={() => setCapOpen(false)}
        busy={action.busy}
        footer={
          <Button
            busy={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (!subtaskId) throw new Error("Choose a subitem.");
                await setSubtaskBudgetCap({
                  taskId: task.id,
                  subtaskId,
                  allocationLineId:
                    capLine || context?.cap?.allocationLineId || "",
                  amount: Number(capAmount),
                  reason: capReason,
                  idempotencyKey: await commandKey("save"),
                });
                await refresh();
                setCapOpen(false);
              })
            }
          >
            Save funding cap
          </Button>
        }
      >
        <Choice
          label="Funding source"
          value={capLine || context?.cap?.allocationLineId || ""}
          onChange={setCapLine}
          options={(context?.lines || []).map((l) => ({
            value: l.id,
            label: l.particular,
            description: peso(l.available) + " available",
          }))}
        />
        <Field
          label="Cap amount"
          keyboardType="decimal-pad"
          value={capAmount}
          onChangeText={setCapAmount}
        />
        <Field
          label="Reason"
          value={capReason}
          onChangeText={setCapReason}
          multiline
        />
        {!!context?.cap && (
          <Button
            variant="danger"
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await removeSubtaskBudgetCap({
                  capId: context.cap!.id,
                  reason: capReason,
                  idempotencyKey: await commandKey("remove"),
                });
                await refresh();
                setCapOpen(false);
              })
            }
          >
            Remove funding cap
          </Button>
        )}
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
    </>
  );
}
