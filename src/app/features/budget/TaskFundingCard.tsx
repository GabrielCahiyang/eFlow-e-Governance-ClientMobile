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
import { PublicMessageError } from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import { useAuth } from "../authentication";
import { useBudget } from "./useBudget";
import { WorkAllocationCard } from "./WorkAllocationCard";
import { CashRequestSheet } from "./CashRequestSheet";
import { fetchTaskFundingContext } from "../../../core/web/app/features/budget/services/budgetService";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { PettyCashRequest } from "../../../core/web/app/features/budget/types";
import { CashRequestCard } from "./CashRequestCard";
import { linkedFundingSubitem, taskCashRequests } from "./mobileFinanceScope";
import { readFocusedSubtaskFunding } from "./focusedSubtaskFunding";
import { useCashRequestUpdates } from "./useCashRequestUpdates";
import { SubtaskBudgetDistribution } from "./SubtaskBudgetDistribution";
import { fetchWorkExpenseTotals } from "./workExpenseTotals";
import { taskTimeline } from "../tasks/taskDates";

export function TaskFundingCard({
  task,
  subtaskId,
  recordId,
  canManage,
  subtaskFinished = false,
  readOnly,
  onOpenLinkedSubitem,
}: {
  task: Pick<Task, "id" | "orgId"> &
    Partial<
      Pick<
        Task,
        "title" | "status" | "linkedProjectId" | "startDate" | "deadline" | "dueDate"
      >
    >;
  subtaskId?: string;
  recordId?: string;
  canManage: boolean;
  subtaskFinished?: boolean;
  readOnly: boolean;
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
        throw new PublicMessageError("Could not verify the funding record for this work.");
      return context;
    },
    !!profile?.id,
  );
  const context = funding.error ? undefined : funding.data;
  const expenses = useFacts(
    `work-expenses:${profile?.id}:${task.id}:${subtaskId ?? ""}`,
    async () => (await fetchWorkExpenseTotals([task.id])).get(task.id, subtaskId),
    !!profile?.id && !recordId,
  );
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
    await Promise.all([funding.refresh(), budget.refresh(), expenses.refresh()]);
  }, [funding.refresh, budget.refresh, expenses.refresh]);
  useCashRequestUpdates(
    task.id,
    !!profile,
    refresh,
    subtaskId,
    true,
  );
  const taskFinished =
    task.status === "completed" || task.status === "cancelled";
  const workFinished = taskFinished || subtaskFinished;
  const requiresSubtaskBudget = Boolean(
    subtaskId && context?.funded && context.distribution && !context.cap,
  );
  const locked =
    readOnly ||
    (funding.loading && !context) ||
    !!funding.error ||
    (budget.loading && !budget.data) ||
    !!budget.error ||
    !budget.data;

  return (
    <>
      <Card title={subtaskId ? "Subtask funding" : "Task funding"}>
        {!recordId && (
          <>
            {expenses.loading && !expenses.data ? (
              <Loading label="Loading expenses" layout="summary" rows={2} />
            ) : expenses.error || !expenses.data ? (
              <Notice>Actual expense totals are unavailable.</Notice>
            ) : (
              <>
                <Notice>
                  {expenses.data.complete ? "Work totals across fiscal years and funding sources." :
                    "Totals from the cash records you can access, across fiscal years and funding sources."}
                </Notice>
                <LabelValue label="Settled expenses" value={expenses.data.settled == null
                  ? "Unavailable" : recordedPeso(expenses.data.settled / 100)} />
                <LabelValue label="Pending liquidation" value={expenses.data.pending == null
                  ? "Unavailable" : recordedPeso(expenses.data.pending / 100)} />
              </>
            )}
            {!!expenses.error && (
              <Button variant="outline" onPress={() => void expenses.refresh()}>Retry expenses</Button>
            )}
          </>
        )}
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
            {context.funded && !context.distribution && (
              <LabelValue
                label={
                  subtaskId ? "Authorized task budget" : "Authorized budget"
                }
                value={recordedPeso(context.taskBudget)}
              />
            )}
            {context.funded && !context.distribution && (
              <LabelValue
                label={
                  subtaskId && !context.cap
                    ? "Task funds available to request"
                    : "Available to request"
                }
                value={recordedPeso(context.available)}
              />
            )}
            {!!context.cap && !context.distribution && (
              <LabelValue
                label="Subtask funding cap"
                value={recordedPeso(context.cap.amount)}
              />
            )}
            {!!context.distribution && (
              <SubtaskBudgetDistribution
                context={context}
                actor={profile?.id ?? ""}
                readOnly={readOnly || !!recordId}
                taskFinished={taskFinished}
                onSaved={refresh}
              />
            )}
            {!context.funded && (
              <Notice>This work has no authorized funding yet.</Notice>
            )}
            {!recordId && requiresSubtaskBudget && (
              <Notice>
                Ask the task lead to allocate a budget to this subtask before
                requesting cash.
              </Notice>
            )}
            {!recordId &&
              !locked &&
              !workFinished &&
              (!officeBudget.data?.summary?.status ||
                officeBudget.data.summary.status === "locked") &&
              context.funded &&
              !requiresSubtaskBudget &&
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
        {!recordId && !subtaskId && !!context && !funding.error && (
          <WorkAllocationCard
            key={task.id}
            task={task.id}
            projectId={task.linkedProjectId ?? undefined}
            taskFinished={taskFinished}
            taskSchedule={
              "startDate" in task ||
              "deadline" in task ||
              "dueDate" in task ||
              "title" in task
                ? taskTimeline(task)
                : undefined
            }
            readOnly={readOnly}
            onSaved={refresh}
          />
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
          taskSchedule={
            task.startDate || task.deadline || task.dueDate
              ? taskTimeline(task)
              : undefined
          }
          readOnly={locked}
          onClose={() => {
            setRequest(false);
            setCorrection(undefined);
          }}
          onSaved={refresh}
        />
      )}
    </>
  );
}
