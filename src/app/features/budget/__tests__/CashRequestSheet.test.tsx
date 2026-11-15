import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CashRequestSheet } from "../CashRequestSheet";
import { ToastProvider } from "../../../components/ui/Toast";
import {
  clearAllFormDrafts,
  formDraftKey,
  writeFormDraft,
} from "../../../shared/formDraftMemory";
import { draftStore } from "../../../../platform/draftStore";
import { asServiceFile, chooseFiles } from "../../../../platform/files";
import {
  createContextualCashRequest,
  uploadCashRequestAttachment,
} from "../../../../core/web/app/features/budget/services/budgetService";

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "lead-1", full_name: "Andres Manili", org_id: "office-1" },
  }),
}));

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("../../../../platform/files", () => ({
  chooseFiles: jest.fn(),
  asServiceFile: jest.fn(),
}));

jest.mock("../../../../core/web/app/features/budget/services/budgetService", () => ({
  createContextualCashRequest: jest.fn(),
  resubmitContextualCashRequest: jest.fn(),
  uploadCashRequestAttachment: jest.fn(),
}));

jest.mock("../../../../core/web/app/features/budget/services/pettyCashVoucherService", () => ({
  createVoucherCashRequest: jest.fn(),
}));

const baseContext = {
  taskId: "task-1",
  supportsItemizedCash: false,
  lines: [{ id: "line-1", particular: "Office Supplies", available: 5000 }],
} as never;

beforeEach(() => {
  clearAllFormDrafts();
  jest.clearAllMocks();
  jest.mocked(draftStore.get).mockResolvedValue(null);
  jest.mocked(draftStore.set).mockResolvedValue(undefined);
  jest.mocked(draftStore.remove).mockResolvedValue(undefined);
});

test("CashRequestSheet lets users attach, change, and remove a supporting document", async () => {
  const firstFile = {
    uri: "file:///tmp/quote.pdf",
    name: "quote.pdf",
    type: "application/pdf",
    size: 2048,
    arrayBuffer: async () => new ArrayBuffer(2048),
  };
  const secondFile = {
    uri: "file:///tmp/revised.png",
    name: "revised.png",
    type: "image/png",
    size: 2 * 1024 * 1024,
    arrayBuffer: async () => new ArrayBuffer(10),
  };
  jest.mocked(chooseFiles)
    .mockResolvedValueOnce([firstFile])
    .mockResolvedValueOnce([secondFile]);

  await render(
    <CashRequestSheet
      orgId="office-1"
      context={baseContext}
      readOnly={false}
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Attach supporting document" }),
  );
  expect(await screen.findByText("Supporting document")).toBeOnTheScreen();
  expect(screen.getByText("quote.pdf")).toBeOnTheScreen();
  expect(screen.getByText("2 KB")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Change file" }));
  expect(await screen.findByText("revised.png")).toBeOnTheScreen();
  expect(screen.getByText("2.0 MB")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Remove" }));
  expect(
    await screen.findByRole("button", { name: "Attach supporting document" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("revised.png")).toBeNull();
});

test("CashRequestSheet surfaces upload validation errors without duplicating the created cash request on retry", async () => {
  const firstFile = {
    uri: "file:///tmp/bad.bin",
    name: "bad.bin",
    type: "application/octet-stream",
    size: 512,
    arrayBuffer: async () => new ArrayBuffer(512),
  };
  const validFile = {
    uri: "file:///tmp/invoice.pdf",
    name: "invoice.pdf",
    type: "application/pdf",
    size: 4096,
    arrayBuffer: async () => new ArrayBuffer(4096),
  };
  jest.mocked(chooseFiles)
    .mockResolvedValueOnce([firstFile])
    .mockResolvedValueOnce([validFile]);
  jest.mocked(asServiceFile).mockResolvedValue({ name: "file" } as unknown as File);
  jest.mocked(createContextualCashRequest).mockResolvedValue("req-1");
  jest.mocked(uploadCashRequestAttachment)
    .mockRejectedValueOnce(new Error("mime type application/octet-stream is not supported"))
    .mockResolvedValueOnce("att-1");

  const onClose = jest.fn();
  const onSaved = jest.fn(async () => {});

  writeFormDraft(formDraftKey("lead-1", "cash-request.task-1.root.new"), {
    lines: [{ allocationLineId: "line-1", amount: 200 }],
    purpose: "Purchase folders",
    date: "2026-11-30",
  });

  await render(
    <CashRequestSheet
      orgId="office-1"
      context={baseContext}
      readOnly={false}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Attach supporting document" }),
  );
  await screen.findByText("bad.bin");
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );

  expect(
    await screen.findByText(
      "This file type isn't supported. Choose a JPEG, PNG, PDF, or supported document.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Check before retrying/)).toBeNull();
  expect(createContextualCashRequest).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByRole("button", { name: "Change file" }));
  await screen.findByText("invoice.pdf");
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );

  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(createContextualCashRequest).toHaveBeenCalledTimes(1);
  expect(uploadCashRequestAttachment).toHaveBeenCalledTimes(2);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("CashRequestSheet constrains Needed by to taskSchedule and blocks expired tasks", async () => {
  const schedule = { start: "2026-11-18", end: "2026-11-25" };

  writeFormDraft(formDraftKey("lead-1", "cash-request.task-1.root.new"), {
    lines: [{ allocationLineId: "line-1", amount: 200 }],
    purpose: "Early purchase",
    date: "2026-11-17",
  });

  const earlyView = await render(
    <CashRequestSheet
      orgId="office-1"
      context={baseContext}
      taskSchedule={schedule}
      readOnly={false}
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );

  expect(
    screen.getByText(
      "Choose a date within the task schedule (Nov 18, 2026 – Nov 25, 2026).",
    ),
  ).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );
  expect(
    await screen.findByText(
      "Needed-by date must be on or after the task start date (Nov 18, 2026).",
    ),
  ).toBeOnTheScreen();
  expect(createContextualCashRequest).not.toHaveBeenCalled();

  await earlyView.unmount();

  clearAllFormDrafts();
  writeFormDraft(formDraftKey("lead-1", "cash-request.task-1.root.new"), {
    lines: [{ allocationLineId: "line-1", amount: 200 }],
    purpose: "Late purchase",
    date: "2026-11-26",
  });

  const lateView = await render(
    <CashRequestSheet
      orgId="office-1"
      context={baseContext}
      taskSchedule={schedule}
      readOnly={false}
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );
  expect(
    await screen.findByText(
      "Needed-by date must be on or before the task due date (Nov 25, 2026).",
    ),
  ).toBeOnTheScreen();
  expect(createContextualCashRequest).not.toHaveBeenCalled();

  await lateView.unmount();

  clearAllFormDrafts();
  await render(
    <CashRequestSheet
      orgId="office-1"
      context={baseContext}
      taskSchedule={{ start: "2025-01-01", end: "2025-01-10" }}
      readOnly={false}
      onClose={jest.fn()}
      onSaved={jest.fn(async () => {})}
    />,
  );

  expect(
    screen.getByText(
      "The task's scheduled dates have already passed. Update the task dates before requesting cash.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Needed by" }).props.accessibilityState
      ?.disabled,
  ).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );
  expect(createContextualCashRequest).not.toHaveBeenCalled();
});

test("CashRequestSheet shows success toast only after confirmed submission and attachment upload", async () => {
  const badFile = {
    uri: "file:///tmp/bad.bin",
    name: "bad.bin",
    type: "application/octet-stream",
    size: 512,
    arrayBuffer: async () => new ArrayBuffer(512),
  };
  const validFile = {
    uri: "file:///tmp/invoice.pdf",
    name: "invoice.pdf",
    type: "application/pdf",
    size: 4096,
    arrayBuffer: async () => new ArrayBuffer(4096),
  };
  jest.mocked(chooseFiles)
    .mockResolvedValueOnce([badFile])
    .mockResolvedValueOnce([validFile]);
  jest.mocked(asServiceFile).mockResolvedValue({ name: "file" } as unknown as File);
  jest.mocked(createContextualCashRequest).mockResolvedValue("req-toast");
  jest.mocked(uploadCashRequestAttachment)
    .mockRejectedValueOnce(new Error("mime type application/octet-stream is not supported"))
    .mockResolvedValueOnce("att-toast");

  writeFormDraft(formDraftKey("lead-1", "cash-request.task-1.root.new"), {
    lines: [{ allocationLineId: "line-1", amount: 250 }],
    purpose: "Stationery",
    date: "2026-11-22",
  });

  await render(
    <ToastProvider>
      <CashRequestSheet
        orgId="office-1"
        context={baseContext}
        taskSchedule={{ start: "2026-11-18", end: "2026-11-25" }}
        readOnly={false}
        onClose={jest.fn()}
        onSaved={jest.fn(async () => {})}
      />
    </ToastProvider>,
  );

  await fireEvent.press(
    screen.getByRole("button", { name: "Attach supporting document" }),
  );
  await screen.findByText("bad.bin");
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );

  await screen.findByText(
    "This file type isn't supported. Choose a JPEG, PNG, PDF, or supported document.",
  );
  expect(screen.queryByText("Cash request submitted.")).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Change file" }));
  await screen.findByText("invoice.pdf");
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit cash request" }),
  );

  expect(await screen.findByText("Cash request submitted.")).toBeOnTheScreen();
});
