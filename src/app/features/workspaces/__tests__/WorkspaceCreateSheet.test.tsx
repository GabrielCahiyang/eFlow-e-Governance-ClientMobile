import { test, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { WorkspaceCreateSheet } from "../WorkspaceCreateSheet";
import { draftStore } from "../../../../platform/draftStore";
import {
  createPersonalProject,
  createWorkspace,
} from "../../../../core/web/app/features/workspaces/services/workspaceService";
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));
jest.mock(
  "../../../../core/web/app/features/workspaces/services/workspaceService",
  () => ({ createPersonalProject: jest.fn(), createWorkspace: jest.fn() }),
);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(draftStore.get).mockReset().mockResolvedValue(null);
  jest.mocked(draftStore.set).mockReset().mockResolvedValue(undefined);
  jest.mocked(draftStore.remove).mockReset().mockResolvedValue(undefined);
});
test("reopening a lost creation retries its original name and request rather than creating another project", async () => {
  const saved = {
    schema: 1,
    kind: "project",
    context: "workspace",
    request: "original-request",
    title: "Original project",
  };
  jest.mocked(draftStore.get).mockResolvedValue(saved);
  jest
    .mocked(createPersonalProject)
    .mockResolvedValue({
      id: "created",
      workspace_id: "workspace",
      title: "Original project",
      status: "active",
      revision: 1,
    });
  const onCreated = jest
      .fn<(id: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    screen = await render(
      <WorkspaceCreateSheet
        kind="project"
        actor="actor"
        context="workspace"
        onClose={jest.fn()}
        onCreated={onCreated}
      />,
    );
  await waitFor(() =>
    expect(screen.getByDisplayValue("Original project")).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Create project" }),
  );
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith("created"));
  expect(createPersonalProject).toHaveBeenCalledWith(
    "workspace",
    "original-request",
    "Original project",
  );
  expect(createWorkspace).not.toHaveBeenCalled();
  expect(draftStore.remove).toHaveBeenCalledWith(
    "actor",
    "personal-create:project:workspace",
  );
});
test("a retained confirmed creation reopens the record without repeating the creation RPC", async () => {
  jest
    .mocked(draftStore.get)
    .mockResolvedValue({
      schema: 1,
      kind: "workspace",
      context: "new",
      request: "original-request",
      title: "My workspace",
      created: "created-workspace",
    });
  const onCreated = jest
      .fn<(id: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    screen = await render(
      <WorkspaceCreateSheet
        kind="workspace"
        actor="actor"
        context="new"
        onClose={jest.fn()}
        onCreated={onCreated}
      />,
    );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Open created record" }),
    ).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Open created record" }),
  );
  await waitFor(() =>
    expect(onCreated).toHaveBeenCalledWith("created-workspace"),
  );
  expect(createWorkspace).not.toHaveBeenCalled();
  expect(createPersonalProject).not.toHaveBeenCalled();
});
