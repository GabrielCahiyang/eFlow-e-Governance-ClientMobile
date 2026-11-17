import { expect, jest, test, describe } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import {
  AvatarBadge,
  BentoActionButtons,
  BentoAssignedTeamCard,
  BentoBlockerCard,
  BentoDependenciesCard,
  BentoEditButton,
  BentoOverviewHeroCard,
  BentoScheduleCards,
  BentoSubtasksCard,
  BentoSupportingGrid,
  BentoSubtaskSupportingGrid,
  BentoProjectOnHoldCard,
  CircularProgressRing,
  ContributorsSheet,
  PlanningDetailsSheet,
  getInitials,
  type SubtaskItemData,
} from "../TaskBentoComponents";

jest.mock("../../../components/ui/Sheet", () => ({
  Sheet: ({
    open,
    children,
    title,
    description,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
    description?: string;
  }) => {
    if (!open) return null;
    const { View, Text } = require("react-native");
    return (
      <View testID="mock-sheet">
        <Text>{title}</Text>
        {description ? <Text>{description}</Text> : null}
        {children}
      </View>
    );
  },
}));

describe("TaskBentoComponents", () => {
  test("getInitials correctly extracts uppercase initials", () => {
    expect(getInitials("Andres Manili")).toBe("AM");
    expect(getInitials("Gabriel Cahiyang")).toBe("GC");
    expect(getInitials("Maria Clara de los Santos")).toBe("MS");
    expect(getInitials("Cheryl")).toBe("CH");
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
  });

  test("CircularProgressRing displays percentage and accessibility attributes", async () => {
    const view = await render(<CircularProgressRing percent={75} />);
    expect(view.getByText("75%")).toBeOnTheScreen();
    expect(view.getByLabelText("Task completion: 75%")).toBeOnTheScreen();
  });

  test("BentoScheduleCards renders start date and due date, with fallback dashes", async () => {
    const viewWithDates = await render(
      <BentoScheduleCards
        startDate="2026-11-11"
        dueDate="2026-11-12"
      />,
    );
    expect(viewWithDates.getByText("Start date")).toBeOnTheScreen();
    expect(viewWithDates.getByText("Due date")).toBeOnTheScreen();
    expect(viewWithDates.getByText("Nov 11, 2026")).toBeOnTheScreen();
    expect(viewWithDates.getByText("Nov 12, 2026")).toBeOnTheScreen();

    const viewWithoutStart = await render(
      <BentoScheduleCards
        startDate={null}
        dueDate="2026-11-12"
      />,
    );
    expect(viewWithoutStart.getByText("—")).toBeOnTheScreen();
  });

  test("BentoActionButtons renders actions and handles presses", async () => {
    const onUpdate = jest.fn();
    const onComplete = jest.fn();

    const view = await render(
      <BentoActionButtons
        actions={[
          {
            label: "Update progress",
            variant: "secondary",
            icon: "pencil",
            onPress: onUpdate,
          },
          {
            label: "Mark as complete",
            variant: "primary",
            icon: "check",
            onPress: onComplete,
          },
        ]}
      />,
    );

    const updateBtn = view.getByText("Update progress");
    const completeBtn = view.getByText("Mark as complete");
    expect(updateBtn).toBeOnTheScreen();
    expect(completeBtn).toBeOnTheScreen();

    await fireEvent.press(updateBtn);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await fireEvent.press(completeBtn);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("BentoBlockerCard renders blocker text with warning header", async () => {
    const onPressActivity = jest.fn();
    const view = await render(
      <BentoBlockerCard
        blocker="Awaiting budget clearance from LGU"
        reporter="Andres Manili"
        note="Submitted endorsement"
        nextStep="Follow up Monday"
        onPressActivity={onPressActivity}
      />,
    );
    expect(view.getByText("WORK BLOCKED")).toBeOnTheScreen();
    expect(view.getByText("Awaiting budget clearance from LGU")).toBeOnTheScreen();
    expect(view.getByText("Andres Manili")).toBeOnTheScreen();
    expect(view.getByText("Note: Submitted endorsement")).toBeOnTheScreen();
    expect(view.getByText("Next step: Follow up Monday")).toBeOnTheScreen();
    await fireEvent.press(view.getByRole("button", { name: "View blocker activity" }));
    expect(onPressActivity).toHaveBeenCalledTimes(1);
  });

  test("BentoAssignedTeamCard supports Task Lead and Subtask Lead roles with empty contributors", async () => {
    const onChoosePeople = jest.fn();
    const contributors = [
      { id: "1", name: "Gabriel Cahiyang" },
      { id: "2", name: "Maria Clara" },
      { id: "3", name: "Paolo Duterte" },
      { id: "4", name: "Juan Luna" },
      { id: "5", name: "Jose Rizal" },
      { id: "6", name: "Emilio Aguinaldo" },
      { id: "7", name: "Apolinario Mabini" },
    ];

    const view = await render(
      <BentoAssignedTeamCard
        leadName="Andres Manili"
        leadRoleLabel="Task Lead"
        contributors={contributors}
        onChoosePeople={onChoosePeople}
      />,
    );

    expect(view.getByText("Assigned team")).toBeOnTheScreen();
    expect(view.getByText("Andres Manili")).toBeOnTheScreen();
    expect(view.getByText("Task Lead")).toBeOnTheScreen();
    expect(view.getByText("AM")).toBeOnTheScreen();

    // Choose people button
    const chooseBtn = view.getByText("Choose people");
    expect(chooseBtn).toBeOnTheScreen();
    await fireEvent.press(chooseBtn);
    expect(onChoosePeople).toHaveBeenCalledTimes(1);

    // Contributors count badge & preview (+4 others)
    expect(view.getByText("Contributors")).toBeOnTheScreen();
    expect(view.getByText("7")).toBeOnTheScreen();
    expect(view.getByText("Gabriel, Maria, Paolo +4 others")).toBeOnTheScreen();
    expect(view.getByText("+4")).toBeOnTheScreen();

    // Now test with Subtask Lead and 0 contributors
    const subtaskView = await render(
      <BentoAssignedTeamCard
        leadName="Andres Manili"
        leadRoleLabel="Subtask Lead"
        contributors={[]}
      />,
    );
    expect(subtaskView.getByText("Subtask Lead")).toBeOnTheScreen();
    expect(subtaskView.getByText("No contributors assigned")).toBeOnTheScreen();
  });

  test("ContributorsSheet renders contributors in modal when open and omits raw entity IDs", async () => {
    const close = jest.fn();
    const contributors = [
      { id: "1", name: "Gabriel Cahiyang", office: "123e4567-e89b-12d3-a456-426614174000" },
      { id: "2", name: "Maria Clara", office: "Accounting" },
    ];

    const view = await render(
      <ContributorsSheet open onClose={close} contributors={contributors} />,
    );

    expect(view.getByText("Contributors")).toBeOnTheScreen();
    expect(view.getByText("Gabriel Cahiyang")).toBeOnTheScreen();
    expect(view.getByText("Maria Clara")).toBeOnTheScreen();
    expect(view.getByText("Contributor · Accounting")).toBeOnTheScreen();
    expect(view.queryByText(/123e4567-e89b-12d3-a456-426614174000/)).toBeNull();
  });

  test("BentoSubtasksCard renders subtasks with assigned member avatars and Add action", async () => {
    const onAdd = jest.fn();
    const onPress = jest.fn();
    const subtasks: SubtaskItemData[] = [
      {
        id: "sub-1",
        title: "Find one",
        status: "todo",
        percent: 0,
        members: [
          { id: "am", name: "Andres Manili" },
          { id: "gc", name: "Gabriel Cahiyang" },
        ],
      },
    ];

    const view = await render(
      <BentoSubtasksCard
        subtasks={subtasks}
        canAdd
        onAddSubtask={onAdd}
        onPressSubtask={onPress}
      />,
    );

    expect(view.getByText("Subtasks")).toBeOnTheScreen();
    expect(view.getByText("1")).toBeOnTheScreen();
    expect(view.getByText("Add")).toBeOnTheScreen();
    expect(view.getByText("Find one")).toBeOnTheScreen();
    expect(view.getByText("To Do")).toBeOnTheScreen();

    // Check that assigned members' initials are displayed in the subtask row
    expect(view.getByText("AM")).toBeOnTheScreen();
    expect(view.getByText("GC")).toBeOnTheScreen();

    // Test add and press interactions
    await fireEvent.press(view.getByText("Add"));
    expect(onAdd).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      view.getByLabelText("Subtask: Find one, To Do"),
    );
    expect(onPress).toHaveBeenCalledWith(subtasks[0]);
  });

  test("five Subtasks open a full list from See all", async () => {
    const subtasks = Array.from({ length: 5 }, (_, index) => ({
      id: String(index), title: `Fixture subtask ${index}`, status: "todo", members: [],
    }));
    const onPress = jest.fn();
    const view = await render(<BentoSubtasksCard subtasks={subtasks} onPressSubtask={onPress} />);
    expect(view.queryByText("Fixture subtask 4")).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "See all 5 subtasks" }));
    await fireEvent.press(view.getByText("Fixture subtask 4"));
    expect(onPress).toHaveBeenCalledWith(subtasks[4]);
  });

  test("BentoSupportingGrid renders all 4 bento cards and handles taps", async () => {
    const onActivity = jest.fn();
    const onReview = jest.fn();
    const onFunding = jest.fn();
    const onFiles = jest.fn();

    const view = await render(
      <BentoSupportingGrid
        onPressActivity={onActivity}
        onPressReview={onReview}
        onPressFunding={onFunding}
        onPressFiles={onFiles}
      />,
    );

    expect(view.getByText("Activity")).toBeOnTheScreen();
    expect(view.getByText("Updates & history")).toBeOnTheScreen();
    expect(view.getByText("Evidence & review")).toBeOnTheScreen();
    expect(view.getByText("Submissions")).toBeOnTheScreen();
    expect(view.getByText("Funding")).toBeOnTheScreen();
    expect(view.getByText("Financial records")).toBeOnTheScreen();
    expect(view.getByText("Files")).toBeOnTheScreen();
    expect(view.getByText("Attachments")).toBeOnTheScreen();

    await fireEvent.press(view.getByLabelText("Activity, Updates & history"));
    expect(onActivity).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByLabelText("Evidence & review, Submissions"));
    expect(onReview).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByLabelText("Funding, Financial records"));
    expect(onFunding).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByLabelText("Files, Attachments"));
    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  test("BentoSubtaskSupportingGrid omits Planning details and handles Subtask grid tiles", async () => {
    const onReview = jest.fn();
    const onFunding = jest.fn();
    const onFiles = jest.fn();

    const view = await render(
      <BentoSubtaskSupportingGrid
        onPressReview={onReview}
        onPressFunding={onFunding}
        onPressFiles={onFiles}
      />,
    );

    expect(view.getByText("Evidence & review")).toBeOnTheScreen();
    expect(view.getByText("Funding")).toBeOnTheScreen();
    expect(view.getByText("Files")).toBeOnTheScreen();
    expect(view.queryByText("Planning details")).toBeNull();
    expect(view.queryByText("Additional fields")).toBeNull();

    await fireEvent.press(view.getByLabelText("Files, Attachments"));
    expect(onFiles).toHaveBeenCalledTimes(1);

    // Test PlanningDetailsSheet standalone helper
    const sheetView = await render(
      <PlanningDetailsSheet
        open
        onClose={jest.fn()}
        description="Comprehensive planning scope"
        definitionOfDone="All invitations delivered"
        acceptanceCriteria={["Invitation emails dispatched", "RSVP sheet updated"]}
      />,
    );

    expect(sheetView.getByText("Planning details")).toBeOnTheScreen();
    expect(sheetView.getByText("Comprehensive planning scope")).toBeOnTheScreen();
    expect(sheetView.getByText("All invitations delivered")).toBeOnTheScreen();
    expect(sheetView.getByText("Invitation emails dispatched")).toBeOnTheScreen();
    expect(sheetView.getByText("RSVP sheet updated")).toBeOnTheScreen();
  });

  test("BentoProjectOnHoldCard renders warning state, explanation, and action unavailable badge", async () => {
    const view = await render(<BentoProjectOnHoldCard projectId="p-123" />);

    expect(view.getByText("Project on hold")).toBeOnTheScreen();
    expect(
      view.getByText("Work updates are paused while the project is under review."),
    ).toBeOnTheScreen();
    expect(view.getByText("Work actions unavailable")).toBeOnTheScreen();
  });

  test("BentoProjectOnHoldCard distinguishes Task Lead vs non-Task-Lead waiting state and navigates to Task details", async () => {
    const onNavigateParentTask = jest.fn();
    const nonLead = await render(
      <BentoProjectOnHoldCard projectId="p-123" waitingForTask />,
    );
    expect(
      nonLead.getByText(
        "The Task Lead must start the parent task before you can update or complete this subtask.",
      ),
    ).toBeOnTheScreen();
    expect(nonLead.queryByRole("button", { name: "Go to Task details" })).toBeNull();
    await nonLead.unmount();

    const lead = await render(
      <BentoProjectOnHoldCard
        projectId="p-123"
        waitingForTask
        isTaskLead
        onNavigateParentTask={onNavigateParentTask}
      />,
    );
    expect(
      lead.getByText(
        "You're the Task Lead. Start the parent task first before you can update or complete this subtask.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(lead.getByRole("button", { name: "Go to Task details" }));
    expect(onNavigateParentTask).toHaveBeenCalledTimes(1);
  });

  test("BentoEditButton renders Edit label, handles press, and sets accessibility", async () => {
    const onEdit = jest.fn();
    const view = await render(
      <BentoEditButton accessibilityLabel="Edit task" onPress={onEdit} />,
    );

    const button = view.getByRole("button", { name: "Edit task" });
    expect(view.getByText("Edit")).toBeOnTheScreen();
    await fireEvent.press(button);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  test("BentoDependenciesCard hides when empty and displays progress and items when populated", async () => {
    const emptyView = await render(<BentoDependenciesCard items={[]} />);
    expect(emptyView.queryByText("DEPENDENCIES")).toBeNull();

    const onPressItem = jest.fn();
    const view = await render(
      <BentoDependenciesCard
        items={[
          { id: "dep-1", title: "Approve venue", status: "completed", completed: true },
          { id: "dep-2", title: "Finalize budget", status: "in_progress", completed: false },
        ]}
        missingCount={1}
        onPressItem={onPressItem}
      />,
    );

    expect(view.getByText("DEPENDENCIES")).toBeOnTheScreen();
    expect(view.getByText("1 of 3 complete")).toBeOnTheScreen();
    expect(view.getByText("Approve venue")).toBeOnTheScreen();
    expect(view.getByText("Finalize budget")).toBeOnTheScreen();
    expect(view.getByText("+1 restricted or unavailable prerequisite")).toBeOnTheScreen();

    await fireEvent.press(
      view.getByRole("button", { name: "Open dependency Approve venue" }),
    );
    expect(onPressItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dep-1", title: "Approve venue" }),
    );
  });

  test("BentoSubtasksCard shows See all footer row when more than 3 subtasks exist and opens full list", async () => {
    const threeSubtasks: SubtaskItemData[] = Array.from({ length: 3 }, (_, i) => ({
      id: `sub-${i + 1}`,
      title: `Subtask ${i + 1}`,
      status: "todo",
      members: [],
    }));
    const threeView = await render(
      <BentoSubtasksCard
        subtasks={threeSubtasks}
        onPressSubtask={jest.fn()}
      />,
    );
    expect(threeView.getByText("Subtask 3")).toBeOnTheScreen();
    expect(threeView.queryByRole("button", { name: /See all/ })).toBeNull();

    const fourSubtasks: SubtaskItemData[] = Array.from({ length: 4 }, (_, i) => ({
      id: `sub-${i + 1}`,
      title: `Subtask ${i + 1}`,
      status: "todo",
      members: [],
    }));

    const view = await render(
      <BentoSubtasksCard
        subtasks={fourSubtasks}
        onPressSubtask={jest.fn()}
      />,
    );

    expect(view.getByText("Subtask 1")).toBeOnTheScreen();
    expect(view.getByText("Subtask 3")).toBeOnTheScreen();
    expect(view.queryByText("Subtask 4")).toBeNull();

    const seeAllBtn = view.getByRole("button", { name: "See all 4 subtasks" });
    expect(seeAllBtn).toBeOnTheScreen();
    await fireEvent.press(seeAllBtn);
    expect(view.getByTestId("mock-sheet")).toBeOnTheScreen();
    expect(view.getByText("Subtask 4")).toBeOnTheScreen();
  });

  test("BentoSubtaskSupportingGrid renders 4 tiles when showFunding is true and 3 tiles when false (without Planning details)", async () => {
    const onPressActivity = jest.fn();
    const onPressReview = jest.fn();
    const onPressFunding = jest.fn();
    const onPressFiles = jest.fn();

    const officeView = await render(
      <BentoSubtaskSupportingGrid
        showFunding={true}
        onPressActivity={onPressActivity}
        onPressReview={onPressReview}
        onPressFunding={onPressFunding}
        onPressFiles={onPressFiles}
      />,
    );

    expect(
      officeView.queryByRole("button", { name: "Planning details, Additional fields" }),
    ).toBeNull();
    expect(
      officeView.getByRole("button", { name: "Activity, Updates & history" }),
    ).toBeOnTheScreen();
    expect(
      officeView.getByRole("button", { name: "Evidence & review, Submissions" }),
    ).toBeOnTheScreen();
    expect(
      officeView.getByRole("button", { name: "Funding, Financial records" }),
    ).toBeOnTheScreen();
    expect(
      officeView.getByRole("button", { name: "Files, Attachments" }),
    ).toBeOnTheScreen();

    await fireEvent.press(
      officeView.getByRole("button", { name: "Activity, Updates & history" }),
    );
    expect(onPressActivity).toHaveBeenCalledTimes(1);
    await officeView.unmount();

    const personalView = await render(
      <BentoSubtaskSupportingGrid
        showFunding={false}
        onPressActivity={onPressActivity}
        onPressReview={onPressReview}
        onPressFiles={onPressFiles}
      />,
    );

    expect(
      personalView.getByRole("button", { name: "Activity, Updates & history" }),
    ).toBeOnTheScreen();
    expect(
      personalView.getByRole("button", { name: "Evidence & review, Submissions" }),
    ).toBeOnTheScreen();
    expect(
      personalView.getByRole("button", { name: "Files, Attachments" }),
    ).toBeOnTheScreen();
    expect(
      personalView.queryByRole("button", { name: "Planning details, Additional fields" }),
    ).toBeNull();
    expect(
      personalView.queryByRole("button", { name: "Funding, Financial records" }),
    ).toBeNull();
  });

  test("BentoOverviewHeroCard renders navy hero completion ring, circular icon status/priority pods, and stacks at 200% fontScale", async () => {
    const rowSpy = jest.spyOn(ReactNative.Dimensions, "get").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
    try {
      const view = await render(
        <BentoOverviewHeroCard
          title="Task completion"
          subtitle="2 of 3 subtasks completed"
          percent={67}
          statusLabel="In progress"
          statusCode="in_progress"
          priorityLabel="High"
          priorityRaw="high"
        />,
      );

      expect(view.getByText("Task completion")).toBeOnTheScreen();
      expect(view.getByText("2 of 3 subtasks completed")).toBeOnTheScreen();
      expect(view.getByText("67%")).toBeOnTheScreen();
      expect(view.getByLabelText("Status: In progress")).toBeOnTheScreen();
      expect(view.getByLabelText("Priority: High")).toBeOnTheScreen();

      const statusPod = view.getByLabelText("Status: In progress");
      expect(statusPod.parent).toHaveStyle({ flexDirection: "row" });
    } finally {
      rowSpy.mockRestore();
    }

    const scaledSpy = jest.spyOn(ReactNative.Dimensions, "get").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 2,
    });
    try {
      const scaled = await render(
        <BentoOverviewHeroCard
          title="Subtask completion"
          subtitle="1 of 2 child subtasks completed"
          percent={50}
          statusLabel="Awaiting approval"
          statusCode="for_review"
          priorityLabel="Urgent"
          priorityRaw="urgent"
        />,
      );
      expect(
        scaled.getByLabelText("Status: Awaiting approval").parent,
      ).toHaveStyle({ flexDirection: "column" });
    } finally {
      scaledSpy.mockRestore();
    }
  });
});
