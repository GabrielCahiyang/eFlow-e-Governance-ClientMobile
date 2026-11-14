import { useEffect, useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import { draftStore } from "../../../platform/draftStore";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { netProjectUpdates } from "./subscriptions";
import { useOfficeFinanceUpdates } from "../budget";

type Source = { id: string; name: string; available: number };
type TaskLine = { id: string; task: string; source: string; available: number };
type Funding = {
  project: { id: string; org_id: string; status: string };
  canAuthorize: boolean;
  canAllocate: boolean;
  funds: Source[];
  taskFunding: TaskLine[];
};
type ReturnKind = "project" | "task";
type Selection = { kind: ReturnKind; id: string; name: string; amount: number };
type Attempt = {
  project: string;
  selection: Selection;
  reason: string;
  key: string;
};

async function loadFunding(project: string): Promise<Funding> {
  const { data, error } = await supabase.rpc("project_flow_snapshot", {
    p_project: project,
  });
  if (error) throw error;
  if (
    data?.project?.id !== project ||
    !Array.isArray(data.funds) ||
    !Array.isArray(data.taskFunding)
  )
    throw new Error("Could not verify current project funding.");
  return data;
}

export function ProjectFundingCloseout({
  actor,
  project,
  office,
  onChanged,
}: {
  actor: string;
  project: string;
  office: string;
  onChanged: () => Promise<unknown>;
}) {
  const scope = "project-funding-return:" + project;
  const facts = useFacts(scope + ":" + actor, () => loadFunding(project));
  const draft = useFacts(scope + ":retry:" + actor, () =>
    draftStore.get<Attempt>(actor, scope),
  );
  const [selection, setSelection] = useState<Selection>();
  const [reason, setReason] = useState("");
  const [retry, setRetry] = useState<Attempt>();
  const action = useAction();
  useEffect(
    () => netProjectUpdates(project, () => void facts.refresh()),
    [project, facts.refresh],
  );
  useOfficeFinanceUpdates(office, undefined, true, facts.refresh);

  const pending = retry || draft.data;
  const selected = pending?.selection || selection;
  const save = () =>
    action.run(async () => {
      if (!selected || draft.error || draft.loading) return;
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || session.session?.user.id !== actor)
        throw new PublicMessageError(
          "Sign in with the same account to continue.",
        );
      const current = await loadFunding(project);
      const authorized =
        selected.kind === "project"
          ? current.canAuthorize
          : current.canAllocate;
      if (!authorized || current.project.org_id !== office)
        throw new PublicMessageError(
          "Your current project access does not allow this return.",
        );
      let attempt = pending;
      if (attempt && attempt.project !== project)
        throw new PublicMessageError(
          "The saved return belongs to a different project.",
        );
      if (!attempt) {
        const source = (
          selected.kind === "project" ? current.funds : current.taskFunding
        ).find((row) => row.id === selected.id);
        if (
          !source ||
          source.available < selected.amount ||
          selected.amount <= 0 ||
          ["completed", "archived"].includes(current.project.status)
        )
          throw new PublicMessageError(
            "The available amount changed. Reopen this return and check the balance.",
          );
        attempt = {
          project,
          selection: selected,
          reason: reason.trim(),
          key: crypto.randomUUID(),
        };
        if (!attempt.reason)
          throw new PublicMessageError(
            "Enter a reason for returning this money.",
          );
        await draftStore.set(actor, scope, attempt);
        setRetry(attempt);
      }
      const { selection: line, key, reason: note } = attempt;
      const terms = { p_amount: line.amount, p_reason: note, p_key: key };
      const response =
        line.kind === "project"
          ? await supabase.rpc("release_project_funding", {
              p_project: project,
              p_source: line.id,
              ...terms,
            })
          : await supabase.rpc("release_project_task_funding", {
              p_line: line.id,
              ...terms,
            });
      if (response.error) {
        if (
          !pending &&
          /^(22|23|40|42)[A-Z0-9]{3}$/.test(response.error.code || "")
        ) {
          await draftStore.remove(actor, scope);
          setRetry(undefined);
        }
        throw response.error;
      }
      await draftStore.remove(actor, scope);
      setRetry(undefined);
      setSelection(undefined);
      setReason("");
      nativeWindow.dispatchEvent({
        type: "eflow:finance-updated",
        detail: { orgId: office },
      });
      await Promise.all([facts.refresh(), draft.refresh(), onChanged()]).catch(
        () => {},
      );
    }, "Unused funding returned.");

  const data = facts.error ? undefined : facts.data;
  const open = (next: Selection) => {
    action.clear();
    setReason("");
    setSelection(next);
  };
  return (
    <Card title="Return unused funding">
      <Notice>
        Return unused task allocations to the project, then return the remaining
        project funds to Office Budget.
      </Notice>
      {!!draft.error && (
        <ErrorState error={draft.error} retry={() => void draft.refresh()} />
      )}
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !data ? (
        <Loading label="Checking returnable funds" layout="summary" />
      ) : (
        <>
          {data.canAllocate &&
            data.taskFunding
              .filter((row) => row.available > 0)
              .map((row) => (
                <Row key={row.id}>
                  <LabelValue
                    label={row.task + " · " + row.source}
                    value={peso(row.available)}
                  />
                  <Button
                    variant="outline"
                    disabled={
                      !!pending ||
                      draft.loading ||
                      !!draft.error ||
                      facts.loading
                    }
                    onPress={() =>
                      open({
                        kind: "task",
                        id: row.id,
                        name: row.task,
                        amount: row.available,
                      })
                    }
                  >
                    Return to project
                  </Button>
                </Row>
              ))}
          {data.canAuthorize &&
            data.funds
              .filter((row) => row.available > 0)
              .map((row) => (
                <Row key={row.id}>
                  <LabelValue label={row.name} value={peso(row.available)} />
                  <Button
                    variant="outline"
                    disabled={
                      !!pending ||
                      draft.loading ||
                      !!draft.error ||
                      facts.loading
                    }
                    onPress={() =>
                      open({
                        kind: "project",
                        id: row.id,
                        name: row.name,
                        amount: row.available,
                      })
                    }
                  >
                    Return to Office Budget
                  </Button>
                </Row>
              ))}
          {!data.taskFunding.some((row) => row.available > 0) &&
            !data.funds.some((row) => row.available > 0) && (
              <Notice>
                No unused task or project funding is available to return.
              </Notice>
            )}
        </>
      )}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      {!!selected && (
        <Sheet
          actionError={action.error}
          open
          title="Confirm funding return"
          busy={action.busy}
          onClose={() => {
            if (!pending && !action.busy) setSelection(undefined);
          }}
          footer={
            <Button
              busy={action.busy}
              disabled={
                draft.loading || !!draft.error || (!pending && !reason.trim())
              }
              onPress={() => void save()}
            >
              Confirm return
            </Button>
          }
        >
          <LabelValue label={selected.name} value={peso(selected.amount)} />
          <Notice>
            {selected.kind === "task"
              ? "This money returns to the project budget."
              : "This money returns to Office Budget."}
          </Notice>
          <Field
            label="Reason"
            value={pending?.reason ?? reason}
            editable={!pending && !action.busy}
            onChangeText={setReason}
            maxLength={3000}
            multiline
          />
        </Sheet>
      )}
    </Card>
  );
}
