import type { Option } from "../../components/ui/Fields";
import type {
  WorkNode,
  WorkTreeSnapshot,
} from "../../../core/web/app/features/nested-work/types";
import {
  eligibleWorkPeople,
  resolveWorkPersonName,
} from "../../../core/web/app/features/nested-work/selectors/people";

/** Order the authorized directory for presentation only; never expand membership or authority. */
export function subtaskPeopleOptions(
  data: WorkTreeSnapshot,
  node: WorkNode | undefined,
  retainedIds: readonly string[],
  excludedId?: string,
): Option[] {
  const parent = node?.parent_subtask_id
    ? data.nodes.find((item) => item.id === node.parent_subtask_id)
    : undefined;
  const parentTeam = new Set([
    parent?.lead_id,
    ...(parent?.assigned_to_ids ?? []),
  ]);
  const taskTeam = new Set([data.root.lead, ...data.root.people]);
  const groups = [
    "On parent subtask",
    "On this task",
    "Other eligible people",
    "No longer eligible",
  ];
  const eligible = eligibleWorkPeople(data.people);
  const eligibleIds = new Set(eligible.map((person) => person.id));
  const options = eligible.map((person): Option => ({
    value: person.id,
    label: person.name,
    group: parentTeam.has(person.id)
      ? groups[0]
      : taskTeam.has(person.id)
        ? groups[1]
        : groups[2],
  }));
  // Preserve selected historical identities without offering them as new assignments.
  for (const id of new Set(retainedIds)) {
    if (id && !eligibleIds.has(id))
      options.push({
        value: id,
        label: resolveWorkPersonName(data.people, id),
        group: groups[3],
        description: "Unavailable for assignment",
        disabled: true,
      });
  }
  return options
    .filter((option) => option.value !== excludedId)
    .sort(
      (a, b) =>
        groups.indexOf(a.group!) - groups.indexOf(b.group!) ||
        a.label.localeCompare(b.label) ||
        a.value.localeCompare(b.value),
    );
}
