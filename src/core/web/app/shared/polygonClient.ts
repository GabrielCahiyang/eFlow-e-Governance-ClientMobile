/**
 * EflowWeb client for Polygon Blockchain Governance Ledger API.
 *
 * Calls the Ollama AI server endpoints:
 *   POST /controlpanelEflow/api/blockchain/anchor-proposal
 *   POST /controlpanelEflow/api/blockchain/anchor-event
 *   POST /controlpanelEflow/api/blockchain/anchor-archival
 *   GET  /controlpanelEflow/api/blockchain/verify/{docHash}
 *   POST /controlpanelEflow/api/blockchain/certificate/{proposalId}
 *
 * All blockchain logic runs on the server (Laptop A).
 * This client only sends payloads and receives anchor receipts.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnchorReceipt {
  proposal_id: string;
  event_type: "genesis" | "milestone" | "archival_seal";
  document_hash: string;         // 0x-prefixed SHA-256 hex (66 chars)
  tx_hash: string;               // Polygon tx hash or "SIMULATION:..." in dev
  block_number: number | null;
  chain_id: number;              // 80002 = Polygon Amoy
  explorer_url: string;
  anchored_at: number;           // Unix timestamp (float)
}

export interface BlockchainVerifyResult {
  valid: boolean;
  document_hash: string;
  tx_hash: string;
  block_number: number | null;
  simulated: boolean;
  explorer_url?: string;
  message: string;
  error?: string;
}

export interface ProposalCertificate {
  proposal_id: string;
  chain: string;
  chain_id: number;
  total_anchors: number;
  genesis: AnchorReceipt | null;
  milestones: AnchorReceipt[];
  archival_seal: AnchorReceipt | null;
  integrity_status: "UNANCHORED" | "ACTIVE" | "SEALED";
  certificate_generated_at: number;
}

export type BlockchainEventType =
  | "bac_clearance"
  | "cash_advance"
  | "revision_commit"
  | "approval"
  | "milestone_completion"
  | "budget_settlement";

// ── Helpers ───────────────────────────────────────────────────────────────────

function blockchainBase(rawBase: string): string {
  // rawBase looks like: https://xxx.trycloudflare.com/controlpanelEflow/api
  // or for local dev: /controlpanelEflow/api
  return rawBase.replace(/\/api$/, "");
}

async function blockchainPost<T>(
  url: string,
  authToken: string,
  body: unknown,
): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(`Blockchain request failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<T>;
}

// ── Client ────────────────────────────────────────────────────────────────────

/**
 * Anchor proposal genesis on Polygon when a proposal is first published.
 * proposalData should contain the full proposal payload (tasks, budget, team).
 */
export async function anchorProposalGenesis(
  baseUrl: string,
  authToken: string,
  proposalId: string,
  proposalData: Record<string, unknown>,
): Promise<AnchorReceipt> {
  const url = `${blockchainBase(baseUrl)}/api/blockchain/anchor-proposal`;
  return blockchainPost<AnchorReceipt>(url, authToken, {
    proposal_id: proposalId,
    proposal_data: proposalData,
  });
}

/**
 * Anchor a governance milestone event (BAC clearance, cash advance, approval, etc.)
 */
export async function anchorGovernanceEvent(
  baseUrl: string,
  authToken: string,
  proposalId: string,
  eventType: BlockchainEventType,
  eventData: Record<string, unknown>,
): Promise<AnchorReceipt> {
  const url = `${blockchainBase(baseUrl)}/api/blockchain/anchor-event`;
  return blockchainPost<AnchorReceipt>(url, authToken, {
    proposal_id: proposalId,
    event_type: eventType,
    event_data: eventData,
  });
}

/**
 * Anchor the archival seal when a proposal is archived.
 * manifest should include final task state, settlement records, and genesis tx hash.
 */
export async function anchorArchivalSeal(
  baseUrl: string,
  authToken: string,
  proposalId: string,
  archivalManifest: Record<string, unknown>,
): Promise<AnchorReceipt> {
  const url = `${blockchainBase(baseUrl)}/api/blockchain/anchor-archival`;
  return blockchainPost<AnchorReceipt>(url, authToken, {
    proposal_id: proposalId,
    proposal_data: archivalManifest,
  });
}

/**
 * Verify that a document hash appears in the Polygon transaction calldata.
 * Returns valid=true if tamper-proof integrity is confirmed.
 */
export async function verifyOnChain(
  baseUrl: string,
  authToken: string,
  documentHash: string,
  txHash: string,
): Promise<BlockchainVerifyResult> {
  const params = new URLSearchParams({ tx_hash: txHash });
  const url = `${blockchainBase(baseUrl)}/api/blockchain/verify/${encodeURIComponent(documentHash)}?${params}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(`Blockchain verify failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<BlockchainVerifyResult>;
}

/**
 * Fetch the chain-of-custody certificate for a proposal.
 * Pass all stored AnchorReceipts for this proposal from Supabase.
 */
export async function getProposalCertificate(
  baseUrl: string,
  authToken: string,
  proposalId: string,
  receipts: AnchorReceipt[],
): Promise<ProposalCertificate> {
  const url = `${blockchainBase(baseUrl)}/api/blockchain/certificate/${encodeURIComponent(proposalId)}`;
  return blockchainPost<ProposalCertificate>(url, authToken, {
    proposal_id: proposalId,
    receipts,
  });
}
