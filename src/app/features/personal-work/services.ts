import { supabase } from "../../../platform/supabase";
import type { PersonalRequest } from "./requestRecovery";
export class PersonalCommandFailure extends Error {
  constructor(
    public readonly confirmedRejected: boolean,
    message: string,
  ) {
    super(message);
  }
}
export async function sendPersonalRequest(request: PersonalRequest) {
  const { data, error } = await supabase.rpc("r3_personal_project_command", {
    p_project: request.project,
    p_command: request.command,
    p_payload: request.payload,
    p_request: request.request,
  });
  if (error) {
    const code = error.code || "";
    throw new PersonalCommandFailure(
      /^(22|23)/.test(code) ||
        [
          "40001",
          "42501",
          "P0001",
          "40P01",
          "55P03",
          "57014",
          "PGRST202",
          "42883",
        ].includes(code),
      error.message,
    );
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new PersonalCommandFailure(
      false,
      "No personal-work receipt was returned. Retry the same request.",
    );
  return data as Record<string, unknown>;
}
