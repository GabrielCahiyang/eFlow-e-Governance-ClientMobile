import { test, expect, jest } from "@jest/globals";
import {
  executeFinancialCommand,
  FinancialCancelled,
  type FinancialReceipt,
  type ReceiptStore,
} from "../financialReceipt";
function memory() {
  const rows = new Map<string, FinancialReceipt>();
  const store: ReceiptStore = {
    get: async (key) => rows.get(key) || null,
    set: async (key, value) => {
      rows.set(key, value);
    },
    remove: async (key) => {
      rows.delete(key);
    },
  };
  return { rows, store };
}
test("a saved release cannot be replayed after a screen or app restart", async () => {
  const { store } = memory(),
    release = jest.fn(async () => {});
  await executeFinancialCommand(store, "release-1", release);
  await expect(
    executeFinancialCommand(store, "release-1", release),
  ).rejects.toThrow("already saved");
  expect(release).toHaveBeenCalledTimes(1);
});
test("an unknown response blocks both the original and changed terms", async () => {
  const { rows, store } = memory();
  await expect(
    executeFinancialCommand(store, "release", async () => {
      throw new Error("Network connection lost");
    }),
  ).rejects.toThrow("Network");
  expect(rows.get("release")?.state).toBe("uncertain");
  const retry = jest.fn(async () => {});
  await expect(
    executeFinancialCommand(store, "release", retry),
  ).rejects.toThrow("no confirmed response");
  await expect(
    executeFinancialCommand(store, "changed-amount", retry),
  ).rejects.toThrow("no confirmed response");
  expect(retry).not.toHaveBeenCalled();
});

test("explicit server rejections can be corrected and cancelling confirmation does not record a write", async () => {
  const { rows, store } = memory();
  await expect(
    executeFinancialCommand(store, "approval", async () => {
      throw new Error("Reason is required");
    }),
  ).rejects.toThrow("required");
  expect(rows.size).toBe(0);
  await expect(
    executeFinancialCommand(store, "cancel", async () => {
      throw new FinancialCancelled();
    }),
  ).rejects.toBeInstanceOf(FinancialCancelled);
  expect(rows.size).toBe(0);
  await executeFinancialCommand(store, "approval", async () => {});
  expect(rows.get("approval")?.state).toBe("saved");
});
test("a crash after the write preserves the pre-write marker", async () => {
  const { store, rows } = memory();
  const write = store.set;
  store.set = async (key, value) => {
    if (value.state === "saved") throw new Error("Storage unavailable");
    await write(key, value);
  };
  const command = jest.fn(async () => {});
  await expect(
    executeFinancialCommand(store, "journal", command),
  ).rejects.toThrow("Storage");
  expect(command).toHaveBeenCalledTimes(1);
  expect(rows.get("journal")?.state).toBe("started");
  await expect(
    executeFinancialCommand(store, "journal", command),
  ).rejects.toThrow("no confirmed response");
  expect(command).toHaveBeenCalledTimes(1);
});

test("failure to persist the pre-write marker prevents a server call", async () => {
  const { store } = memory();
  store.set = async () => {
    throw new Error("Secure storage unavailable");
  };
  const command = jest.fn(async () => {});
  await expect(
    executeFinancialCommand(store, "journal", command),
  ).rejects.toThrow("storage");
  expect(command).not.toHaveBeenCalled();
});
