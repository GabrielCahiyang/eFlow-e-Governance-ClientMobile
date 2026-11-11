import { useCallback, useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
} from "../../components/ui";
import { recordedPeso } from "../../components/ui/theme";
import { useFacts } from "../../shared/useFacts";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { useAuth } from "../authentication";
import { useBudget } from "./useBudget";
import { CashRequestSheet } from "./CashRequestSheet";
import { fetchTaskFundingContext } from "../../../core/web/app/features/budget/services/budgetService";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { PettyCashRequest } from "../../../core/web/app/features/budget/types";
import { CashRequestCard } from "./CashRequestCard";
import { linkedFundingSubitem, taskCashRequests } from "./mobileFinanceScope";
import { readFocusedSubtaskFunding } from "./focusedSubtaskFunding";
import { useCashRequestUpdates } from "./useCashRequestUpdates";

export function TaskFundingCard({
  task,
  subtaskId,
  recordId,
  canManage,
  readOnly,
  onManageFunding,
  onOpenLinkedSubitem,
}: {
  task: Pick<Task, "id" | "orgId">;
  subtaskId?: string;
  recordId?: string;
  canManage: boolean;
  readOnly: boolean;
  onManageFunding?: () => void;
  onOpenLinkedSubitem?: (id: string) => void;
}) {
  const { profile } = useAuth();
  const [request, setRequest] = useState(false);
  const [correction, setCorrection] = useState<PettyCashRequest>();
  const funding = useFacts(
    `funding:${profile?.id}:${task.id}:${subtaskId}`,
    async () => {
      const context = await fetchTaskFundingContext(task.id, subtaskId);
      if (
        context.taskId !== task.id ||
        (subtaskId && context.subtaskId !== subtaskId)
      )
        throw new Error("Could not verify the funding record for this work.");
      return context;
    },
  );
  const context = funding.error ? undefined : funding.data;
  const officeBudget = useBudget(
    !subtaskId && context
      ? context.fundingOrgId || task.orgId || profile?.org_id || ""
      : "",
    context?.fiscalYear || getCurrentFiscalYear(),
  );
  const subtaskBudget = useFacts(
    JSON.stringify([
      "subtask-funding-records",
      profile?.id,
      task.id,
      subtaskId,
      context?.fundingOrgId,
      context?.fiscalYear,
    ]),
    () => readFocusedSubtaskFunding(context!, subtaskId!),
    !!context && !!subtaskId,
  );
  const budget = subtaskId ? subtaskBudget : officeBudget;
  const requests = budget.data
    ? taskCashRequests(budget.data, task.id, subtaskId, recordId)
    : [];
  const linkedSubitem =
    !subtaskId &&
    recordId &&
    budget.data &&
    !budget.loading &&
    !budget.error &&
    !requests.length
      ? linkedFundingSubitem(budget.data, task.id, recordId)
      : undefined;
  const refresh = useCallback(async () => {
    await Promise.all([funding.refresh(), budget.refresh()]);
  }, [funding.refresh, budget.refresh]);
  useCashRequestUpdates(
    task.id,
    !!subtaskId && !!context && !readOnly,
    refresh,
    subtaskId,
  );
  const locked =
    readOnly ||
    funding.loading ||
    !!funding.error ||
    budget.loading ||
    !!budget.error ||
    !budget.data;

  return (
    <>
      <Card title={subtaskId ? "Subtask funding" : "Task funding"}>
        {!!funding.error && (
          <ErrorState
            error={funding.error}
            retry={() => void funding.refresh()}
          />
        )}
        {funding.loading && !context && (
          <Loading label="Loading funding" layout="summary" rows={2} />
        )}
        {context && !funding.error && (
          <>
            {context.fiscalYear != null && (
              <LabelValue
                label="Fiscal year"
                value={String(context.fiscalYear)}
              />
            )}
            {context.funded && (
              <LabelValue
                label={
                  subtaskId ? "Authorized task budget" : "Authorized budget"
                }
                value={recordedPeso(context.taskBudget)}
              />
            )}
            {context.funded && (
              <LabelValue
                label={
                  subtaskId && !context.cap
                    ? "Task funds available to request"
                    : "Available to request"
                }
                value={recordedPeso(context.available)}
              />
            )}
            {!!context.cap && (
              <LabelValue
                label="Subtask funding cap"
                value={recordedPeso(context.cap.amount)}
              />
            )}
            {!context.funded && (
              <Notice>This work has no authorized funding yet.</Notice>
            )}
            {!recordId &&
              !locked &&
              context.funded &&
              context.available > 0 &&
              (profile?.id === context.taskLeaderId || canManage) && (
                <Button
                  onPress={() => {
                    setCorrection(undefined);
                    setRequest(true);
                  }}
                >
                  Request task cash
                </Button>
              )}
          </>
        )}
        {!recordId && onManageFunding && (
          <Button variant="outline" onPress={onManageFunding}>
            Funding setup on eFlow Web
          </Button>
        )}
      </Card>
      {!!budget.error && (
        <ErrorState error={budget.error} retry={() => void budget.refresh()} />
      )}
      {budget.loading && !budget.data && (
        <Loading label="Loading cash requests" layout="request" />
      )}
      {budget.data &&
        !budget.error &&
        !requests.length &&
        (linkedSubitem && onOpenLinkedSubitem ? (
          <Empty
            kind="finance"
            compact
            title="This record belongs to a subtask"
            action={
              <Button
                variant="outline"
                onPress={() => onOpenLinkedSubitem(linkedSubitem)}
              >
                Open linked subtask funding
              </Button>
            }
          />
        ) : (
          <Empty
            kind="finance"
            title={
              recordId
                ? "This funding record is unavailable here"
                : "No cash requests for this work"
            }
          />
        ))}
      {budget.data &&
        !budget.error &&
        !funding.error &&
        requests.map((item) => (
          <CashRequestCard
            key={item.id}
            request={item}
            bundle={budget.data!}
            onSaved={refresh}
            readOnly={locked}
            onCorrect={() => {
              setCorrection(item);
              setRequest(true);
            }}
          />
        ))}
      {request && context && (
        <CashRequestSheet
          context={context}
          orgId={context.fundingOrgId || task.orgId || ""}
          correction={correction}
          readOnly={locked}
          onClose={() => setRequest(false)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
