import { financialFailureIsUncertain } from "../../../core/web/app/features/budget/financialReceipts";
export class FinancialCancelled extends Error {}
export type FinancialReceipt = {
  key: string;
  state: "started" | "saved" | "uncertain";
  at: number;
};
export interface ReceiptStore {
  get(key: string): Promise<FinancialReceipt | null>;
  set(key: string, value: FinancialReceipt): Promise<void>;
  remove(key: string): Promise<void>;
}
export async function executeFinancialCommand(
  store: ReceiptStore,
  key: string,
  command: () => Promise<unknown>,
  assertAccess: () => void = () => {},
) {
  const active = await store.get("__active__");
  if (active && active.key !== key && active.state !== "saved")
    throw new Error(
      "Another financial action in this record has no confirmed response. Verify it before changing the request terms.",
    );
  const previous = await store.get(key);
  if (previous)
    throw new Error(
      previous.state === "saved"
        ? "This financial action was already saved. Refresh the current record."
        : "This action has no confirmed response. Check the current record before repeating the write.",
    );
  assertAccess();
  await store.set("__active__", { key, state: "started", at: Date.now() });
  await store.set(key, { key, state: "started", at: Date.now() });
  try {
    // Access may have changed while the durable receipt was being written.
    try {
      assertAccess();
    } catch (error) {
      throw new FinancialCancelled(error instanceof Error ? error.message : "");
    }
    await command();
  } catch (error) {
    if (
      !(error instanceof FinancialCancelled) &&
      financialFailureIsUncertain(error)
    )
      await store.set(key, { key, state: "uncertain", at: Date.now() });
    else {
      await store.remove(key);
      await store.remove("__active__");
    }
    throw error;
  }
  // If saving this receipt fails, the durable started marker still prevents replay.
  await store.set(key, { key, state: "saved", at: Date.now() });
  await store.set("__active__", { key, state: "saved", at: Date.now() });
}
