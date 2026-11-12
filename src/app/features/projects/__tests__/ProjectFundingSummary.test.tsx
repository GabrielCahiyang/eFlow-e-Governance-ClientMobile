import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ProjectFundingSummary } from "../ProjectFundingSummary";

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "head-a" } }),
}));
jest.mock("../../budget", () => ({ useOfficeFinanceUpdates: () => {} }));
jest.mock("../subscriptions", () => ({ netProjectUpdates: () => () => {} }));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: async () => ({
      data: {
        project: { id: "project-a", org_id: "office-a" },
        total: 50000,
        allocated: 45000,
        unallocated: 5000,
        released: 10000,
        spent: 8000,
      },
      error: null,
    }),
  },
}));
jest.mock(
  "../../../../core/web/app/features/projects/services/projectLifecycleService",
  () => ({
    fetchProjectCompletionReadiness: async () => ({
      projectId: "project-a",
      canComplete: false,
      blockers: [
        {
          id: "cap-a",
          taskId: "task-a",
          title: "Print handouts",
          kind: "funding",
          status: "unused_subtask_funding",
          amount: 6000,
        },
        {
          id: "project-a",
          kind: "funding",
          status: "release_required",
          unusedFunding: { unallocated: 5000, taskAllocations: [] },
        },
      ],
    }),
  }),
);

test("closeout names the subtask that holds unused funding and links to the correct funding views", async () => {
  const navigate = jest.fn();
  await render(
    <ProjectFundingSummary
      projectId="project-a"
      workspaceId="workspace-a"
      showCloseout
      navigate={navigate}
    />,
  );
  expect(await screen.findByText("Print handouts")).toBeOnTheScreen();
  expect(screen.getByText("Unused subtask funding")).toBeOnTheScreen();
  expect(
    screen.getByText("Return unused funding before completion"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("The project is ready to complete from Project options."),
  ).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Open task funding" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "task",
    id: "task-a",
    projectId: "project-a",
    workspaceId: "workspace-a",
    view: "budget",
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Open project budget in eFlow Web" }),
  );
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "project",
      id: "project-a",
      workspaceId: "workspace-a",
      view: "funding_configuration",
    }),
  );
});
