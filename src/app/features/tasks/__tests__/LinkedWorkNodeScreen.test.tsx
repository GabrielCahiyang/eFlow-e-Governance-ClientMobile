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
  WorkTreePanel: ({
    focusNodeId,
    funding,
  }: {
    focusNodeId: string;
    funding?: React.ReactNode;
  }) => {
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{"Focused branch " + focusNodeId}</Text>
        {funding}
      </View>
    );
  },
}));
jest.mock("../../budget/TaskFundingCard", () => ({
  TaskFundingCard: ({ subtaskId }: { subtaskId: string }) => {
    const { Text } = require("react-native");
    return <Text>{"Funding " + subtaskId}</Text>;
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
  expect(screen.queryByText(/Funding/)).toBeNull();
  expect(screen.queryByText("Sibling")).toBeNull();
  expect(fetchWorkTree).toHaveBeenLastCalledWith("root");
});

test("only the verified Office branch renders inline funding", async () => {
  jest.mocked(fetchWorkTree).mockResolvedValue({
    ...tree,
    root: {
      ...tree.root,
      kind: "office",
      office: "office",
      project: "project",
    },
  });
  await render(
    <LinkedWorkNodeScreen
      navigate={jest.fn()}
      route={{
        name: "task",
        id: "root",
        projectId: "project",
        nodeId: "depth-eight",
      }}
    />,
  );
  expect(await screen.findByText("Funding depth-eight")).toBeOnTheScreen();
  expect(screen.queryByText("Funding sibling")).toBeNull();
  expect(screen.queryByText("Open subtask funding")).toBeNull();
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
