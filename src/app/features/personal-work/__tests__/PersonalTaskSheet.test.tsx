import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import type {
  PersonalMember,
  PersonalTask,
} from "../../../../core/web/app/features/workspaces/types";
import { PersonalTaskSheet } from "../PersonalTaskSheet";

jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));

const members: PersonalMember[] = [
  { user_id: "member-1", name: "Dela Cruz", access: "member", state: "active", eligible: true },
  { user_id: "member-2", name: "Reyes", access: "member", state: "active", eligible: true },
];

const baseTask: PersonalTask = {
  id: "task-1",
  project_id: "personal-1",
  title: "Prepare brief",
  status: "todo",
  lead_id: "member-1",
  reviewer_id: null,
  progress: 40,
  note: "",
  review_note: "",
  revision: 1,
};

test.each([
  { mode: "create" as const, task: undefined, expectedButton: "Add personal task" },
  { mode: "staff" as const, task: baseTask, expectedButton: "Save task people" },
  { mode: "progress" as const, task: baseTask, expectedButton: "Save progress update" },
  { mode: "submit" as const, task: baseTask, expectedButton: "Complete personal task" },
  {
    mode: "submit" as const,
    task: { ...baseTask, reviewer_id: "member-2" },
    expectedButton: "Submit for review",
  },
  {
    mode: "review" as const,
    task: { ...baseTask, reviewer_id: "member-2", status: "submitted" as const },
    expectedButton: "Approve personal work",
  },
])(
  "PersonalTaskSheet renders action-specific button label $expectedButton for $mode mode",
  async ({ mode, task, expectedButton }) => {
    await render(
      <PersonalTaskSheet
        mode={mode}
        task={task}
        members={members}
        actor="member-1"
        busy={false}
        run={jest.fn(async () => true)}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull();
    expect(screen.getByRole("button", { name: expectedButton })).toBeOnTheScreen();
  },
);
