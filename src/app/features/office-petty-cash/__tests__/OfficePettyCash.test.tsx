import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking, Platform, StyleSheet } from "react-native";
import { OfficePettyCash } from "../OfficePettyCash";

let mockProfile = {
  id: "staff-1",
  role: "accounting_staff",
  org_id: "office-a",
  is_active: true,
};
let mockOrg: Record<string, unknown> = {
  id: "office-a",
  name: "Finance Office",
  head_user_id: "head-1",
};

const mockRpc = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const signedUrl = "https://example.test/signed-receipt.pdf";
const mockSignedUrl =
  jest.fn<
    (...args: unknown[]) => Promise<{
      data: { signedUrl: string } | null;
      error: Error | null;
    }>
  >();

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: mockProfile,
    organization: mockOrg,
  }),
}));

jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => mockSignedUrl(...args),
      }),
    },
  },
}));

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    get: async () => undefined,
    set: async () => undefined,
    remove: async () => undefined,
  },
}));

const sampleSnapshot = {
  available: 18250,
  reserved: 6750,
  outstanding: 5000,
  replenishable: 5000,
  requests: [
    {
      id: "req-1",
      requester: "member-1",
      requesterName: "Juan Dela Cruz",
      purpose: "Field Supplies for Barangay Outreach",
      amount: 3500,
      spent: 0,
      status: "approved",
      receipts: [],
    },
    {
      id: "req-2",
      requester: "member-2",
      requesterName: "Maria Santos",
      purpose: "Printing & ID Lanyards",
      amount: 3250,
      spent: 3100,
      status: "receipt_approved",
      canSettle: true,
      receipts: [
        {
          vendor: "Copy Center",
          number: "OR-001",
          date: "2026-11-15",
          path: "req-2/r1.pdf",
        },
        {
          vendor: "Lanyard Co",
          number: "OR-002",
          date: "2026-11-15",
          path: "req-2/r2.pdf",
        },
      ],
    },
    {
      id: "req-3",
      requester: "staff-1",
      requesterName: "Accounting Staff",
      purpose: "Notarial & Postage Stamps",
      amount: 1750,
      spent: 0,
      status: "released",
      receipts: [],
    },
    {
      id: "req-4",
      requester: "staff-1",
      requesterName: "Accounting Staff",
      purpose: "Office Toner Cartridges",
      amount: 3800,
      spent: 3800,
      status: "receipt_approved",
      canSettle: false,
      settlementBlocked: true,
      headNotified: true,
      receipts: [
        {
          vendor: "Ink Hub",
          number: "OR-099",
          date: "2026-11-16",
          path: "req-4/r1.pdf",
        },
      ],
    },
  ],
};

beforeEach(() => {
  mockProfile = {
    id: "staff-1",
    role: "accounting_staff",
    org_id: "office-a",
    is_active: true,
  };
  mockOrg = {
    id: "office-a",
    name: "Finance Office",
    head_user_id: "head-1",
  };
  mockRpc.mockReset();
  mockSignedUrl.mockReset();
  mockSignedUrl.mockResolvedValue({ data: { signedUrl }, error: null });
  mockRpc.mockResolvedValue({ data: sampleSnapshot, error: null });
});

test("compact fast-action petty cash renders Hero pods, clean status pills, filters, receipt chips, and role-gated actions", async () => {
  const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  try {
    await render(<OfficePettyCash office="office-a" />);

    expect(await screen.findByText("Office revolving fund")).toBeOnTheScreen();
    expect(screen.getByText("₱18,250.00")).toBeOnTheScreen();
    expect(screen.getByText("₱6,750.00")).toBeOnTheScreen();
    expect(screen.getByText("Outstanding ₱5,000.00")).toBeOnTheScreen();
    expect(screen.getByText("Can replenish ₱5,000.00")).toBeOnTheScreen();

    expect(screen.getByRole("button", { name: "Request cash" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Replenish" })).toBeOnTheScreen();
    expect(screen.getByText("Fund requests")).toBeOnTheScreen();
    expect(screen.getByText("4 items")).toBeOnTheScreen();

    // Clean pill Status without crescent borderLeftWidth
    const statusPill = screen.getByLabelText("Status: Authorized");
    const pillStyle = StyleSheet.flatten(statusPill.props.style);
    expect(pillStyle.borderRadius).toBe(999);
    expect(pillStyle.borderLeftWidth).toBeUndefined();

    // Role & self-settlement constraints enforced cleanly
    expect(
      screen.getByRole("button", {
        name: "Record cash release for Field Supplies for Barangay Outreach",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Settle petty cash for Printing & ID Lanyards",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", {
        name: "Settle petty cash for Office Toner Cartridges",
      }),
    ).toBeNull();
    expect(
      screen.getByText(/Staff cannot settle their own petty cash/i),
    ).toBeOnTheScreen();

    // Filter chips narrow requests quickly
    await fireEvent.press(screen.getByRole("button", { name: "Action needed (3)" }));
    expect(screen.getByText("3 items")).toBeOnTheScreen();
    expect(screen.queryByText("Office Toner Cartridges")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "All (4)" }));
    expect(screen.getByText("4 items")).toBeOnTheScreen();

    // Compact receipt chip triggers signed URL read
    await fireEvent.press(
      screen.getByRole("button", { name: "View receipt 1 for Printing & ID Lanyards" }),
    );
    expect(mockSignedUrl).toHaveBeenCalledWith("req-2/r1.pdf", 60);
    expect(openSpy).toHaveBeenCalledWith(signedUrl);
  } finally {
    openSpy.mockRestore();
  }
});

describe("receipt links in the browser", () => {
  const replace = jest.fn();
  const close = jest.fn();
  const open = jest.fn<Window["open"]>();
  const pressReceipt = async () => {
    await render(<OfficePettyCash office="office-a" />);
    await fireEvent.press(
      await screen.findByRole("button", {
        name: "View receipt 2 for Printing & ID Lanyards",
      }),
    );
  };

  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", "web");
    Object.defineProperty(window, "open", {
      configurable: true,
      writable: true,
      value: open,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "open");
    jest.restoreAllMocks();
  });

  test("reserves a tab before requesting the selected private file URL", async () => {
    const tab = { opener: window, closed: false, close, location: { replace } };
    open.mockReturnValue(tab as unknown as Window);
    let resolveSignedUrl!: (result: Awaited<ReturnType<typeof mockSignedUrl>>) => void;
    mockSignedUrl.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          expect(open).toHaveBeenCalledWith("about:blank", "_blank");
          expect(tab.opener).toBeNull();
          resolveSignedUrl = resolve;
        }),
    );

    await pressReceipt();
    expect(mockSignedUrl).toHaveBeenCalledWith("req-2/r2.pdf", 60);
    expect(replace).not.toHaveBeenCalled();
    await act(async () => resolveSignedUrl({ data: { signedUrl }, error: null }));
    expect(replace).toHaveBeenCalledWith(signedUrl);
    expect(close).not.toHaveBeenCalled();
  });

  test("explains what to do when the browser blocks the tab", async () => {
    open.mockReturnValue(null);
    await pressReceipt();
    expect(await screen.findByText(/Allow pop-ups for eFlow/)).toBeOnTheScreen();
    expect(mockSignedUrl).not.toHaveBeenCalled();
  });

  test("closes the reserved tab if the signed URL is unavailable", async () => {
    open.mockReturnValue({ close, location: { replace } } as unknown as Window);
    mockSignedUrl.mockResolvedValueOnce({ data: null, error: null });
    await pressReceipt();
    expect(await screen.findByText("This receipt is unavailable.")).toBeOnTheScreen();
    expect(close).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
});

test("Member sees neither Replenish nor Accounting-only settlement controls", async () => {
  mockProfile = {
    id: "member-1",
    role: "member",
    org_id: "office-a",
    is_active: true,
  };
  await render(<OfficePettyCash office="office-a" />);

  expect(await screen.findByText("Field Supplies for Barangay Outreach")).toBeOnTheScreen();
  expect(screen.queryByText(/Can replenish/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Replenish" })).toBeNull();
  expect(
    screen.queryByRole("button", {
      name: "Record cash release for Field Supplies for Barangay Outreach",
    }),
  ).toBeNull();
  expect(
    screen.getByRole("button", {
      name: "Cancel request for Field Supplies for Barangay Outreach",
    }),
  ).toBeOnTheScreen();
});
