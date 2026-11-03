import { test, expect, jest, beforeEach } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { sessionStorage } from "../sessionStorage";
import { draftStore } from "../draftStore";
const items = new Map<string, string>();
beforeEach(() => {
  items.clear();
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation(async (key) => items.get(key) ?? null);
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementation(async (key, value) => {
      items.set(key, value);
    });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    items.delete(key);
  });
});
test("a large request survives chunking and replacing it removes its old generation", async () => {
  const body = "A retained request ✓ ".repeat(400);
  await sessionStorage.setItem("request", body);
  expect(await sessionStorage.getItem("request", true)).toBe(body);
  const first = JSON.parse(items.get("eflow.request")!);
  await sessionStorage.setItem("request", "replacement");
  expect([...items.keys()].some((k) => k.includes(first.generation))).toBe(
    false,
  );
  expect(await sessionStorage.getItem("request", true)).toBe("replacement");
  await sessionStorage.removeItem("request");
  expect(await sessionStorage.getItem("request", true)).toBeNull();
});
test("a failed replacement keeps the prior readable generation", async () => {
  await sessionStorage.setItem("request", "original");
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementation(async (key, value) => {
      if (key === "eflow.request") throw new Error("Storage full");
      items.set(key, value);
    });
  await expect(sessionStorage.setItem("request", "changed")).rejects.toThrow(
    "Storage full",
  );
  expect(await sessionStorage.getItem("request", true)).toBe("original");
});
test("unreadable retained requests fail closed rather than permitting a fresh write", async () => {
  await sessionStorage.setItem("request", "retained");
  const meta = JSON.parse(items.get("eflow.request")!);
  items.delete(`eflow.request.${meta.generation}.0`);
  expect(await sessionStorage.getItem("request")).toBeNull();
  await expect(sessionStorage.getItem("request", true)).rejects.toThrow(
    "Verify its original result",
  );
  await sessionStorage.setItem("draft.actor.work", "not JSON");
  await expect(draftStore.get("actor", "work")).rejects.toThrow("unreadable");
});
test("oversize writes keep an existing request intact", async () => {
  await sessionStorage.setItem("request", "original");
  await expect(
    sessionStorage.setItem("request", "a".repeat(150001)),
  ).rejects.toThrow("exceeds");
  expect(await sessionStorage.getItem("request", true)).toBe("original");
});
