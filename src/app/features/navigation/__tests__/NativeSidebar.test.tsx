import { test, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { NativeSidebar } from "../NativeSidebar";
const mockToggle = jest.fn();
jest.mock("../../../../core/web/app/shared/navigationPreferences", () => ({
  useNavigationFavorites: () => ({
    favorites: new Set(["favorite"]),
    toggle: (id: string) => mockToggle(id),
  }),
  useNavigationDisclosure: () => ({ isOpen: () => true, setOpen: jest.fn() }),
}));
const base = {
  actorId: "actor",
  role: "head",
  can: () => true,
  leading: false,
  current: { name: "projects" as const },
  workspaceId: "office",
  workspaces: [
    {
      id: "office",
      name: "Office",
      kind: "office" as const,
      office_id: "org",
      owner_id: null,
      timezone: "Asia/Manila",
      state: "active" as const,
    },
  ],
  projects: [
    {
      id: "favorite",
      title: "Favorite project",
      kind: "office" as const,
      home_workspace_id: "office",
      status: "active",
    },
    {
      id: "other",
      title: "Other project",
      kind: "office" as const,
      home_workspace_id: "office",
      status: "active",
    },
  ],
  loaded: true,
  selectWorkspace: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
});
test("sidebar exposes a starred project once and keeps its navigation and favorite controls separate", async () => {
  const navigate = jest.fn(),
    screen = await render(<NativeSidebar {...base} navigate={navigate} />);
  expect(
    screen.getAllByRole("button", { name: "Open Favorite project" }),
  ).toHaveLength(1);
  await fireEvent.press(
    screen.getByRole("button", {
      name: "Remove Favorite project from favorites",
    }),
  );
  expect(mockToggle).toHaveBeenCalledWith("favorite");
  expect(navigate).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Open Other project" }),
  );
  expect(navigate).toHaveBeenCalledWith({ name: "project", id: "other" });
});
test("Admin sidebar does not expose operational projects or the Office workspace selector", async () => {
  const screen = await render(
    <NativeSidebar {...base} role="admin" navigate={jest.fn()} />,
  );
  expect(screen.queryByRole("button", { name: "Office Budget" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Workspace" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Open Favorite project" }),
  ).toBeNull();
});
