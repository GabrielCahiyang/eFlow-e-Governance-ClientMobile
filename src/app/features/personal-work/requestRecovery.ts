import type { PersonalCommand } from "../../../core/web/app/features/workspaces/types";
export interface PersonalRequest {
  schema: 1;
  actor: string;
  project: string;
  request: string;
  command: PersonalCommand;
  payload: Record<string, unknown>;
}
const commands: PersonalCommand[] = [
  "set_member",
  "create_task",
  "staff_task",
  "progress_task",
  "submit_task",
  "review_task",
  "complete_project",
  "archive_project",
  "shortcut",
];
export function isPersonalRequest(
  value: unknown,
  actor: string,
  project: string,
): value is PersonalRequest {
  const data = value as PersonalRequest | null;
  return (
    !!data &&
    data.schema === 1 &&
    data.actor === actor &&
    data.project === project &&
    typeof data.request === "string" &&
    data.request.length > 10 &&
    commands.includes(data.command) &&
    !!data.payload &&
    typeof data.payload === "object" &&
    !Array.isArray(data.payload)
  );
}
