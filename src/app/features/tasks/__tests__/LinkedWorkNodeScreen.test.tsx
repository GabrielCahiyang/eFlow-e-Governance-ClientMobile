import { expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { LinkedWorkNodeScreen } from "../LinkedWorkNodeScreen";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor" } }),
}));
let mockWorkChanged: () => void;
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: (_event: string, filter: { table: string }, callback: () => void) => {
          if (filter.table === "subtasks") mockWorkChanged = callback;
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: jest.fn(),
  },
}));
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
    data,
    focusNodeId,
    funding,
  }: {
    data: WorkTreeSnapshot;
    focusNodeId: string;
    funding?: React.ReactNode;
  }) => {
    const { Text, View } = require("react-native");
    const nodeTitle = data.nodes.find((node) => node.id === focusNodeId)?.title;
    return (
      <View>
        {!!nodeTitle && <Text>{nodeTitle}</Text>}
        <Text>{"Focused branch " + focusNodeId}</Text>
        {funding}
      </View>
    );
  },
}));
jest.mock("../../projects/services", () => ({ fetchProject: async () => ({ status: "active" }) }));
jest.mock("../../budget/TaskFundingCard", () => ({
  TaskFundingCard: ({ subtaskId }: { subtaskId: string }) => {
    const { Text } = require("react-native");
    return <Text>{"Funding " + subtaskId}</Text>;
  },
}));
jest.mock("../OfficeSubitemActivity", () => ({
  OfficeSubitemActivity: ({ nodeId }: { nodeId: string }) => {
    const { Text } = require("react-native");
    return <Text>{"Activity view " + nodeId}</Text>;
  },
}));
jest.mock("../WorkProposalSheet", () => ({
  WorkProposalReview: ({ node }: { node?: string }) => {
    const { Text } = require("react-native");
    return <Text>{"Review view " + (node || "none")}</Text>;
  },
  WorkProposalSheet: () => null,
}));
jest.mock("../../projects/ProjectFiles", () => ({
  ProjectFiles: ({ projectId, taskId }: { projectId: string; taskId?: string }) => {
    const { Text } = require("react-native");
    return <Text>{"Files view " + projectId + ":" + (taskId || "")}</Text>;
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
  // Overview renders the branch title once inside WorkTreePanel without duplicating it in Screen
  expect(screen.getAllByText("Exact branch")).toHaveLength(1);
  expect(screen.queryByText(/Funding/)).toBeNull();
  expect(screen.queryByText("Sibling")).toBeNull();
  expect(fetchWorkTree).toHaveBeenLastCalledWith("root");
});

test("an assigned Office subtask is hidden until its parent Task starts, then a refresh reveals it", async () => {
  const office = {
    ...tree,
    root: {
      ...tree.root,
      kind: "office" as const,
      office: "office",
      project: "project",
      status: "todo",
      lead: "another-person",
    },
    nodes: tree.nodes.map((node) => node.id === "depth-eight"
      ? { ...node, assigned_to_ids: ["actor"] }
      : node),
  };
  jest.mocked(fetchWorkTree).mockResolvedValue(office);
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
  expect(await screen.findByText("Subtasks will be available when the Task Lead starts the parent task.")).toBeOnTheScreen();
  expect(screen.queryByText("Exact branch")).toBeNull();
  expect(screen.queryByText(/Funding/)).toBeNull();
  expect(screen.queryByText("Open subtask funding")).toBeNull();
  jest.mocked(fetchWorkTree).mockResolvedValue({
    ...office,
    root: { ...office.root, status: "in_progress" },
    nodes: office.nodes.map((node) => node.id === "depth-eight"
      ? { ...node, title: "Updated on another device" }
      : node),
  });
  mockWorkChanged();
  expect(await screen.findByText("Updated on another device")).toBeOnTheScreen();
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

test("navigates subtask views to dedicated Activity, Evidence & review, Funding, Files, and Planning subpages", async () => {
  const office = {
    ...tree,
    root: {
      ...tree.root,
      kind: "office" as const,
      office: "office",
      project: "project",
      status: "in_progress",
      lead: "actor",
    },
    nodes: tree.nodes.map((node) =>
      node.id === "depth-eight" ? { ...node, assigned_to_ids: ["actor"] } : node,
    ),
  };
  jest.mocked(fetchWorkTree).mockResolvedValue(office);

  const baseRoute = {
    name: "task" as const,
    id: "root",
    projectId: "project",
    nodeId: "depth-eight",
  };

  const view = await render(
    <LinkedWorkNodeScreen navigate={jest.fn()} route={{ ...baseRoute, view: "activity" }} />,
  );
  expect(await screen.findByText("Activity")).toBeOnTheScreen();
  expect(screen.getByText("Activity view depth-eight")).toBeOnTheScreen();

  await view.rerender(
    <LinkedWorkNodeScreen navigate={jest.fn()} route={{ ...baseRoute, view: "review" }} />,
  );
  expect(await screen.findByText("Evidence & review")).toBeOnTheScreen();
  expect(screen.getByText("Review view depth-eight")).toBeOnTheScreen();

  await view.rerender(
    <LinkedWorkNodeScreen navigate={jest.fn()} route={{ ...baseRoute, view: "budget" }} />,
  );
  expect(await screen.findByText("Funding")).toBeOnTheScreen();
  expect(screen.getByText("Funding depth-eight")).toBeOnTheScreen();
  expect(screen.queryByText("Funding sibling")).toBeNull();

  await view.rerender(
    <LinkedWorkNodeScreen navigate={jest.fn()} route={{ ...baseRoute, view: "files" }} />,
  );
  expect(await screen.findByText("Files")).toBeOnTheScreen();
  expect(screen.getByText("Files view project:root")).toBeOnTheScreen();

  await view.rerender(
    <LinkedWorkNodeScreen navigate={jest.fn()} route={{ ...baseRoute, view: "planning" }} />,
  );
  expect(await screen.findByText("Planning details")).toBeOnTheScreen();
  expect(screen.getByText("DESCRIPTION")).toBeOnTheScreen();
  expect(screen.getByText("DEFINITION OF DONE")).toBeOnTheScreen();
});
