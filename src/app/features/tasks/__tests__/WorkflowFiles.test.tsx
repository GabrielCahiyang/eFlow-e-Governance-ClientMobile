import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { clearDisplayCache } from "../../../shared/displayCache";
import { WorkflowFiles } from "../WorkflowFiles";
import type { InspectorFile } from "../../../../core/web/app/features/task-inspector/services/inspectorFileService";
const mockFetch = jest.fn<(id: string) => Promise<InspectorFile[]>>();
const mockOpen = jest.fn<(file: InspectorFile) => Promise<string>>();
const mockOpenUrl =
  jest.fn<(resolve: () => Promise<string>) => Promise<boolean>>();
let mockActor = "actor-a";
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: mockActor ? { id: mockActor } : undefined }),
}));
jest.mock(
  "../../../../core/web/app/features/task-inspector/services/inspectorFileService",
  () => ({
    fetchInspectorFiles: (id: string) => mockFetch(id),
    openInspectorFile: (file: InspectorFile) => mockOpen(file),
  }),
);
jest.mock("../../../../platform/files", () => ({
  openFileUrl: (resolve: () => Promise<string>) => mockOpenUrl(resolve),
}));
const files: InspectorFile[] = [
  {
    id: "task-a",
    name: "Task completion.pdf",
    path: "private/task/submitted.pdf",
    bucket: "task-attachments",
    source: "Task · Submission 2 (approved)",
    uploader: "QA Lead",
    at: "2026-11-18",
    restriction:
      "Formal evidence · Existing review and immutability rules apply",
  },
  {
    id: "task-progress-p",
    name: "Task progress.jpg",
    path: "private/task/progress.jpg",
    bucket: "task-comment-attachments",
    source: "Task · Progress update",
    uploader: "QA Worker",
    at: "2026-11-17",
    restriction: "Progress evidence · Existing workflow restrictions apply",
  },
  {
    id: "sub-child",
    name: "Subtask evidence.pdf",
    path: "private/child/submitted.pdf",
    bucket: "task-attachments",
    source: "Inspect site · Submission 1 (pending)",
    uploader: "QA Subtask Lead",
    at: "2026-11-18",
    restriction:
      "Formal evidence · Existing review and immutability rules apply",
  },
];
beforeEach(() => {
  clearDisplayCache("access");
  mockActor = "actor-a";
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(files);
  mockOpen.mockResolvedValue("https://signed.example/evidence");
  mockOpenUrl.mockImplementation(async (resolve) => {
    await resolve();
    return true;
  });
});
test("shows Web's task/subtask workflow evidence, original provenance, and opens the original attachment", async () => {
  await render(<WorkflowFiles taskId="root-a" />);
  expect(await screen.findByText("Task completion.pdf")).toBeOnTheScreen();
  expect(screen.getByText("Subtask evidence.pdf")).toBeOnTheScreen();
  expect(screen.getByText("Task · Submission 2 (approved)")).toBeOnTheScreen();
  expect(
    screen.getByText("Inspect site · Submission 1 (pending)"),
  ).toBeOnTheScreen();
  expect(screen.getByText("3 files")).toBeOnTheScreen();
  expect(
    screen.queryByText(/Parent task attachments|Upload a project document/),
  ).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: /Open Task progress.jpg/ }),
  );
  expect(mockOpen).toHaveBeenCalledWith(files[1]);
  expect(mockFetch).toHaveBeenCalledWith("root-a");
});
test("a task or actor change removes prior evidence immediately and ignores a late read", async () => {
  let resolveOld!: (files: InspectorFile[]) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const view = await render(<WorkflowFiles taskId="root-a" />);
  mockActor = "actor-b";
  mockFetch.mockResolvedValue([]);
  await view.rerender(<WorkflowFiles taskId="root-b" />);
  expect(
    await screen.findByText("No authorized workflow attachments yet."),
  ).toBeOnTheScreen();
  resolveOld(files);
  await waitFor(() =>
    expect(screen.queryByText("Task completion.pdf")).toBeNull(),
  );
  expect(mockFetch).toHaveBeenLastCalledWith("root-b");
});
test("denied/failed reads show an error and retry; missing sign-in never loads files", async () => {
  mockFetch.mockRejectedValueOnce(new Error("Workflow file access denied"));
  const view = await render(<WorkflowFiles taskId="root-a" />);
  await screen.findByRole("alert");
  expect(screen.queryByText("Task completion.pdf")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Task completion.pdf")).toBeOnTheScreen();
  mockActor = "";
  mockFetch.mockClear();
  await view.rerender(<WorkflowFiles taskId="root-a" />);
  expect(screen.getByText("Files unavailable")).toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
});
test("failed file opening reports an error without claiming success", async () => {
  mockOpen.mockRejectedValueOnce(new Error("Evidence access changed"));
  await render(<WorkflowFiles taskId="root-a" />);
  await screen.findByText("Task completion.pdf");
  await fireEvent.press(
    screen.getByRole("button", { name: /Open Task completion.pdf/ }),
  );
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
});
