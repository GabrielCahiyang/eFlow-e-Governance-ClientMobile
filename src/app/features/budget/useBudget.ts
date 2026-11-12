import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { fetchDepartmentBudgetBundle } from "../../../core/web/app/features/budget/services/budgetService";
import { useOfficeFinanceUpdates } from "./useOfficeFinanceUpdates";
export function useBudget(org: string, year: number) {
  const { profile } = useAuth();
  const facts = useFacts(
    `budget:${profile?.id}:${org}:${year}`,
    () => fetchDepartmentBudgetBundle(org, year),
    !!org && !!profile,
  );
  useOfficeFinanceUpdates(org, year, !!profile, facts.refresh);
  return facts;
}
