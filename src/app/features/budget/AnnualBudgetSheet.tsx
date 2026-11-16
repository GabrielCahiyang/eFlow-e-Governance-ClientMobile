import {
  budgetReleaseScheduleError,
  lockedReleaseEditError,
  releaseSchedulesYearError,
} from "../../../core/web/app/features/budget/selectors/budgetReleaseSchedule";
import { useRef, useState } from "react";
import {
  Button,
  Field,
  LabelValue,
  Notice,
  Sheet,
  Toggle,
  peso,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { confirmAction } from "../../shared/confirm";
import {
  formDraftKey,
  useRetainedDraft,
} from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import type {
  BudgetSection,
  DepartmentBudgetBundle,
} from "../../../core/web/app/features/budget/types";
import {
  openingSections,
  sectionTotal,
  validateBudgetSections,
  validateBudgetSectionsForLock,
} from "../../../core/web/app/features/budget/selectors/budgetSections";
import {
  saveBudgetSections,
  fetchBudgetSections,
} from "../../../core/web/app/features/budget/services/budgetSectionService";
import {
  lockDepartmentFiscalBudget,
  closeDepartmentFiscalBudget,
  fetchDepartmentBudgetBundle,
} from "../../../core/web/app/features/budget/services/budgetService";
import { budgetSettingsError } from "../../../core/web/app/features/budget/validation/financialValidation";
import {
  DEFAULT_DAILY_PETTY_CASH_RELEASE_LIMIT,
  DEFAULT_PER_RECEIPT_LIMIT,
  DEFAULT_LIQUIDATION_DUE_DAYS,
  DEFAULT_UNDERUTILIZATION_THRESHOLD,
} from "../../../core/web/app/features/budget/constants";
import { BudgetSectionEditor } from "./BudgetSectionEditor";
import { useFinancialCommand } from "./useFinancialCommand";

export function AnnualBudgetSheet({
  orgId,
  year,
  data,
  onSaved,
  onClose,
}: {
  orgId: string;
  year: number;
  data: DepartmentBudgetBundle;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const { profile } = useAuth(),
    summary = data.summary,
    locked = summary?.status === "locked",
    closed = summary?.status === "closed";
  const draftKey = formDraftKey(
    profile?.id,
    `annual-budget:${orgId}:${year}:${summary?.status || "draft"}`,
  );
  const [draft, setDraft, clearDraft] = useRetainedDraft(draftKey, true, () => ({
    sections: openingSections(data),
    daily: String(
      summary?.dailyPettyCashReleaseLimit ??
        DEFAULT_DAILY_PETTY_CASH_RELEASE_LIMIT,
    ),
    receipt: String(summary?.perReceiptLimit ?? DEFAULT_PER_RECEIPT_LIMIT),
    days: String(summary?.liquidationDueDays ?? DEFAULT_LIQUIDATION_DUE_DAYS),
    threshold: String(
      summary?.underutilizationThreshold ?? DEFAULT_UNDERUTILIZATION_THRESHOLD,
    ),
    override: summary?.allowReceiptLimitOverride ?? false,
    notes: summary?.notes || "",
    reason: "",
  }), { restoreOnOpen: false });
  const { sections, daily, receipt, days, threshold, override, notes, reason } =
    draft;
  const setSections = (
    next: BudgetSection[] | ((old: BudgetSection[]) => BudgetSection[]),
  ) =>
    setDraft((old) => ({
      ...old,
      sections: typeof next === "function" ? next(old.sections) : next,
    }));
  const [validationError, setValidationError] = useState<Error>();
  const version = useRef(data.sectionsVersion || 0),
    financial = useFinancialCommand(
      profile?.id || "",
      `annual:${orgId}:${year}:${data.sectionsVersion || 0}:${summary?.status || "draft"}`,
    );
  const settings = {
    dailyReleaseLimit: Number(daily),
    perReceiptLimit: Number(receipt),
    liquidationDueDays: Number(days),
    threshold: Number(threshold),
    allowReceiptOverride: override,
    notes,
  };
  const validate = () => {
    const issue =
      validateBudgetSections(sections) ||
      sections.map(budgetReleaseScheduleError).find(Boolean) ||
      releaseSchedulesYearError(sections, year) ||
      (locked ? lockedReleaseEditError(openingSections(data), sections) : "") ||
      budgetSettingsError(settings);
    if (issue) throw new PublicMessageError(issue);
    if (locked && !reason.trim())
      throw new PublicMessageError(
        "A reason is required to adjust a locked budget.",
      );
    if (!data.sectionsAvailable)
      throw new PublicMessageError(
        "Office budget sections are unavailable until the required setup update is completed.",
      );
  };
  const save = (lock = false) => {
    setValidationError(undefined);
    let issue = "";
    try {
      validate();
      if (lock) {
        issue = validateBudgetSectionsForLock(sections);
        if (issue) throw new PublicMessageError(issue);
      }
    } catch (e) {
      setValidationError(
        e instanceof Error ? e : new Error("Review the budget fields."),
      );
      return;
    }
    void (async () => {
      if (
        !(await confirmAction(
          lock
            ? "Save and lock annual budget?"
            : locked
              ? "Record audited budget adjustment?"
              : "Save annual budget?",
          `FY ${year} · ${peso(sectionTotal(sections))}. ${lock ? "Future corrections require an audit reason." : "Existing commitments and history remain protected."}`,
          lock ? "Save and lock" : "Save budget",
        ))
      )
        return;
      let budgetId = summary?.id;
      const saved = await financial.run(
        `save:${version.current}:${JSON.stringify({ sections, settings, reason })}`,
        async () => {
          budgetId = await saveBudgetSections({
            orgId,
            fiscalYear: year,
            sections,
            expectedVersion: version.current,
            settings,
            reason: reason || undefined,
          });
        },
        async () => {
          const current = await fetchBudgetSections(orgId, year);
          version.current = current.sectionsVersion;
          await onSaved();
        },
        "Annual budget saved.",
      );
      if (!saved) return;
      if (lock && budgetId) {
        const lockSaved = await financial.run(
          `lock:${budgetId}`,
          () => lockDepartmentFiscalBudget(budgetId!),
          async () => {
            const current = await fetchDepartmentBudgetBundle(orgId, year);
            if (current.summary?.status !== "locked")
              throw new PublicMessageError(
                "Budget locking could not be verified.",
              );
            await onSaved();
          },
          "Annual budget locked.",
        );
        if (!lockSaved) return;
      }
      clearDraft();
      financial.clear();
      onClose();
    })();
  };
  const close = () => {
    if (financial.busy) return;
    setValidationError(undefined);
    financial.clear();
    onClose();
  };
  return (
    <Sheet
      actionError={financial.error || validationError}
      open
      title={`FY ${year} · Annual budget`}
      description={
        locked
          ? "Changes create an audited adjustment."
          : closed
            ? "Closed fiscal record"
            : "Configure sections, detailed accounts and cash rules."
      }
      onClose={close}
      busy={financial.busy}
      footer={
        <>
          {!closed && (
            <Button busy={financial.busy} onPress={() => save()}>
              Save budget
            </Button>
          )}
          {!!(!summary?.lockedAt && !closed) && (
            <Button
              variant="outline"
              busy={financial.busy}
              onPress={() => save(true)}
            >
              Save and lock budget
            </Button>
          )}
        </>
      }
    >
      <LabelValue
        label="Draft appropriation"
        value={peso(sectionTotal(sections))}
      />
      <BudgetSectionEditor
        sections={sections}
        onChange={setSections}
        disabled={closed || financial.busy}
      />
      <Field
        label="Daily cash release limit"
        value={daily}
        onChangeText={(value) => setDraft({ daily: value })}
        keyboardType="decimal-pad"
        editable={!closed && !financial.busy}
      />
      <Field
        label="Per-receipt limit"
        value={receipt}
        onChangeText={(value) => setDraft({ receipt: value })}
        keyboardType="decimal-pad"
        editable={!closed && !financial.busy}
      />
      <Field
        label="Liquidation deadline in days"
        value={days}
        onChangeText={(value) => setDraft({ days: value })}
        keyboardType="number-pad"
        editable={!closed && !financial.busy}
      />
      <Field
        label="Q4 utilization target (%)"
        value={threshold}
        onChangeText={(value) => setDraft({ threshold: value })}
        keyboardType="decimal-pad"
        editable={!closed && !financial.busy}
      />
      <Toggle
        label="Allow documented receipt-limit override"
        value={override}
        onChange={(value) => setDraft({ override: value })}
        disabled={closed || financial.busy}
      />
      <Field
        label="Budget notes"
        value={notes}
        onChangeText={(value) => setDraft({ notes: value })}
        multiline
        editable={!closed && !financial.busy}
      />
      {!!locked && (
        <Field
          label="Adjustment reason"
          value={reason}
          onChangeText={(value) => setDraft({ reason: value })}
          multiline
          editable={!financial.busy}
        />
      )}
      {!!locked && (
        <>
          <Notice>
            Closing protects fiscal history. Unsettled cash and other current
            checks can block it.
          </Notice>
          <Field
            label="Reason for fiscal close"
            value={reason}
            onChangeText={(value) => setDraft({ reason: value })}
            multiline
          />
          <Button
            variant="danger"
            busy={financial.busy}
            disabled={!reason.trim()}
            onPress={() =>
              void (async () => {
                if (
                  !summary ||
                  !(await confirmAction(
                    "Close fiscal year?",
                    `Close FY ${year}. ${reason}`,
                    "Close fiscal year",
                    true,
                  ))
                )
                  return;
                const saved = await financial.run(
                  `close:${summary.id}`,
                  () => closeDepartmentFiscalBudget(summary.id, reason),
                  onSaved,
                  "Fiscal year closed.",
                );
                if (saved) {
                  clearDraft();
                  financial.clear();
                  onClose();
                }
              })()
            }
          >
            Close fiscal year
          </Button>
        </>
      )}
    </Sheet>
  );
}
