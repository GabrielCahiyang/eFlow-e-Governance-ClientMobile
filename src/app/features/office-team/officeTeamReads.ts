import { controlPanelFetch } from "../../../core/web/app/shared/controlPanelClient";
import { SESSION_REFRESH_MESSAGE } from "../../../core/web/app/shared/userFacingError";
import type { OfficeMember } from "../../../core/web/app/features/office-team/types";

type OfficeTeam = { office_name: string; members: OfficeMember[] };
type OfficeRosterRow = Omit<OfficeMember, "is_active"> & {
  is_active: boolean | null;
};
const unavailable =
  "Office membership could not load. Check your connection to the protected eFlow gateway and retry.";

function isOfficeRosterRow(item: unknown): item is OfficeRosterRow {
  if (!item || typeof item !== "object") return false;
  const member = item as Partial<OfficeRosterRow>;
  return (
    typeof member.id === "string" &&
    !!member.id &&
    typeof member.full_name === "string" &&
    typeof member.email === "string" &&
    typeof member.role === "string" &&
    (typeof member.is_active === "boolean" || member.is_active === null)
  );
}

export async function loadOfficeTeam(): Promise<OfficeTeam> {
  let response: Response;
  try {
    response = await controlPanelFetch(
      "/office-team",
      {
        method: "GET",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      },
      { timeoutMs: 30000, retryOnEndpointChange: false },
    );
  } catch (error) {
    if (error instanceof Error && error.message === SESSION_REFRESH_MESSAGE)
      throw error;
    throw new Error(unavailable);
  }
  if (response.status === 401) throw new Error(SESSION_REFRESH_MESSAGE);
  if (response.status === 403)
    throw new Error(
      "The gateway requires current Office Head access for this roster.",
    );
  if (response.status === 404)
    throw new Error(
      "The configured gateway does not serve Office Team. Check its deployment.",
    );
  if (!response.ok) throw new Error(unavailable);
  const data: { office_name?: unknown; members?: unknown } | null =
    await response.json().catch(() => null);
  if (
    !data ||
    typeof data.office_name !== "string" ||
    !data.office_name.trim() ||
    !Array.isArray(data.members) ||
    !data.members.every(isOfficeRosterRow)
  )
    throw new Error("The gateway did not return a valid Office roster.");
  return {
    office_name: data.office_name,
    members: data.members.map((member) => ({
      ...member,
      is_active: member.is_active === true,
    })),
  };
}
