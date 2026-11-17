import { expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AppearanceProvider } from "../Appearance";
import { Choice, DateField, SearchField } from "../Fields";
import { FilterChip } from "../FilterChip";

test.each([false, true])("confirmed picker stages changes and discards X/Cancel until explicit confirmation; multiple=%s", async (multiple) => {
  const onChange = jest.fn();
  const view = await render(<Choice label="People" confirmSelection multiple={multiple}
    value={multiple ? ["a"] : "a"} onChange={onChange}
    options={[{ value: "a", label: "Andres" }, { value: "c", label: "Crisostomo" }]} />);
  await fireEvent.press(view.getByRole("button", { name: "People" }));
  await fireEvent.press(view.getByRole(multiple ? "checkbox" : "radio", { name: "Crisostomo" }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole("button", { name: "Cancel selection" }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole("button", { name: "People" }));
  expect(view.getByRole(multiple ? "checkbox" : "radio", { name: "Crisostomo" })).not.toBeChecked();
  await fireEvent.press(view.getByRole(multiple ? "checkbox" : "radio", { name: "Crisostomo" }));
  await fireEvent.press(view.getByRole("button", { name: "Confirm selection" }));
  expect(onChange).toHaveBeenCalledWith(multiple ? ["a", "c"] : "c");
});

test("Choice shows Search options by default even with fewer than six options and filters results", async () => {
  const onChange = jest.fn();
  const view = await render(
    <Choice
      label="Appointed Lead"
      value="user-1"
      onChange={onChange}
      options={[
        { value: "user-1", label: "Andres Manili", description: "Lead Officer" },
        { value: "user-2", label: "Crisostomo Ibarra", description: "Field Member" },
      ]}
    />,
  );

  await fireEvent.press(view.getByRole("button", { name: "Appointed Lead" }));
  const searchInput = view.getByLabelText("Search options");
  expect(searchInput).toBeOnTheScreen();

  await fireEvent.changeText(searchInput, "  crisostomo ");
  expect(view.queryByRole("radio", { name: "Andres Manili" })).toBeNull();
  expect(view.getByRole("radio", { name: "Crisostomo Ibarra" })).toBeOnTheScreen();

  await fireEvent.press(view.getByRole("radio", { name: "Crisostomo Ibarra" }));
  expect(onChange).toHaveBeenCalledWith("user-2");
});

test("Choice omits Search options when searchable is false even with six or more static options", async () => {
  const view = await render(
    <Choice
      label="Attention type"
      value="all"
      searchable={false}
      onChange={() => {}}
      options={[
        { value: "all", label: "all" },
        { value: "overdue", label: "overdue" },
        { value: "due_soon", label: "due soon" },
        { value: "blocked", label: "blocked" },
        { value: "stalled", label: "stalled" },
        { value: "awaiting_review", label: "awaiting review" },
        { value: "changes_requested", label: "changes requested" },
      ]}
    />,
  );

  await fireEvent.press(view.getByRole("button", { name: "Attention type" }));
  expect(view.queryByLabelText("Search options")).toBeNull();
  expect(view.getByRole("radio", { name: "changes requested" })).toBeOnTheScreen();
});

test("Choice renders inline errors inside the open picker and DateField uses Confirm date instead of Done", async () => {
  const view = await render(
    <>
      <Choice
        label="Prerequisite tasks"
        multiple
        value={["late"]}
        error="Schedule each prerequisite with a valid due date."
        onChange={() => {}}
        options={[
          { value: "unscheduled", label: "Unscheduled item", disabled: true },
          { value: "late", label: "Late item" },
        ]}
      />
      <DateField label="Start date" value="2026-11-16" onChange={() => {}} />
    </>,
  );

  expect(view.getByText("Schedule each prerequisite with a valid due date.")).toBeOnTheScreen();
  await fireEvent.press(view.getByRole("button", { name: "Prerequisite tasks" }));
  expect(view.getByRole("checkbox", { name: "Unscheduled item" })).toBeDisabled();
  expect(view.getByText("Schedule each prerequisite with a valid due date.")).toBeOnTheScreen();

  await fireEvent.press(view.getByRole("button", { name: "Start date" }));
  expect(view.queryByRole("button", { name: "Done" })).toBeNull();
  expect(view.getByRole("button", { name: "Confirm date" })).toBeOnTheScreen();
});

test("SearchField applies dark mode theme tokens, clear action, and docked filterTrigger", async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: unknown) =>
    Promise.resolve(key === "eflow.appearance" ? "dark" : null),
  );
  const onChange = jest.fn();
  const onFilterPress = jest.fn();

  const view = await render(
    <AppearanceProvider>
      <SearchField
        value="budget"
        onChange={onChange}
        placeholder="Search projects"
        accessibilityLabel="Search projects"
        filterTrigger={{
          label: "Active",
          accessibilityLabel: "Filter projects: Active",
          active: true,
          onPress: onFilterPress,
        }}
      />
    </AppearanceProvider>,
  );

  const input = view.getByLabelText("Search projects");
  await waitFor(() => {
    expect(input).toHaveStyle({ color: "#eef3ff" });
  });

  await fireEvent.press(view.getByRole("button", { name: "Clear search text" }));
  expect(onChange).toHaveBeenCalledWith("");

  await fireEvent.press(view.getByRole("button", { name: "Filter projects: Active" }));
  expect(onFilterPress).toHaveBeenCalledTimes(1);
});

test("FilterChip supports showZeroCount, selected state, and removable chips", async () => {
  const onPress = jest.fn();
  const view = await render(
    <>
      <FilterChip
        label="Settled"
        count={0}
        showZeroCount
        selected
        accessibilityLabel="Settled · 0"
        onPress={onPress}
      />
      <FilterChip
        label="Archived"
        tone="tinted"
        removable
        accessibilityLabel="Remove filter: Archived"
        onPress={onPress}
      />
    </>,
  );

  const settledChip = view.getByRole("button", { name: "Settled · 0" });
  expect(settledChip).toBeOnTheScreen();
  expect(view.getByText("0")).toBeOnTheScreen();

  const removeChip = view.getByRole("button", { name: "Remove filter: Archived" });
  await fireEvent.press(removeChip);
  expect(onPress).toHaveBeenCalledTimes(1);
});
