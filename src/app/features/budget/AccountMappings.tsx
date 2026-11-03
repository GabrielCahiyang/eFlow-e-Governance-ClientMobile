import {
  Button,
  Card,
  Choice,
  ErrorState,
  Loading,
  Notice,
} from "../../components/ui";
import { useState } from "react";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { fetchAccountingAccounts } from "../../../core/web/app/features/budget/services/budgetService";
import { mapOfficeBudgetAccount } from "../../../core/web/app/features/budget/services/pettyCashVoucherService";
import { sectionLeaves } from "../../../core/web/app/features/budget/selectors/budgetSections";
import type { DepartmentBudgetBundle } from "../../../core/web/app/features/budget/types";
import { useFinancialCommand } from "./useFinancialCommand";
export function AccountMappings({
  data,
  onSaved,
}: {
  data: DepartmentBudgetBundle;
  onSaved: () => Promise<void>;
}) {
  const { profile, can } = useAuth(),
    accounts = useFacts("expense-account-catalog", fetchAccountingAccounts),
    [changes, setChanges] = useState<Record<string, string>>({}),
    command = useFinancialCommand(profile?.id || "", "account-mapping");
  return (
    <Card title="Expense-account mapping">
      <Notice>
        Each budget source must map to an active journal expense account. An
        unmapped source blocks settlement.
      </Notice>
      {accounts.error ? (
        <ErrorState error={accounts.error} />
      ) : !accounts.data ? (
        <Loading />
      ) : (
        sectionLeaves(data.sections || []).map((section) => (
          <Card key={section.id} title={section.name}>
            <Choice
              label="Journal expense account"
              disabled={
                !can("accounting.post_journal") ||
                command.busy ||
                data.summary?.status === "closed"
              }
              value={changes[section.id] ?? section.journalAccountCode ?? ""}
              options={accounts
                .data!.filter((a) => a.classification === "expense")
                .map((a) => ({
                  value: a.code,
                  label: `${a.code} · ${a.title}`,
                }))}
              onChange={(code: string) =>
                setChanges((old) => ({ ...old, [section.id]: code }))
              }
            />
            {!!(!!changes[section.id] && can("accounting.post_journal")) && (
              <Button
                busy={command.busy}
                onPress={() =>
                  void command.run(
                    `${section.id}:${changes[section.id]}:${data.sectionsVersion}`,
                    () =>
                      mapOfficeBudgetAccount(section.id, changes[section.id]),
                    async () => {
                      await onSaved();
                      setChanges((old) => {
                        const next = { ...old };
                        delete next[section.id];
                        return next;
                      });
                    },
                  )
                }
              >
                Save mapping
              </Button>
            )}
          </Card>
        ))
      )}
      {!!command.error && <ErrorState error={command.error} />}
    </Card>
  );
}
