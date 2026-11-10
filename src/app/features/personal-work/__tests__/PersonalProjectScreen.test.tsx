import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import type { FlatListProps } from "react-native";
import type {
  PersonalSnapshot,
  PersonalTask,
} from "../../../../core/web/app/features/workspaces/types";
import { PersonalProjectScreen } from "../PersonalProjectScreen";

const mockList = jest.fn<(props: FlatListProps<PersonalTask>) => void>();
jest.mock("../../../components/ui/FolderRefresh", () => {
  const real = jest.requireActual<
    typeof import("../../../components/ui/FolderRefresh")
  >("../../../components/ui/FolderRefresh");
  return {
    ...real,
    RefreshFlatList: (props: FlatListProps<PersonalTask>) => {
      mockList(props);
      return <real.RefreshFlatList {...props} />;
    },
  };
});
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "member" } }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({ refresh: async () => {} }),
}));
jest.mock("../../projects", () => ({
  ProjectActivity: () => null,
  ProjectFiles: () => null,
}));
jest.mock("../usePersonalActions", () => ({ usePersonalActions: () => ({}) }));
jest.mock("../PersonalTaskSheet", () => ({ PersonalTaskSheet: () => null }));
jest.mock("../PersonalNestedWork", () => ({ PersonalNestedWork: () => null }));
jest.mock(
  "../../../../core/web/app/features/nested-work/services/workTreeService",
  () => ({
    fetchWorkTree: async (id: string) => ({
      root: { id, kind: "personal", project: "personal" },
      nodes: [],
    }),
  }),
);
jest.mock(
  "../../../../core/web/app/features/workspaces/services/workspaceService",
  () => ({ fetchPersonalProject: async () => mockSnapshot }),
);
const mockSnapshot: PersonalSnapshot = {
  project: {
    id: "personal",
    workspace_id: "workspace",
    title: "Personal QA",
    status: "active",
    revision: 1,
  },
  owner: "owner",
  shortcuts: [],
  members: [
    {
      user_id: "member",
      name: "QA Member",
      access: "member",
      state: "active",
      eligible: true,
    },
  ],
  tasks: Array.from({ length: 45 }, (_, i) => ({
    id: String(i + 1),
    project_id: "personal",
    title: `Personal task ${i + 1}`,
    status: "todo",
    lead_id: "member",
    reviewer_id: null,
    progress: 0,
    note: "",
    review_note: "",
    revision: 1,
  })),
};

test("personal task list reveals later rows and searches the entire authorized snapshot", async () => {
  const navigate = jest.fn();
  const screen = await render(
    <PersonalProjectScreen id="personal" navigate={navigate} />,
  );
  const search = await screen.findByPlaceholderText("Search personal tasks");
  const list = () => mockList.mock.lastCall![0];
  expect(list().data).toHaveLength(40);
  expect(screen.getByText("45 tasks")).toBeOnTheScreen();
  await act(async () => list().onEndReached!({ distanceFromEnd: 0 }));
  expect(list().data).toHaveLength(45);
  await fireEvent.changeText(search, "Personal task 45");
  expect(list().data).toEqual([mockSnapshot.tasks[44]]);
  await fireEvent.press(await screen.findByText("Personal task 45"));
  expect(navigate).toHaveBeenCalledWith({
    name: "personal_project",
    id: "personal",
    taskId: "45",
    title: "Personal task 45",
  });
});

test("a direct task link resolves the task beyond the first page", async () => {
  const screen = await render(
    <PersonalProjectScreen
      id="personal"
      initialTaskId="45"
      navigate={jest.fn()}
    />,
  );
  expect(
    await screen.findByRole("button", { name: "Record progress" }),
  ).toBeOnTheScreen();
  expect(screen.getAllByText("Personal task 45")).toHaveLength(2);
  expect(screen.queryByText("Personal task 1")).toBeNull();
  expect(screen.queryByPlaceholderText("Search personal tasks")).toBeNull();
});
