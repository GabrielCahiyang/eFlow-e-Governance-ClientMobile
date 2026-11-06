import { Button, ErrorState, Row } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { exportTable } from "../../shared/exportTable";
import type { DepartmentBudgetBundle } from "../../../core/web/app/features/budget/types";
export function BudgetExport({
  data,
  view,
  title,
}: {
  data: DepartmentBudgetBundle;
  view: string;
  title: string;
}) {
  const action = useAction();
  const output = (format: "csv" | "pdf") =>
    action.run(async () => {
      const requestColumns = [
          "Reference",
          "Work",
          "Purpose",
          "Requester",
          "Status",
          "Requested",
          "Approved",
          "Released",
          "Actual spent",
          "Returned",
        ],
        requestRows = data.requests
          .filter((r) => view !== "expenses" || r.status === "settled")
          .map((r) => [
            r.requestNumber,
            r.taskTitle,
            r.purpose,
            r.requesterName,
            r.status,
            r.requestedAmount,
            r.approvedAmount,
            r.releasedAmount,
            r.actualSpent,
            r.returnedAmount,
          ]);
      const columns =
        view === "audit"
          ? [
              "Date",
              "Event",
              "Amount",
              "Description",
              "Role",
              "Reason",
              "Previous state",
              "New state",
            ]
          : ["overview", "annual"].includes(view)
            ? ["Budget line", "Amount", "Category"]
            : view === "funding"
              ? ["Work", "Status", "Amount"]
              : requestColumns;
      const rows =
        view === "audit"
          ? data.ledger.map((l) => [
              new Date(l.createdAt).toISOString(),
              l.entryType,
              l.amount,
              l.description,
              l.actorRole,
              l.reason,
              l.previousState,
              l.newState,
            ])
          : ["overview", "annual"].includes(view)
            ? data.lines.map((l) => [l.particular, l.amount, l.category])
            : view === "funding"
              ? data.commitments.map((c) => [c.title, c.status, c.amount])
              : requestRows;
      await exportTable(format, title + " · " + view, columns, rows);
    });
  return (
    <>
      <Row>
        <Button
          variant="outline"
          busy={action.busy}
          onPress={() => void output("csv")}
        >
          Export CSV
        </Button>
        <Button
          variant="outline"
          busy={action.busy}
          onPress={() => void output("pdf")}
        >
          Export PDF
        </Button>
      </Row>
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </>
  );
}
