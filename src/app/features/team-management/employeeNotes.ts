import { supabase } from "../../../platform/supabase";
import type { EmployeeNotesMap } from "../../../core/web/app/services/employeeNotesService";
export async function readEmployeeNotes(
  ids: string[],
): Promise<EmployeeNotesMap> {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("employee_notes")
    .select("*")
    .in("profile_id", ids);
  if (error) throw error;
  return Object.fromEntries(
    (data || []).map((row) => [
      row.profile_id,
      {
        employeeId: row.profile_id,
        strengths: row.strengths || "",
        weaknesses: row.weaknesses || "",
        notes: row.notes || "",
        tags: row.tags || [],
        updatedAt: new Date(row.updated_at).getTime(),
        updatedBy: row.updated_by || undefined,
      },
    ]),
  );
}
