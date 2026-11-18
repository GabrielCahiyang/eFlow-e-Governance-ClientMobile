import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { clearDisplayCache } from "../../../shared/displayCache";
import { ProjectFiles } from "../ProjectFiles";
import type { ProjectFileSnapshot } from "../../../../core/web/app/features/project-files/types";

const mockFetchProjectFiles =
  jest.fn<(project: string, task?: string) => Promise<ProjectFileSnapshot>>();
let mockSavedUpload: unknown = null;
const mockConfirm = jest.fn<() => Promise<boolean>>();
jest.mock("../../../shared/confirm", () => ({
  confirmAction: () => mockConfirm(),
}));
const mockChangeDocument = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSaveDocument = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock("../projectDocumentActions", () => ({
  documentUploadScope: (scope: { project: string; task?: string }) =>
    `project-document:${scope.project}:${scope.task || "library"}`,
  changeProjectDocument: (...args: unknown[]) => mockChangeDocument(...args),
  saveProjectDocument: (...args: unknown[]) => mockSaveDocument(...args),
}));
const mockOpenProjectFile = jest.fn<(file: unknown) => Promise<string>>();

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "user-1", name: "QA User" } }),
}));

jest.mock(
  "../../../../core/web/app/features/project-files/services/projectFileService",
  () => ({
    fetchProjectFiles: (project: string, task?: string) =>
      mockFetchProjectFiles(project, task),
    openProjectFile: (file: unknown) => mockOpenProjectFile(file),
  }),
);

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    get: jest.fn(async () => mockSavedUpload),
    set: jest.fn(async () => {}),
    remove: jest.fn(async () => {}),
  },
}));
jest.mock("../../../components/ui/SelectionSheet", () => ({
  SelectionSheet: ({ open, options, onSelect }: any) => {
    const { View, Button } = require("react-native");
    return open ? (
      <View>
        {options.map((option: any) => (
          <Button
            key={option.id}
            title={option.title}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    ) : null;
  },
}));

const sampleSnapshot: ProjectFileSnapshot = {
  can_write: true,
  files: [
    {
      linked: true,
      id: "file-pdf",
      project_id: "proj-1",
      project_kind: "office",
      uploader_id: "u-1",
      uploader_name: "Juan Dela Cruz",
      initial_task_id: "task-1",
      file_name: "Q4_Budget_Plan.pdf",
      file_size: 1500 * 1024,
      mime_type: "application/pdf",
      sha256: "abc",
      object_path: "proj-1/budget.pdf",
      state: "ready",
      created_at: "2026-11-14T08:00:00Z",
      committed_at: "2026-11-14T08:01:00Z",
    },
    {
      linked: true,
      id: "file-xlsx",
      project_id: "proj-1",
      project_kind: "office",
      uploader_id: "u-2",
      uploader_name: "Maria Santos",
      initial_task_id: "task-1",
      file_name: "Inspection_Checklist.xlsx",
      file_size: 318 * 1024,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sha256: "def",
      object_path: "proj-1/checklist.xlsx",
      state: "ready",
      created_at: "2026-11-15T08:00:00Z",
      committed_at: "2026-11-15T08:01:00Z",
    },
    {
      linked: true,
      id: "file-img",
      project_id: "proj-1",
      project_kind: "office",
      uploader_id: "u-3",
      uploader_name: "Carlo Mendoza",
      initial_task_id: "task-1",
      file_name: "North_Gate.jpg",
      file_size: 2800 * 1024,
      mime_type: "image/jpeg",
      sha256: "ghi",
      object_path: "proj-1/photo.jpg",
      state: "ready",
      created_at: "2026-11-16T08:00:00Z",
      committed_at: "2026-11-16T08:01:00Z",
    },
    {
      linked: true,
      id: "file-pending",
      project_id: "proj-1",
      project_kind: "office",
      uploader_id: "u-3",
      uploader_name: "Carlo Mendoza",
      initial_task_id: "task-1",
      file_name: "Draft_Permit.pdf",
      file_size: 400 * 1024,
      mime_type: "application/pdf",
      sha256: "jkl",
      object_path: "proj-1/permit.pdf",
      state: "pending",
      created_at: "2026-11-17T08:00:00Z",
      committed_at: null,
    },
  ],
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockSavedUpload = null;
  mockConfirm.mockResolvedValue(true);
  mockChangeDocument.mockResolvedValue(undefined);
  mockSaveDocument.mockResolvedValue({});
  clearDisplayCache();
  await AsyncStorage.removeItem("eflow.appearance");
});

describe("ProjectFiles", () => {
  test("renders hero metrics, MIME-coded Card v2 rows, search/filter chips, opens ready files, and never renders Manage library files", async () => {
    mockFetchProjectFiles.mockResolvedValue(sampleSnapshot);
    mockOpenProjectFile.mockResolvedValue("https://signed.example/file.pdf");
    const openUrlSpy = jest
      .spyOn(ReactNative.Linking, "openURL")
      .mockResolvedValue(undefined);
    const dimSpy = jest.spyOn(ReactNative.Dimensions, "get").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });

    try {
      const view = await render(
        <ProjectFiles
          projectId="proj-1"
          taskId="task-1"
          contextTitle="Q4 Community Assembly"
          eyebrow="Parent task attachments"
          scopeNote="Parent task files shown here. Files submitted specifically for this subtask live in Evidence & review."
          onManage={jest.fn()}
        />,
      );

      expect(await view.findByText("Q4 Community Assembly")).toBeOnTheScreen();
      expect(view.getByText("Parent task attachments")).toBeOnTheScreen();
      expect(view.getByLabelText("Library count: 4 files")).toBeOnTheScreen();
      expect(view.getByLabelText("Ready size: 4.5 MB")).toBeOnTheScreen();
      expect(
        view.getByText(
          "Parent task files shown here. Files submitted specifically for this subtask live in Evidence & review.",
        ),
      ).toBeOnTheScreen();

      // Side-by-side hero pods at normal font scale
      expect(view.getByLabelText("Library count: 4 files").parent).toHaveStyle({
        flexDirection: "row",
      });

      // Card header & semantic status pills
      expect(view.getByText("Attached files")).toBeOnTheScreen();
      expect(view.getByText("3 ready · 1 pending")).toBeOnTheScreen();
      expect(view.getByText("Pending upload")).toBeOnTheScreen();
      expect(view.getByText("Q4_Budget_Plan.pdf")).toBeOnTheScreen();

      // Manage library files / Open Web are omitted
      expect(view.queryByText("Manage library files")).toBeNull();
      expect(view.queryByText("Open Web")).toBeNull();
      expect(view.queryByText("Manage on eFlow Web")).toBeNull();

      // Filter to Images and reset via empty search
      await fireEvent.press(view.getByRole("button", { name: "Images" }));
      expect(view.getByText("North_Gate.jpg")).toBeOnTheScreen();
      expect(view.queryByText("Q4_Budget_Plan.pdf")).toBeNull();

      await fireEvent.changeText(
        view.getByLabelText("Search files or uploader…"),
        "nonexistent",
      );
      expect(view.getByText("No matching files")).toBeOnTheScreen();
      await fireEvent.press(
        view.getByRole("button", { name: "Reset filters" }),
      );
      expect(view.getByText("Q4_Budget_Plan.pdf")).toBeOnTheScreen();

      // Pending file is disabled
      const pendingButton = view.getByRole("button", {
        name: /Draft_Permit\.pdf/,
      });
      expect(pendingButton).toBeDisabled();

      // Ready file opens signed URL
      await fireEvent.press(
        view.getByRole("button", { name: /Q4_Budget_Plan\.pdf/ }),
      );
      await waitFor(() => {
        expect(mockOpenProjectFile).toHaveBeenCalledTimes(1);
        expect(openUrlSpy).toHaveBeenCalledWith(
          "https://signed.example/file.pdf",
        );
      });
    } finally {
      openUrlSpy.mockRestore();
      dimSpy.mockRestore();
    }
  });

  test("stacks hero pods at 200% fontScale, supports embedded and dark mode, and handles loading, error, and empty states", async () => {
    let resolveFiles!: (value: ProjectFileSnapshot) => void;
    mockFetchProjectFiles.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFiles = resolve;
        }),
    );

    const loadingView = await render(
      <ProjectFiles projectId="proj-1" taskId="task-loading" />,
    );
    expect(loadingView.getByTestId("skeleton-files")).toBeOnTheScreen();
    resolveFiles({ can_write: false, files: [] });

    await waitFor(() => {
      expect(loadingView.getByText("No files attached yet")).toBeOnTheScreen();
    });
    expect(loadingView.queryByText("Manage on eFlow Web")).toBeNull();
    await loadingView.unmount();

    clearDisplayCache();
    mockFetchProjectFiles.mockRejectedValueOnce(new Error("Network failure"));
    const errorView = await render(
      <ProjectFiles projectId="proj-1" taskId="task-err" />,
    );
    expect(await errorView.findByRole("alert")).toBeOnTheScreen();
    mockFetchProjectFiles.mockResolvedValueOnce(sampleSnapshot);
    await fireEvent.press(errorView.getByRole("button", { name: "Retry" }));
    expect(await errorView.findByText("Q4_Budget_Plan.pdf")).toBeOnTheScreen();
    await errorView.unmount();

    // 200% fontScale + dark mode + embedded mode
    clearDisplayCache();
    await AsyncStorage.setItem("eflow.appearance", "dark");
    const dimSpy = jest.spyOn(ReactNative.Dimensions, "get").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 2,
    });
    try {
      mockFetchProjectFiles.mockResolvedValue(sampleSnapshot);
      const scaled = await render(
        <AppearanceProvider>
          <ProjectFiles
            projectId="proj-1"
            taskId="task-scaled"
            contextTitle="Scaled Library"
          />
        </AppearanceProvider>,
      );
      expect(await scaled.findByText("Scaled Library")).toBeOnTheScreen();
      await waitFor(() => {
        expect(
          scaled.getByLabelText("Library count: 4 files").parent,
        ).toHaveStyle({ flexDirection: "column" });
      });
      await scaled.unmount();

      const embedded = await render(
        <ProjectFiles projectId="proj-1" taskId="task-scaled" embedded />,
      );
      expect(await embedded.findByText("Attached files")).toBeOnTheScreen();
      expect(embedded.queryByLabelText("Library count: 4 files")).toBeNull();
    } finally {
      dimSpy.mockRestore();
      await AsyncStorage.removeItem("eflow.appearance");
    }
  });
});

test("personal task documents show only linked references and expose Web's authorized link/unlink actions", async () => {
  mockFetchProjectFiles.mockResolvedValue({
    ...sampleSnapshot,
    files: [
      ...sampleSnapshot.files,
      {
        ...sampleSnapshot.files[0],
        id: "unlinked",
        file_name: "Unused project reference.pdf",
        linked: false,
      },
    ],
  });
  const view = await render(
    <ProjectFiles projectId="proj-1" taskId="task-a" readOnly={false} />,
  );
  await view.findByText("Q4_Budget_Plan.pdf");
  expect(view.queryByText("Unused project reference.pdf")).toBeNull();
  expect(
    await view.findByRole("button", { name: "Upload a project document" }),
  ).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "Insert from project library" }),
  );
  await fireEvent.press(
    view.getByRole("button", { name: "Unused project reference.pdf" }),
  );
  await waitFor(() =>
    expect(mockChangeDocument).toHaveBeenCalledWith(
      { actor: "user-1", project: "proj-1", task: "task-a" },
      "link",
      "unlinked",
    ),
  );
  await fireEvent.press(
    view.getAllByRole("button", { name: "Unlink document" })[0],
  );
  await waitFor(() =>
    expect(mockChangeDocument).toHaveBeenLastCalledWith(
      { actor: "user-1", project: "proj-1", task: "task-a" },
      "unlink",
      "file-pdf",
    ),
  );
});

test("closed/missing capabilities hide document writes, including after capabilities change", async () => {
  mockFetchProjectFiles.mockResolvedValue({
    can_write: false,
    files: sampleSnapshot.files,
  });
  const view = await render(
    <ProjectFiles projectId="proj-1" taskId="task-a" readOnly={false} />,
  );
  await view.findByText("Q4_Budget_Plan.pdf");
  expect(
    view.queryByRole("button", { name: "Upload a project document" }),
  ).toBeNull();
  expect(view.queryByRole("button", { name: "Unlink document" })).toBeNull();
  await view.rerender(
    <ProjectFiles projectId="proj-1" taskId="task-b" readOnly />,
  );
  await view.findByText("Q4_Budget_Plan.pdf");
  expect(
    view.queryByRole("button", { name: "Upload a project document" }),
  ).toBeNull();
});

test("a restored uncertain upload blocks a new file and retries its original request", async () => {
  const saved = {
    id: "original-upload",
    file: {
      uri: "file:///Plan.pdf",
      name: "Plan.pdf",
      size: 2,
      type: "application/pdf",
    },
    sha256: "ab".repeat(32),
    attempted: true,
  };
  mockSavedUpload = saved;
  mockFetchProjectFiles.mockResolvedValue(sampleSnapshot);
  mockSaveDocument.mockRejectedValueOnce(new Error("Receipt unavailable"));
  const view = await render(
    <ProjectFiles projectId="proj-1" taskId="task-a" readOnly={false} />,
  );
  const retry = await view.findByRole("button", { name: "Retry saved upload" });
  expect(
    view.getByRole("button", { name: "Upload a project document" }),
  ).toBeDisabled();
  expect(
    view.queryByRole("button", { name: "Discard upload draft" }),
  ).toBeNull();
  await fireEvent.press(retry);
  expect(await view.findByRole("alert")).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "Retry saved upload" }),
  );
  await waitFor(() => expect(mockSaveDocument).toHaveBeenCalledTimes(2));
  expect(mockSaveDocument.mock.calls.every((call) => call[1] === saved)).toBe(
    true,
  );
});

test("a denied mutation refreshes capabilities and removes stale write controls", async () => {
  mockFetchProjectFiles.mockResolvedValue(sampleSnapshot);
  const view = await render(
    <ProjectFiles projectId="proj-1" taskId="task-a" readOnly={false} />,
  );
  await view.findByRole("button", { name: "Upload a project document" });
  mockFetchProjectFiles.mockResolvedValue({
    can_write: false,
    files: sampleSnapshot.files,
  });
  mockChangeDocument.mockRejectedValueOnce(
    new Error("Document access changed"),
  );
  await fireEvent.press(
    view.getAllByRole("button", { name: "Unlink document" })[0],
  );
  await view.findByRole("alert");
  await waitFor(() =>
    expect(
      view.queryByRole("button", { name: "Upload a project document" }),
    ).toBeNull(),
  );
  expect(view.queryByRole("button", { name: "Unlink document" })).toBeNull();
});

test("canceling removal makes no command and never displays removal success", async () => {
  mockConfirm.mockResolvedValueOnce(false);
  mockFetchProjectFiles.mockResolvedValue({
    can_write: true,
    files: [
      { ...sampleSnapshot.files[0], linked: false, can_remove: true, links: 0 },
    ],
  });
  const view = await render(
    <ProjectFiles projectId="proj-1" readOnly={false} />,
  );
  await fireEvent.press(
    await view.findByRole("button", { name: "Remove from library" }),
  );
  expect(mockConfirm).toHaveBeenCalledTimes(1);
  expect(mockChangeDocument).not.toHaveBeenCalled();
  expect(view.queryByText("Document removed; provenance retained.")).toBeNull();
});
