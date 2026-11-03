import { supabase } from "../../../../lib/supabase";

export async function setDepartmentAccountingStaff(userId: string, assigned: boolean) {
  const { error } = await supabase.rpc("set_department_accounting_staff", {
    p_user_id: userId,
    p_assigned: assigned,
  });
  if (error) throw new Error(error.message);
}
