import type { MobileWorkRow } from "./displayWorkSnapshot";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import { MondayTableRow } from "../../components/ui/MondayTable";

export function WorkRowItem({
  row,
  onPress,
  isLast = false,
}: {
  row: MobileWorkRow;
  onPress: () => void;
  isLast?: boolean;
}) {
  const due = row.due ? workDateLabel(row.due, row.timezone) : null;
  const start = row.start ? workDateLabel(row.start, row.timezone) : null;
  const compactStart =
    start &&
    due &&
    /^\d{4}$/.test(due.slice(-4)) &&
    start.slice(-4) === due.slice(-4)
      ? start.slice(0, -5)
      : start;
  const schedule =
    start && due
      ? `${compactStart} to ${due}`
      : start
        ? `Starts ${start}`
        : due
          ? `Due ${due}`
          : null;
  const context = [
    row.projectTitle,
    row.workspaceName !== row.projectTitle ? row.workspaceName : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const tag = row.kind.endsWith("node") ? row.rootTitle || "Subtask" : null;

  return (
    <MondayTableRow
      title={row.title}
      status={row.status}
      customStatusId={row.customStatusId}
      context={context}
      due={schedule}
      scheduleLabel={[start && `Starts ${start}`, due && `Due ${due}`]
        .filter(Boolean)
        .join(", ")}
      assignee={row.relation || null}
      tag={tag}
      blocker={row.blocker || null}
      onPress={onPress}
      isLast={isLast}
    />
  );
}
