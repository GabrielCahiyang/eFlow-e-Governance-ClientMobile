import { expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { useWorkspaceFavorites } from "../useWorkspaceFavorites";
import { nativeWindow } from "../../../../platform/webRuntime";
let mockActor = "workspace-qa-a",
  mockLoading = false;
let mockWorkspaces = [{ id: "office-a", name: "Office A", state: "active" }];
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: mockActor } }),
}));
jest.mock("..", () => ({
  useWorkspace: () => ({ workspaces: mockWorkspaces, loading: mockLoading }),
}));

test("workspace favorites are local actor-scoped and never expose a revoked or another actor's workspace", async () => {
  const view = await renderHook(() => useWorkspaceFavorites());
  try {
    await act(async () => view.result.current.toggle("office-a"));
    expect(view.result.current.pinned.map((item) => item.id)).toEqual([
      "office-a",
    ]);
    await act(async () => view.result.current.toggle("not-authorized"));
    expect(view.result.current.favorites.has("not-authorized")).toBe(false);
    mockActor = "workspace-qa-b";
    await view.rerender(undefined);
    expect(view.result.current.pinned).toEqual([]);
    mockActor = "workspace-qa-a";
    await view.rerender(undefined);
    expect(view.result.current.pinned.map((item) => item.id)).toEqual([
      "office-a",
    ]);
    mockLoading = true;
    mockWorkspaces = [];
    await view.rerender(undefined);
    expect(view.result.current.pinned).toEqual([]);
    expect(
      nativeWindow.localStorage.getItem(
        "eflow:navigation:v1:workspace-qa-a:mobile-workspaces",
      ),
    ).toContain("office-a");
    mockLoading = false;
    await view.rerender(undefined);
    expect(
      nativeWindow.localStorage.getItem(
        "eflow:navigation:v1:workspace-qa-a:mobile-workspaces",
      ),
    ).toBe("[]");
  } finally {
    mockActor = "workspace-qa-a";
    mockLoading = false;
    mockWorkspaces = [{ id: "office-a", name: "Office A", state: "active" }];
    nativeWindow.localStorage.removeItem(
      "eflow:navigation:v1:workspace-qa-a:mobile-workspaces",
    );
  }
});
