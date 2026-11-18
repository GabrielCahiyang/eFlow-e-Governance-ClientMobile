import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { InboxCountsContext } from "../../notifications/inboxCountsContext";
import { MoreScreen } from "../MoreScreen";
import { NativeBottomNavigation } from "../NativeBottomNavigation";

let mockRole = "accounting_staff";
let mockHasOffice = true;
let mockOfficeName = "Engineering Office";
let mockCustomRole: { label: string } | null = null;
const mockSignOut = jest.fn(async () => undefined);
const mockUnread = [{ id: "c1", unread: true, archived: false }];

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: {
      id: "actor-1",
      full_name: "Elena Reyes",
      email: "elena.reyes@eflow.gov.ph",
      role: mockRole,
      org_id: mockHasOffice ? "office-a" : undefined,
    },
    organization: mockHasOffice
      ? { id: "office-a", name: mockOfficeName }
      : undefined,
    can: () => true,
    customRole: mockCustomRole,
    signOut: mockSignOut,
  }),
}));

jest.mock("../../communication", () => ({
  useConversationDirectory: () => ({ data: mockUnread }),
}));

beforeEach(() => {
  mockRole = "accounting_staff";
  mockHasOffice = true;
  mockOfficeName = "Engineering Office";
  mockCustomRole = null;
  mockSignOut.mockClear();
});

test("More shows the assigned custom name while retaining base-role destinations", async () => {
  mockCustomRole = { label: "Disbursement Clerk" };
  await render(<MoreScreen navigate={jest.fn()} />);
  expect(screen.getByText("Disbursement Clerk")).toBeOnTheScreen();
  expect(screen.queryByText("Accounting Staff")).toBeNull();
  expect(screen.getByRole("button", { name: "Office budget & releases" })).toBeOnTheScreen();
  expect(screen.queryByText(/manage roles|user management/i)).toBeNull();
});

test("More removes the LEDIPO badge and keeps the actor's role and Profile destination", async () => {
  mockOfficeName = "LEDIPO";
  const navigate = jest.fn();
  await render(<MoreScreen navigate={navigate} />);
  expect(screen.queryByText(/ledipo/i)).toBeNull();
  expect(screen.getByText("Accounting Staff")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Open profile" }));
  expect(navigate).toHaveBeenCalledWith({ name: "profile" });
});

test("Accounting Staff More renders Identity hero, grouped Work/Communication/Account lists and routes cleanly", async () => {
  const navigate = jest.fn();
  await render(
    <InboxCountsContext.Provider
      value={{
        data: { all: 3, work: 2, messages: 0, finance: 1, collaboration: 0 },
        refresh: async () => {},
        refreshIfStale: async () => {},
      }}
    >
      <MoreScreen navigate={navigate} />
    </InboxCountsContext.Provider>,
  );

  expect(screen.getByText("Elena Reyes")).toBeOnTheScreen();
  expect(screen.getByText("elena.reyes@eflow.gov.ph")).toBeOnTheScreen();
  expect(screen.getByText("Accounting Staff")).toBeOnTheScreen();
  expect(screen.getByText("Engineering Office")).toBeOnTheScreen();

  expect(screen.getByRole("header", { name: "Work" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Communication" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Account & preferences" })).toBeOnTheScreen();

  expect(screen.getByRole("button", { name: "Office petty cash" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Assigned reviews" })).toBeNull();
  expect(screen.getByRole("button", { name: "Office budget & releases" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Projects" })).toBeOnTheScreen();

  expect(screen.getByRole("button", { name: "Messages" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Notifications" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Announcements" })).toBeNull();
  expect(screen.getByTestId("messages-unread-indicator")).toBeOnTheScreen();
  expect(screen.getByTestId("notifications-unread-indicator")).toBeOnTheScreen();
  expect(screen.getByText("4 unread")).toBeOnTheScreen();

  expect(screen.getByRole("button", { name: "Profile" })).toBeOnTheScreen();
  expect(screen.queryByText(/professional profile|professional record|PDS uploads/i)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Profile" }));
  expect(navigate).toHaveBeenLastCalledWith({ name: "profile" });
  expect(screen.queryByRole("button", { name: "Notification alerts" })).toBeNull();
  expect(screen.getByRole("button", { name: "Password & security" })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Open profile" }));
  expect(navigate).toHaveBeenCalledWith({ name: "profile" });

  await fireEvent.press(screen.getByRole("button", { name: "Office petty cash" }));
  expect(navigate).toHaveBeenCalledWith({
    name: "financial_reviews",
    recordType: "office_petty_cash",
  });

  await fireEvent.press(screen.getByRole("button", { name: "Office budget & releases" }));
  expect(navigate).toHaveBeenCalledWith({ name: "accounting_releases" });

  await fireEvent.press(screen.getByRole("button", { name: "Notifications" }));
  expect(navigate).toHaveBeenCalledWith({ name: "inbox" });

  await fireEvent.press(screen.getByRole("button", { name: "Password & security" }));
  expect(navigate).toHaveBeenCalledWith({
    name: "settings",
    view: "security",
    title: "Security",
  });
});

test.each([
  ["head", ["Office petty cash", "Office Budget", "Analytics"], ["Assigned reviews", "Office budget & releases"]],
  ["member", ["Office petty cash", "Assigned reviews"], ["Office Budget", "Office budget & releases"]],
])(
  "%s sees role-appropriate Work & Office items in More",
  async (role, expectedWork, unexpectedWork) => {
    mockRole = role;
    await render(<MoreScreen navigate={jest.fn()} />);
    for (const label of expectedWork) {
      expect(screen.getByRole("button", { name: label })).toBeOnTheScreen();
    }
    for (const label of unexpectedWork) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
  },
);

test("Appearance inline switcher updates color theme preference in More", async () => {
  await render(
    <AppearanceProvider>
      <MoreScreen navigate={jest.fn()} />
    </AppearanceProvider>,
  );

  const darkOption = screen.getByRole("radio", { name: "Dark theme" });
  expect(darkOption.props.accessibilityState.checked).toBe(false);

  await fireEvent.press(darkOption);
  expect(
    screen.getByRole("radio", { name: "Dark theme" }).props.accessibilityState.checked,
  ).toBe(true);
});

test("Glassy icon-only navbar exposes Accounting on Tab 4 for Accounting Staff and triggers navigation", async () => {
  const onSelect = jest.fn();
  await render(
    <NativeBottomNavigation
      role="accounting_staff"
      selected="accounting"
      onSelect={onSelect}
    />,
  );

  expect(screen.getByTestId("nav-glass-sheen")).toBeOnTheScreen();
  expect(
    screen.getAllByRole("tab").map((tab) => tab.props.accessibilityLabel),
  ).toEqual(["Home", "Reviews", "My Work", "Accounting", "More"]);
  expect(
    screen.getByRole("tab", { name: "Accounting" }).props.accessibilityState.selected,
  ).toBe(true);

  await fireEvent(screen.getByTestId("tab-track"), "layout", {
    nativeEvent: { layout: { width: 350 } },
  });
  const indicatorStyle = StyleSheet.flatten(
    screen.getByTestId("tab-selection-indicator").props.style,
  );
  expect(indicatorStyle.backgroundColor).toBe("#00006b");
  expect(indicatorStyle.width).toBe(52);
  expect(indicatorStyle.height).toBe(52);
  expect(indicatorStyle.borderRadius).toBe(26);

  await fireEvent.press(screen.getByRole("tab", { name: "More" }));
  expect(onSelect).toHaveBeenCalledWith("more");
});
