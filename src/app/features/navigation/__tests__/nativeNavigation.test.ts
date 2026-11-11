import { test, expect } from "@jest/globals";
import {
  canOpenNativeSection,
  nativeDestinations,
  nativeDefaultSection,
} from "../nativeNavigation";
test("Accounting retains employee destinations and receives only explicitly permitted accounting pages", () => {
  const can = (key: string) =>
    [
      "navigation.tasks",
      "navigation.projects",
      "navigation.accounting_overview",
      "navigation.accounting_releases",
    ].includes(key);
  const names = nativeDestinations("accounting_staff", can).map(
    (item) => item.id,
  );
  expect(names).toEqual(
    expect.arrayContaining([
      "personal_work",
      "projects",
      "tasks",
      "accounting_overview",
      "accounting_releases",
    ]),
  );
  expect(names).not.toContain("accounting_journal");
});
test("Admin permission defaults cannot open operational project or cash workflows", () => {
  expect(canOpenNativeSection("admin", "project", () => true)).toBe(false);
  expect(canOpenNativeSection("admin", "budget", () => true)).toBe(false);
  expect(canOpenNativeSection("admin", "accounting_releases", () => true)).toBe(
    false,
  );
  expect(canOpenNativeSection("admin", "profile", () => false)).toBe(false);
  expect(nativeDestinations("admin", () => true)).toEqual([]);
  for (const role of ["head", "member", "accounting_staff"])
    for (const section of [
      "users",
      "permissions",
      "administration",
      "migration",
      "audit",
    ] as const)
      expect(canOpenNativeSection(role, section, () => true)).toBe(false);
});
test("temporary task leadership grants the paired review queue without promoting the account role", () => {
  const permissions = (key: string) => key === "navigation.tasks";
  expect(
    nativeDestinations("member", permissions, false).some(
      (item) => item.id === "reviews",
    ),
  ).toBe(false);
  expect(
    nativeDestinations("member", permissions, true).some(
      (item) => item.id === "reviews",
    ),
  ).toBe(true);
  expect(
    canOpenNativeSection("member", "accounting_journal", permissions, true),
  ).toBe(false);
});
test("M1 defaults follow the approved mobile scope", () => {
  expect(nativeDefaultSection("admin")).toBe("profile");
  expect(nativeDefaultSection("head")).toBe("overview");
  expect(nativeDefaultSection("member")).toBe("overview");
  expect(nativeDefaultSection("accounting_staff")).toBe("overview");
});
