import {createPostgresChannel} from "../../shared/postgresChannel";
import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { fetchDepartmentBudgetBundle } from "../../../core/web/app/features/budget/services/budgetService";
export function useBudget(org: string, year: number) {
  const { profile } = useAuth();
  const facts = useFacts(
    `budget:${profile?.id}:${org}:${year}`,
    () => fetchDepartmentBudgetBundle(org, year),
    !!org && !!profile,
  );
  useEffect(() => {
    if (!org) return;
    const channel = createPostgresChannel(`native-budget:${profile?.id}:${org}:${year}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "department_fiscal_budgets",
          filter: "org_id=eq." + org,
        },
        () => void facts.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "petty_cash_requests",
          filter: "org_id=eq." + org,
        },
        () => void facts.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_commitments" },
        () => void facts.refresh(),
      )
      .subscribe();
    const app = AppState.addEventListener("change", (s) => {
      if (s === "active") void facts.refresh();
    });
    return () => {
      app.remove();
      void supabase.removeChannel(channel);
    };
  }, [org, year, profile?.id]);
  return facts;
}
