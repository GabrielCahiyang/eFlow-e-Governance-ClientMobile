import * as React from "react";
import type { ProposalGovernanceState } from "../types";
import { fetchProposalGovernanceState, subscribeToProposalGovernance } from "../services/governanceService";

const EMPTY: ProposalGovernanceState = { assignments: [], signoffs: [], records: [], closeout: null, closeoutDecisions: [] };

export function useProposalGovernance(draftId: string | null) {
  const [state, setState] = React.useState<ProposalGovernanceState>(EMPTY);
  const [loading, setLoading] = React.useState(Boolean(draftId));
  const [error, setError] = React.useState<string | null>(null);
  const refresh = React.useCallback(async () => {
    if (!draftId) return;
    try { setState(await fetchProposalGovernanceState(draftId)); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load proposal governance."); }
    finally { setLoading(false); }
  }, [draftId]);
  React.useEffect(() => {
    if (!draftId) return;
    setLoading(true);
    void refresh();
    return subscribeToProposalGovernance(draftId, () => { void refresh(); });
  }, [draftId, refresh]);
  return { ...state, loading, error, refresh };
}
