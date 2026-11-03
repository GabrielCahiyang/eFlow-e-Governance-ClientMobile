import { test, expect } from "@jest/globals";
import {
  exactOfficePeople,
  accountingAssignmentAllowed,
} from "../identityScope";
import type { UserProfile } from "../../../../core/web/app/types";
const person = (
  id: string,
  role: string,
  org_id = "ledipo",
  is_active = true,
) => ({ id, role, org_id, is_active }) as UserProfile;
test("Office identity contains only active non-Admin people in the exact Office", () => {
  const people = [
    person("a", "member"),
    person("b", "accounting_staff"),
    person("head", "head"),
    person("c", "member", "other"),
    person("d", "member", "ledipo", false),
    person("admin", "admin"),
  ];
  expect(exactOfficePeople(people, "ledipo").map((p) => p.id)).toEqual([
    "a",
    "b",
    "head",
  ]);
  expect(exactOfficePeople(people, undefined)).toEqual([]);
});
test("accounting assignments require the appointed Head and never alter leadership or another Office", () => {
  const actor = person("head", "head"),
    target = person("employee", "member");
  expect(accountingAssignmentAllowed(actor, "head", target)).toBe(true);
  expect(accountingAssignmentAllowed(actor, "other-head", target)).toBe(false);
  expect(
    accountingAssignmentAllowed(
      actor,
      "head",
      person("other", "member", "other"),
    ),
  ).toBe(false);
  expect(
    accountingAssignmentAllowed(actor, "head", person("other-head", "head")),
  ).toBe(false);
  expect(
    accountingAssignmentAllowed(
      person("accountant", "accounting_staff"),
      "accountant",
      target,
    ),
  ).toBe(false);
  expect(
    accountingAssignmentAllowed(
      actor,
      "head",
      person("inactive", "member", "ledipo", false),
    ),
  ).toBe(false);
});
