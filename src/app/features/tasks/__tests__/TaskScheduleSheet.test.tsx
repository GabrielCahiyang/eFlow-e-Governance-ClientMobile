import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TaskScheduleSheet } from "../TaskScheduleSheet";
import {
  fetchDetailEditState,
  type WorkDetailEditState,
} from "../workDetailEditing";
import { supabase } from "../../../../platform/supabase";
import { rowToTask } from "../../../../core/web/app/features/tasks/services/taskMapper";
import { clearFormDraft, formDraftKey } from "../../../shared/formDraftMemory";

const mockDay = (offset: number) =>
  new Date(Date.now() + (offset * 24 + 8) * 3600_000)
    .toISOString()
    .slice(0, 10);
const mockUpdatedAt = "2026-11-16T00:00:00Z";
let mockPolicy: WorkDetailEditState;
const mockToast = jest.fn();
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "head", role: "head", is_active: true, org_id: "office" },
    organization: { id: "office", head_user_id: "head" },
  }),
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "head" } } } }),
    },
    rpc: jest.fn(),
  },
}));
jest.mock("../../../../platform/webRuntime", () => ({
  nativeWindow: { dispatchEvent: jest.fn() },
}));
jest.mock("../../../components/ui/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));
jest.mock("../services", () => ({ fetchVisibleTasks: jest.fn() }));
jest.mock("../../../../core/web/app/features/project-table/selectors", () => ({
  canEditProjectTask: () => true,
}));
jest.mock("../../projects/services", () => ({
  fetchProject: async () => ({
    startDate: mockDay(-2),
    targetDate: mockDay(10),
  }),
}));
jest.mock("../workDetailEditing", () => ({
  ...jest.requireActual<typeof import("../workDetailEditing")>(
    "../workDetailEditing",
  ),
  fetchDetailEditState: jest.fn(),
}));
jest.mock("../../../shared/useFacts", () => ({
  useFacts: (key: string) => ({
    loading: false,
    error: null,
    data: key.startsWith("task-schedule-edit:")
      ? mockPolicy
      : key.startsWith("task-schedule-project:")
        ? { startDate: mockDay(-2), targetDate: mockDay(10) }
        : [],
  }),
}));
// Small native controls isolate submission/recovery behavior; shared control UX has its own tests.
jest.mock("../../../components/ui", () => {
  const { View, Text, Pressable, TextInput } = require("react-native");
  const Button = ({ children, onPress, disabled }: any) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <Text>{children}</Text>
    </Pressable>
  );
  return {
    Button,
    Notice: ({ children }: any) => <Text>{children}</Text>,
    Sheet: ({ children, footer, actionError }: any) => (
      <View>
        {actionError && <Text>{actionError.message}</Text>}
        {children}
        {footer}
      </View>
    ),
    DateField: ({ label, onChange, disabled }: any) => (
      <Button disabled={disabled} onPress={() => onChange(mockDay(4))}>
        {label}
      </Button>
    ),
    Choice: ({ label, disabled }: any) => (
      <Button disabled={disabled}>{label}</Button>
    ),
    Field: ({ label, value, onChangeText }: any) => (
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
      />
    ),
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  clearFormDraft(formDraftKey("head", "task-schedule:task"));
  mockPolicy = {
    version: 1,
    task_id: "task",
    node_id: null,
    updated_at: mockUpdatedAt,
    started: true,
    details: true,
    due: true,
    planning: false,
  };
  jest.mocked(fetchDetailEditState).mockImplementation(async () => mockPolicy);
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue({ data: { id: "task" }, error: null } as never);
});
const task = () =>
  rowToTask({
    id: "task",
    title: "Consultation materials",
    org_id: "office",
    linked_project_id: "project",
    status: "in_progress",
    start_date: mockDay(0),
    deadline: mockDay(3),
    updated_at: mockUpdatedAt,
    dependency_ids: [],
  });

test("started rescheduling requires a reason and sends only the changed due date", async () => {
  const saved = jest.fn(async () => {});
  const view = await render(
    <TaskScheduleSheet task={task()} onClose={jest.fn()} onSaved={saved} />,
  );
  expect(view.getByRole("button", { name: "Start date" })).toBeDisabled();
  expect(
    view.getByRole("button", { name: "Prerequisite tasks" }),
  ).toBeDisabled();
  await fireEvent.press(view.getByRole("button", { name: "Due date" }));
  await fireEvent.press(view.getByRole("button", { name: "Save task plan" }));
  expect(
    await view.findByText("Enter a reason for changing the due date."),
  ).toBeOnTheScreen();
  expect(supabase.rpc).not.toHaveBeenCalled();
  await fireEvent.changeText(
    view.getByLabelText("Reason for changing the due date"),
    "Venue confirmed",
  );
  await fireEvent.press(view.getByRole("button", { name: "Save task plan" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(supabase.rpc).toHaveBeenCalledWith("phase3_patch_task", {
    p_task_id: "task",
    p_patch: { deadline: mockDay(4), change_reason: "Venue confirmed" },
  });
});
test("an uncertain schedule save retains the reason and prevents a second write", async () => {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue({
      data: null,
      error: { message: "Network unavailable" },
    } as never);
  const saved = jest.fn(async () => {});
  const view = await render(
    <TaskScheduleSheet task={task()} onClose={jest.fn()} onSaved={saved} />,
  );
  await fireEvent.press(view.getByRole("button", { name: "Due date" }));
  await fireEvent.changeText(
    view.getByLabelText("Reason for changing the due date"),
    "Retained reason",
  );
  await fireEvent.press(view.getByRole("button", { name: "Save task plan" }));
  expect(
    await view.findByText(/save could not be confirmed/),
  ).toBeOnTheScreen();
  expect(
    view.getByLabelText("Reason for changing the due date").props.value,
  ).toBe("Retained reason");
  expect(view.getByRole("button", { name: "Save task plan" })).toBeDisabled();
  await fireEvent.press(view.getByRole("button", { name: "Save task plan" }));
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(saved).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
});
test("submission rechecks a revoked or pending-review capability before writing", async () => {
  const view = await render(
    <TaskScheduleSheet
      task={task()}
      onClose={jest.fn()}
      onSaved={async () => {}}
    />,
  );
  jest
    .mocked(fetchDetailEditState)
    .mockResolvedValue({ ...mockPolicy, details: false, due: false });
  await fireEvent.press(view.getByRole("button", { name: "Save task plan" }));
  expect(
    await view.findByText(/work details are read-only/i),
  ).toBeOnTheScreen();
  expect(supabase.rpc).not.toHaveBeenCalled();
});
