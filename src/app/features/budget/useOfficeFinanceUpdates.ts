import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createPostgresChannel } from "../../shared/postgresChannel";

export function useOfficeFinanceUpdates(
  office: string,
  year: number | undefined,
  enabled: boolean,
  reload: () => Promise<unknown>,
) {
  useEffect(() => {
    if (!office || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer || AppState.currentState !== "active") return;
      timer = setTimeout(() => {
        timer = undefined;
        void reload();
      }, 250);
    };
    const filter = `org_id=eq.${office}`;
    const channel = createPostgresChannel(
      `native-office-finance:${office}:${year ?? "all"}`,
    )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "department_fiscal_budgets",
          filter,
        },
        (event) => {
          const row = { ...event.old, ...event.new } as {
            fiscal_year?: number;
          };
          if (
            !year ||
            row.fiscal_year == null ||
            Number(row.fiscal_year) === year
          )
            refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "petty_cash_requests",
          filter,
        },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    const changed = (event: {
      detail?: { orgId?: string; fiscalYear?: number };
    }) => {
      const { orgId, fiscalYear } = event.detail ?? {};
      if (
        (!orgId || orgId === office) &&
        (!year || !fiscalYear || fiscalYear === year)
      )
        refresh();
    };
    nativeWindow.addEventListener("eflow:finance-updated", changed);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const fallback = setInterval(refresh, 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      foreground.remove();
      nativeWindow.removeEventListener("eflow:finance-updated", changed);
      void supabase.removeChannel(channel);
    };
  }, [office, year, enabled, reload]);
}
