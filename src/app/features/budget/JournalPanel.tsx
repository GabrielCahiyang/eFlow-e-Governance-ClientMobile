import { useState } from "react";
import Check from "lucide-react-native/icons/check";
import Download from "lucide-react-native/icons/download";
import Eye from "lucide-react-native/icons/eye";
import FileText from "lucide-react-native/icons/file-text";
import Plus from "lucide-react-native/icons/plus";
import X from "lucide-react-native/icons/x";
import {
  Button,
  Card,
  Choice,
  DataTable,
  DateField,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  SearchField,
  Sheet,
  dateLabel,
  peso,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useFacts } from "../../shared/useFacts";
import { confirmAction } from "../../shared/confirm";
import {
  fetchGeneralJournal,
  fetchAccountingAccounts,
  postGeneralJournalAdjustment,
} from "../../../core/web/app/features/budget/services/budgetService";
import type {
  DepartmentBudgetBundle,
  GeneralJournalEntry,
  JournalAdjustmentLineInput,
} from "../../../core/web/app/features/budget/types";
import { financialAmountError } from "../../../core/web/app/features/budget/validation/financialValidation";
import { useFinancialCommand } from "./useFinancialCommand";
import { exportTable } from "../../shared/exportTable";
import { useAction } from "../../shared/useAction";
export function JournalPanel({
  orgId,
  year,
  data,
}: {
  orgId: string;
  year: number;
  data: DepartmentBudgetBundle;
}) {
  const palette = useTheme(),
    { profile, can } = useAuth(),
    facts = useFacts(`journal:${profile?.id}:${orgId}:${year}`, () =>
      fetchGeneralJournal(orgId, year),
    ),
    [query, setQuery] = useState(""),
    [entry, setEntry] = useState<GeneralJournalEntry>(),
    [create, setCreate] = useState(false);
  const entries = (facts.data || []).filter((e) =>
    `${e.referenceNumber} ${e.memo} ${e.sourceType}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const exportAction = useAction();
  const output = (format: "csv" | "pdf") =>
    exportAction.run(() =>
      exportTable(
        format,
        `General Journal · FY ${year}`,
        ["Reference", "Date", "Memo", "Account", "Debit", "Credit"],
        entries.flatMap((e) =>
          e.lines.map((line) => [
            e.referenceNumber,
            e.entryDate,
            e.memo,
            line.accountCode,
            line.debit,
            line.credit,
          ]),
        ),
      ),
    );
  return (
    <>
      <Row>
        <Button
          variant="outline"
          disabled={facts.loading || !!facts.error}
          busy={exportAction.busy}
          icon={<Download size={15} color={palette.primary} />}
          onPress={() => void output("csv")}
        >
          Export CSV
        </Button>
        <Button
          variant="outline"
          disabled={facts.loading || !!facts.error}
          busy={exportAction.busy}
          icon={<FileText size={15} color={palette.primary} />}
          onPress={() => void output("pdf")}
        >
          Export PDF
        </Button>
      </Row>
      {!!exportAction.error && <ErrorState error={exportAction.error} />}
      <Row>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search journal entries"
        />
        {!!(
          !!can("accounting.post_journal") && data.summary?.status === "locked"
        ) && (
          <Button
            icon={<Plus size={15} color={palette.onPrimary} />}
            onPress={() => setCreate(true)}
          >
            Post balanced adjustment
          </Button>
        )}
      </Row>
      <Notice>
        Posted journal entries are immutable. Correct them with a separate
        authorized, balanced adjustment.
      </Notice>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : entries.length ? (
        entries.map((e) => (
          <Card
            key={e.id}
            title={e.referenceNumber || `Entry ${e.entryNumber}`}
          >
            <LabelValue label="Date" value={dateLabel(e.entryDate)} />
            <LabelValue
              label="Source"
              value={e.sourceType.replaceAll("_", " ")}
            />
            <Text numberOfLines={3}>{e.memo}</Text>
            <LabelValue
              label="Debit"
              value={peso(e.lines.reduce((s, l) => s + l.debit, 0))}
            />
            <LabelValue
              label="Credit"
              value={peso(e.lines.reduce((s, l) => s + l.credit, 0))}
            />
            <Button
              variant="outline"
              icon={<Eye size={15} color={palette.primary} />}
              onPress={() => setEntry(e)}
            >
              View full entry
            </Button>
          </Card>
        ))
      ) : (
        <Empty kind="budget" title="No journal entries" />
      )}
      <Sheet
        open={!!entry}
        title={entry?.referenceNumber || "Journal entry"}
        onClose={() => setEntry(undefined)}
      >
        {!!entry && (
          <>
            <Text>{entry.memo}</Text>
            <LabelValue
              label="Posted by"
              value={entry.postedByName || "Automated posting"}
            />
            <LabelValue label="Posted at" value={dateLabel(entry.postedAt)} />
            <DataTable
              columns={[
                {
                  id: "account",
                  title: "Account",
                  width: 210,
                  render: (line: GeneralJournalEntry["lines"][number]) => (
                    <Text>
                      {line.accountCode} · {line.accountTitle}
                    </Text>
                  ),
                },
                {
                  id: "debit",
                  title: "Debit",
                  width: 130,
                  render: (line) => <Text>{peso(line.debit)}</Text>,
                },
                {
                  id: "credit",
                  title: "Credit",
                  width: 130,
                  render: (line) => <Text>{peso(line.credit)}</Text>,
                },
              ]}
              rows={entry.lines}
              rowKey={(line) => line.id}
            />
            <LabelValue
              label="Full entry debit"
              value={peso(entry.lines.reduce((s, l) => s + l.debit, 0))}
            />
            <LabelValue
              label="Full entry credit"
              value={peso(entry.lines.reduce((s, l) => s + l.credit, 0))}
            />
          </>
        )}
      </Sheet>
      {!!(!!create && !!data.summary) && (
        <JournalAdjustment
          budgetId={data.summary.id}
          onClose={() => setCreate(false)}
          onSaved={facts.refresh}
        />
      )}
    </>
  );
}
function JournalAdjustment({
  budgetId,
  onClose,
  onSaved,
}: {
  budgetId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const palette = useTheme(),
    { profile } = useAuth(),
    accounts = useFacts("journal-account-catalog", fetchAccountingAccounts),
    command = useFinancialCommand(profile?.id || "", `journal:${budgetId}`),
    [validation, setValidation] = useState("");
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(profile?.id, "journal-adjustment:" + budgetId),
    true,
    () => ({
      date: "",
      reference: "",
      memo: "",
      lines: [
        { accountCode: "", debit: 0, credit: 0 },
        { accountCode: "", debit: 0, credit: 0 },
      ] as JournalAdjustmentLineInput[],
    }),
  );
  const { date, reference, memo, lines } = draft;
  const close = () => {
    if (command.busy) return;
    command.clear();
    setValidation("");
    onClose();
  };
  const patch = (index: number, values: Partial<JournalAdjustmentLineInput>) =>
    updateDraft((old) => ({
      ...old,
      lines: old.lines.map((l, i) => (i === index ? { ...l, ...values } : l)),
    }));
  const save = async () => {
    const debits = lines.reduce((s, l) => s + Math.round(l.debit * 100), 0),
      credits = lines.reduce((s, l) => s + Math.round(l.credit * 100), 0);
    const issue = !date
      ? "Entry date is required."
      : !reference.trim()
        ? "Reference number is required."
        : !memo.trim()
          ? "Adjustment explanation is required."
          : debits !== credits || debits <= 0
            ? "The journal must balance and contain a positive amount."
            : lines.some(
                  (l) =>
                    !l.accountCode ||
                    financialAmountError(l.debit, "Debit", true) ||
                    financialAmountError(l.credit, "Credit", true) ||
                    (l.debit > 0 && l.credit > 0) ||
                    (l.debit === 0 && l.credit === 0),
                )
              ? "Choose an account and one positive debit or credit for every line."
              : "";
    setValidation(issue);
    if (
      issue ||
      !(await confirmAction(
        "Post balanced adjustment?",
        `${reference} · ${peso(debits / 100)}. This entry cannot be edited after posting.`,
        "Post journal adjustment",
      ))
    )
      return;
    const ok = await command.run(
      JSON.stringify({ date, reference, memo, lines }),
      () =>
        postGeneralJournalAdjustment({
          fiscalBudgetId: budgetId,
          entryDate: date,
          referenceNumber: reference.trim(),
          memo: memo.trim(),
          lines,
        }),
      onSaved,
      "Balanced journal adjustment posted.",
    );
    if (ok) {
      clearDraft();
      onClose();
    }
  };
  return (
    <Sheet
      actionError={command.error}
      open
      title="Balanced journal adjustment"
      onClose={close}
      busy={command.busy}
      footer={
        <Button
          busy={command.busy}
          icon={<Check size={15} color={palette.onPrimary} />}
          onPress={() => void save()}
        >
          Review and post adjustment
        </Button>
      }
    >
      <DateField
        label="Entry date"
        value={date}
        onChange={(next) => updateDraft({ date: next })}
      />
      <Field
        label="Reference number"
        value={reference}
        onChangeText={(next) => updateDraft({ reference: next })}
      />
      <Field
        label="Explanation"
        value={memo}
        onChangeText={(next) => updateDraft({ memo: next })}
        multiline
      />
      {accounts.error ? (
        <ErrorState error={accounts.error} />
      ) : accounts.data ? (
        lines.map((line, index) => (
          <Card key={index} title={`Line ${index + 1}`}>
            <Choice
              label="Account"
              disabled={command.busy}
              value={line.accountCode}
              options={accounts.data!.map((a) => ({
                value: a.code,
                label: `${a.code} · ${a.title}`,
              }))}
              onChange={(accountCode: string) => patch(index, { accountCode })}
            />
            <Field
              label="Debit"
              value={String(line.debit)}
              onChangeText={(debit) => patch(index, { debit: Number(debit) })}
              keyboardType="decimal-pad"
              editable={!command.busy}
            />
            <Field
              label="Credit"
              value={String(line.credit)}
              onChangeText={(credit) =>
                patch(index, { credit: Number(credit) })
              }
              keyboardType="decimal-pad"
              editable={!command.busy}
            />
            {!!(lines.length > 2) && (
              <Button
                variant="ghost"
                disabled={command.busy}
                icon={<X size={15} color={palette.primary} />}
                onPress={() =>
                  updateDraft((old) => ({
                    ...old,
                    lines: old.lines.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove line
              </Button>
            )}
          </Card>
        ))
      ) : (
        <Loading />
      )}
      <Button
        variant="outline"
        disabled={command.busy}
        icon={<Plus size={15} color={palette.primary} />}
        onPress={() =>
          updateDraft((old) => ({
            ...old,
            lines: [...old.lines, { accountCode: "", debit: 0, credit: 0 }],
          }))
        }
      >
        Add journal line
      </Button>
      {!!validation && <ErrorState error={validation} />}
    </Sheet>
  );
}
