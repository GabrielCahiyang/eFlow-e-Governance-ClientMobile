import { expect, test } from "@jest/globals";
import Banknote from "lucide-react-native/icons/banknote";
import Wallet from "lucide-react-native/icons/wallet";
import { moreDestinations } from "../moreDestinations";

test("Accounting Staff More includes Office petty cash and keeps unique icons alongside Office budget & releases", () => {
  const destinations = moreDestinations("accounting_staff", () => true, true);
  const accountingReleases = destinations.find(
    (item) => item.id === "accounting_releases",
  );
  const pettyCash = destinations.find((item) => item.id === "petty_cash");

  expect(pettyCash).toBeDefined();
  expect(pettyCash?.Icon).toBe(Banknote);
  expect(accountingReleases).toBeDefined();
  expect(accountingReleases?.Icon).toBe(Wallet);
  expect(new Set(destinations.map((item) => item.Icon)).size).toBe(
    destinations.length,
  );
});

test.each(["head", "member"])(
  "%s retains Office petty cash inside More with distinct Banknote icon",
  (role) => {
    const destinations = moreDestinations(role, () => true, true);
    const pettyCash = destinations.find((item) => item.id === "petty_cash");

    expect(pettyCash).toBeDefined();
    expect(pettyCash?.Icon).toBe(Banknote);
    expect(new Set(destinations.map((item) => item.Icon)).size).toBe(
      destinations.length,
    );
  },
);

test("More destinations deduplicate Tab 2 Reviews for Head/Accounting and surface Notifications", () => {
  const head = moreDestinations("head", () => true, true);
  expect(head.map((item) => item.id)).toContain("petty_cash");
  expect(head.map((item) => item.id)).toContain("budget");
  expect(head.map((item) => item.id)).toContain("reports");
  expect(head.find((item) => item.id === "reviews")).toBeUndefined();
  expect(head.find((item) => item.id === "notifications")?.route).toEqual({
    name: "inbox",
  });

  const member = moreDestinations("member", () => true, true);
  expect(member.map((item) => item.id)).toContain("petty_cash");
  expect(member.map((item) => item.id)).toContain("reviews");

  const accounting = moreDestinations("accounting_staff", () => true, true);
  expect(accounting.find((item) => item.id === "reviews")).toBeUndefined();
  expect(accounting.find((item) => item.id === "notifications")).toBeDefined();
});
