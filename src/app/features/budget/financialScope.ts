import { supabase } from "../../../platform/supabase";
import { fetchAllOrgs } from "../../../core/web/lib/supabaseService";
export async function financialOffices(actor: string, own: string) {
  const organizations = await fetchAllOrgs();
  const checks = await Promise.all(
    organizations.map(async (office) => {
      if (office.id === own) return office;
      const result = await supabase.rpc("can_access_org", {
        p_user_id: actor,
        p_org_id: office.id,
        p_access_level: "read",
      });
      if (result.error) throw result.error;
      return result.data === true ? office : null;
    }),
  );
  return checks.filter(
    (office): office is NonNullable<typeof office> => !!office,
  );
}
