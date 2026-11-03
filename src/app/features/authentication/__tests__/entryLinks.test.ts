import { test, expect } from "@jest/globals";
import { parseNativeEntryLink } from "../entryLinks";
const token = "0123456789abcdef0123456789abcdef";
test("recipient-bound project shares require a valid single grant and trusted origin", () => {
  const grant = "c08f5d18-4e6c-46f4-9aae-4fd541593f5d";
  expect(parseNativeEntryLink(`eflow://project-share?grant=${grant}`)).toEqual({
    kind: "project-share",
    token: grant,
  });
  expect(
    parseNativeEntryLink(`eflow://project-share?grant=${grant}&grant=${grant}`),
  ).toBeNull();
  expect(
    parseNativeEntryLink("eflow://project-share?grant=invalid"),
  ).toBeNull();
  expect(
    parseNativeEntryLink(
      `https://untrusted.example/project-share?grant=${grant}`,
      "https://eflow.example",
    ),
  ).toBeNull();
});
test("native account and project invitations preserve their distinct access flow", () => {
  expect(parseNativeEntryLink(`eflow://accept-invite?token=${token}`)).toEqual({
    kind: "invitation",
    token,
  });
  expect(
    parseNativeEntryLink(`eflow:///accept-project-invite?token=${token}`),
  ).toEqual({ kind: "project-invitation", token });
  expect(
    parseNativeEntryLink(`eflow://activate-account?token=${token}`),
  ).toEqual({ kind: "activation", token });
});
test("only the configured HTTPS origin can supply a web invitation", () => {
  expect(
    parseNativeEntryLink(
      `https://eflow.example/accept-invite?token=${token}`,
      "https://eflow.example",
    ),
  ).toEqual({ kind: "invitation", token });
  expect(
    parseNativeEntryLink(
      `https://malicious.example/accept-invite?token=${token}`,
      "https://eflow.example",
    ),
  ).toBeNull();
  expect(
    parseNativeEntryLink(
      `http://eflow.example/accept-invite?token=${token}`,
      "https://eflow.example",
    ),
  ).toBeNull();
  expect(
    parseNativeEntryLink(
      `https://user:password@eflow.example/accept-invite?token=${token}`,
      "https://eflow.example",
    ),
  ).toBeNull();
});
test("rejects ambiguous tokens, control characters, unknown paths and malformed URLs", () => {
  for (const raw of [
    "not-a-url",
    `eflow://accept-invite?token=${token}&token=other`,
    `eflow://accept-invite?token=${token}%0a`,
    `eflow://accept-invite?token=short`,
    `eflow://unknown?token=${token}`,
    `eflow://accept-invite?token=${"a".repeat(4097)}`,
  ])
    expect(parseNativeEntryLink(raw)).toBeNull();
});
