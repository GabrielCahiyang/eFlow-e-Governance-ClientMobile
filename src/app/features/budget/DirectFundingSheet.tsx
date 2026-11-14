import { Text } from "../../components/ui/Typography";
import { useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  Field,
  LabelValue,
  Sheet,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import { draftStore } from "../../../platform/draftStore";
import {
  fundOfficeWork,
  type DirectFundingLine,
} from "../../../core/web/app/features/budget/services/directFundingService";
import {
  sectionLeaves,
  moneyCents,
} from "../../../core/web/app/features/budget/selectors/budgetSections";
import type { DepartmentBudgetBundle } from "../../../core/web/app/features/budget/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
export function DirectFundingSheet({
  task,
  budget,
  onClose,
  onSaved,
}: {
  task: Task;
  budget: DepartmentBudgetBundle;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const [lines, setLines] = useState<DirectFundingLine[]>([
      { partitionId: "", amount: 0, particular: "" },
    ]),
    [reason, setReason] = useState("");
  const key = useRef(crypto.randomUUID());
  const frozen = useRef<
    { lines: DirectFundingLine[]; reason: string; key: string } | undefined
  >(undefined);
  const leaves = sectionLeaves(budget.sections || []),
    total = lines.reduce((s, l) => s + moneyCents(l.amount || 0), 0) / 100;
  const save = () =>
    action.run(async () => {
      if (!profile || !budget.summary)
        throw new Error("Current Office Budget is required.");
      if (!frozen.current) {
        const recovered = await draftStore.get<typeof frozen.current>(
          profile.id,
          "fund." + task.id,
        );
        if (recovered) frozen.current = recovered;
      }
      if (!frozen.current) {
        if (
          !reason.trim() ||
          !lines.length ||
          lines.some(
            (l) =>
              !l.partitionId || !Number.isFinite(l.amount) || l.amount <= 0,
          )
        )
          throw new Error(
            "Choose annual accounts, positive amounts and an approved authority reference.",
          );
        if (new Set(lines.map((l) => l.partitionId)).size !== lines.length)
          throw new Error("Choose each annual account once.");
        if (
          !(await confirmAction(
            "Authorize funding?",
            `${peso(total)} will be committed from the selected annual accounts once. This authorizes work; cash release remains separate.`,
            "Authorize funding",
          ))
        )
          return;
        frozen.current = {
          lines: lines.map((l) => ({ ...l })),
          reason,
          key: key.current,
        };
        await draftStore.set(profile.id, "fund." + task.id, frozen.current);
      }
      await fundOfficeWork({
        taskId: task.id,
        fiscalYear: budget.summary.fiscalYear,
        lines: frozen.current.lines,
        reason: frozen.current.reason,
        authorizationKey: frozen.current.key,
      });
      await draftStore.remove(profile.id, "fund." + task.id);
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Authorize task Budget"
      description={task.title}
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Authorize work funding
        </Button>
      }
    >
      {lines.map((line, i) => (
        <Card key={i}>
          <Choice
            label="Annual account"
            value={line.partitionId}
            disabled={!!frozen.current || action.busy}
            options={leaves.map((s) => ({
              value: s.id,
              label: s.name,
              description: `${peso(s.amount - s.heldAmount - (s.committedAmount || 0))} available`,
            }))}
            onChange={(v) =>
              setLines((old) =>
                old.map((l, index) =>
                  index === i ? { ...l, partitionId: v } : l,
                ),
              )
            }
          />
          <Field
            label="Approved amount"
            keyboardType="decimal-pad"
            value={String(line.amount || "")}
            editable={!frozen.current && !action.busy}
            onChangeText={(v) =>
              setLines((old) =>
                old.map((l, index) =>
                  index === i ? { ...l, amount: Number(v) } : l,
                ),
              )
            }
          />
          <Field
            label="Particular"
            value={line.particular}
            editable={!frozen.current && !action.busy}
            onChangeText={(v) =>
              setLines((old) =>
                old.map((l, index) =>
                  index === i ? { ...l, particular: v } : l,
                ),
              )
            }
          />
          <Button
            variant="ghost"
            disabled={!!frozen.current || action.busy}
            onPress={() =>
              setLines((old) => old.filter((_, index) => index !== i))
            }
          >
            Remove funding account
          </Button>
        </Card>
      ))}
      <Button
        variant="outline"
        disabled={!!frozen.current || action.busy}
        onPress={() =>
          setLines((old) => [
            ...old,
            { partitionId: "", amount: 0, particular: "" },
          ])
        }
      >
        Add funding account
      </Button>
      <Field
        label="Reason / approved authority reference"
        value={reason}
        onChangeText={setReason}
        multiline
        editable={!frozen.current && !action.busy}
      />
      <LabelValue label="Funding total" value={peso(total)} />
    </Sheet>
  );
}
