import type { WorkRow } from "../../../core/web/app/features/personal-work/types";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import { MondayTableRow } from "../../components/ui/MondayTable";

export function WorkRowItem({
  row,
  onPress,
  isLast = false,
}: {
  row: WorkRow;
  onPress: () => void;
  isLast?: boolean;
}) {
  const due = row.due ? workDateLabel(row.due, row.timezone) : null;
  const context = [
    row.projectTitle,
    row.workspaceName !== row.projectTitle ? row.workspaceName : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const tag = row.kind.endsWith("node") ? row.rootTitle || "Subitem" : null;

  return (
    <MondayTableRow
      title={row.title}
      status={row.status}
      context={context}
      due={due}
      assignee={row.relation || null}
      tag={tag}
      blocker={row.blocker || null}
      onPress={onPress}
      isLast={isLast}
    />
  );
}

