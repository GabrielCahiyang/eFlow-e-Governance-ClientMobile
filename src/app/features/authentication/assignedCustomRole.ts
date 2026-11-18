import type { CustomRoleDefinition } from "../../../core/web/app/features/permissions/types";
import { supabase } from "../../../platform/supabase";
import { isMobileRole } from "../../shared/mobileRoles";
import { PublicMessageError } from "../../shared/userMessages";

/** Read only the actor's assigned definition; role administration stays on Web. */
export async function readAssignedCustomRole(
  key: string | null | undefined,
  baseRole: string,
): Promise<CustomRoleDefinition | null> {
  if (!key?.trim()) return null;
  const result = await supabase
    .from("custom_roles")
    .select("key,label,description,base_role")
    .eq("key", key.trim())
    .maybeSingle();
  if (result.error) throw result.error;
  const row = result.data;
  // An assigned but unavailable definition must never fall back to broader base access.
  if (
    !row ||
    row.key !== key.trim() ||
    !isMobileRole(row.base_role) ||
    row.base_role !== baseRole ||
    isMobileRole(row.key) ||
    row.key === "admin" ||
    row.key === "super_admin" ||
    typeof row.label !== "string" ||
    !row.label.trim()
  ) {
    throw new PublicMessageError(
      "Your assigned role could not be verified. Retry or ask your Admin to check the role on eFlow Web.",
    );
  }
  return {
    key: row.key,
    label: row.label.trim(),
    description: row.description ?? "",
    baseRole: row.base_role,
  };
}
