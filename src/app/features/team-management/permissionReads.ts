import { supabase } from "../../../platform/supabase";
import type {
  RolePermissionRow,
  UserOverrideRow,
} from "../../../core/web/app/features/permissions/types";
export async function readRolePermissions(): Promise<RolePermissionRow[]> {
  const r = await supabase.from("role_permissions").select("*");
  if (r.error) throw r.error;
  return (r.data || []).map((row) => ({
    role: String(row.role),
    permission: String(row.permission),
    allowed: Boolean(row.allowed),
  }));
}
export async function readOverrides(id: string): Promise<UserOverrideRow[]> {
  const r = await supabase
    .from("user_permission_overrides")
    .select("*")
    .eq("user_id", id);
  if (r.error) throw r.error;
  return (r.data || []).map((row) => ({
    userId: String(row.user_id),
    permission: String(row.permission),
    allowed: Boolean(row.allowed),
    setBy: row.set_by ? String(row.set_by) : null,
  }));
}
