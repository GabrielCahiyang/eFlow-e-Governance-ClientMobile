import { test, expect } from "@jest/globals";
import { isMobileRole } from "../../../shared/mobileRoles";
import { normalizeUserRole } from "../../../../core/web/app/shared/roles";
test("mobile allows operational roles but rejects current and legacy Admin identities", () => {
  for (const role of ["head", "member", "accounting_staff"])
    expect(isMobileRole(normalizeUserRole(role))).toBe(true);
  for (const role of ["admin", "super_admin"])
    expect(isMobileRole(normalizeUserRole(role))).toBe(false);
  for (const role of ["", null, undefined, "root"])
    expect(isMobileRole(role)).toBe(false);
});
