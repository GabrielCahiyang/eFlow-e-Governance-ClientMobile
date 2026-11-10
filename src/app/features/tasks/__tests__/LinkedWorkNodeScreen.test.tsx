import { expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { LinkedWorkNodeScreen } from "../LinkedWorkNodeScreen";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor" } }),
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../../core/web/app/features/subtasks", () => ({
  rowToSubtask: jest.fn(),
}));
jest.mock(
  "../../../../core/web/app/features/nested-work/services/workTreeService",
  () => ({
    fetchWorkTree: jest.fn(),
    WorkTreeUnavailable: class extends Error {},
  }),
);
jest.mock("../WorkTreePanel", () => ({
  WorkTreePanel: ({ focusNodeId }: { focusNodeId: string }) => {
    const { Text } = require("react-native");
    return <Text>{"Focused branch " + focusNodeId}</Text>;
  },
}));
const tree = {
  root: {
    id: "root",
    kind: "personal",
    project: "personal-project",
    open: true,
  },
  nodes: [
    { id: "sibling", task_id: "root", title: "Sibling" },
    { id: "depth-eight", task_id: "root", title: "Exact branch" },
  ],
} as unknown as WorkTreeSnapshot;

test("personal links pass the exact branch from its verified root to the focused panel", async () => {
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  await render(
    <LinkedWorkNodeScreen
      navigate={jest.fn()}
      route={{
        name: "personal_project",
        id: "personal-project",
        taskId: "root",
        nodeId: "depth-eight",
      }}
    />,
  );
  await waitFor(() =>
    expect(screen.getByText("Focused branch depth-eight")).toBeOnTheScreen(),
  );
  expect(screen.getByText("Exact branch")).toBeOnTheScreen();
  expect(screen.queryByText("Sibling")).toBeNull();
  expect(fetchWorkTree).toHaveBeenLastCalledWith("root");
});

test("a mismatched project or a missing branch never opens another row", async () => {
  jest.mocked(fetchWorkTree).mockResolvedValue(tree);
  const view = await render(
    <LinkedWorkNodeScreen
      navigate={jest.fn()}
      route={{
        name: "personal_project",
        id: "other-project",
        taskId: "root",
        nodeId: "depth-eight",
      }}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByText(
        "This subtask doesn't belong to the selected project. Return to Projects to open it.",
      ),
    ).toBeOnTheScreen(),
  );
  await view.rerender(
    <LinkedWorkNodeScreen
      navigate={jest.fn()}
      route={{
        name: "personal_project",
        id: "personal-project",
        taskId: "root",
        nodeId: "missing",
      }}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByText("This subtask is no longer available"),
    ).toBeOnTheScreen(),
  );
  expect(screen.queryByText(/Focused branch/)).toBeNull();
});
