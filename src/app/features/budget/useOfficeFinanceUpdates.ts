import { useEffect } from "react";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";

export function useOfficeFinanceUpdates(
  office: string,
  year: number | undefined,
  enabled: boolean,
  reload: () => Promise<unknown>,
) {
  useEffect(() => {
    if (!office || !enabled) return;
    const live = createLiveRefreshController({
      onRefresh: () => void reload(),
      debounceMs: 250,
      hasRealtime: true,
    });
    const refresh = live.schedule;
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
      .subscribe(live.onChannelStatus);
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
    return () => {
      live.dispose();
      nativeWindow.removeEventListener("eflow:finance-updated", changed);
      void supabase.removeChannel(channel);
    };
  }, [office, year, enabled, reload]);
}
