import { expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import type { DepartmentReportRow } from "../../../../core/web/app/features/reports/types";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { colors, darkColors } from "../../../components/ui/theme";
import { ReportRows } from "../ReportRows";

const sampleRows: DepartmentReportRow[] = [
  {
    id: "row-1",
    kind: "operations",
    title: "Procure Field Kits",
    parent: "Hardware & Field Deployment",
    project: "Digital Registry",
    person: "Maria Santos",
    role: "Task Lead",
    status: "in progress",
    priority: "high",
    progress: 75,
    eventAt: 1700000000000,
    dueAt: 1700500000000,
    metric: "3 of 4 subtasks complete",
    detail: "Awaiting supplier OR delivery slip.",
    taskId: "task-1",
  },
  {
    id: "row-2",
    kind: "reviews",
    title: "Verify Connectivity Audit",
    parent: "Submission Attempt 2",
    project: "Rural Network",
    person: "Carlos Reyes",
    role: "Subitem Lead",
    status: "for review",
    priority: "medium",
    eventAt: 1700000000000,
    metric: "4.2h waiting",
    detail: "Submitted for independent review.",
    assignedReviewer: "QA Reviewer",
    decisionAuthor: "Not decided",
    taskId: "task-2",
  },
];

test("ReportRows renders mobile cards by default, supports Cards/Table toggle, dark-mode titles, and opens inspector sheet", async () => {
  const navigate = jest.fn();
  const view = await render(
    <ReportRows rows={sampleRows} navigate={navigate} />,
  );

  expect(view.getByText("RECORDS · 2")).toBeOnTheScreen();
  expect(view.getByRole("tab", { name: "Cards view", selected: true })).toBeOnTheScreen();
  expect(view.getByText("Procure Field Kits")).toHaveStyle({
    color: colors.primary,
  });
  expect(view.getByText("In progress")).toBeOnTheScreen();
  expect(view.getByText("Awaiting approval")).toBeOnTheScreen();
  expect(view.getByText("75% · 3 of 4 subtasks complete")).toBeOnTheScreen();

  // Switch to horizontal DataTable view
  await fireEvent.press(view.getByRole("tab", { name: "Table view" }));
  expect(
    view.getByText("Swipe horizontally to view all 7 columns"),
  ).toBeOnTheScreen();
  expect(view.getByText("Work item")).toBeOnTheScreen();

  // Switch back to Cards and inspect second row
  await fireEvent.press(view.getByRole("tab", { name: "Cards view" }));
  await fireEvent.press(
    view.getByRole("button", { name: /Inspect Verify Connectivity Audit/ }),
  );
  expect(view.getByText("QA Reviewer")).toBeOnTheScreen();
  expect(view.getByText("Submitted for independent review.")).toBeOnTheScreen();

  await fireEvent.press(
    view.getByRole("button", { name: "Open work record" }),
  );
  expect(navigate).toHaveBeenCalledWith({
    name: "task",
    id: "task-2",
  });
});

test("ReportRows uses high-contrast dark theme primary titles and stacks footer metadata at 200% font scale", async () => {
  await AsyncStorage.setItem("eflow.appearance", "dark");
  const spy = jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
    width: 390,
    height: 844,
    scale: 3,
    fontScale: 2,
  });
  try {
    const view = await render(
      <AppearanceProvider>
        <ReportRows rows={[sampleRows[0]]} navigate={jest.fn()} />
      </AppearanceProvider>,
    );

    await waitFor(() => {
      expect(view.getByText("Procure Field Kits")).toHaveStyle({
        color: darkColors.primary,
      });
    });
    expect(
      view.getByText("Maria Santos · Task Lead").parent,
    ).toHaveStyle({
      flexDirection: "column",
      alignItems: "flex-start",
    });
  } finally {
    spy.mockRestore();
    await AsyncStorage.removeItem("eflow.appearance");
  }
});

test("ReportRows uses shared Status pill design with icon instead of dot", async () => {
  const todoRow: DepartmentReportRow = {
    ...sampleRows[0],
    id: "row-todo",
    status: "to do",
  };
  const stalledRow: DepartmentReportRow = {
    ...sampleRows[1],
    id: "row-stalled",
    status: "stalled",
  };
  const view = await render(
    <ReportRows rows={[todoRow, stalledRow]} navigate={jest.fn()} />,
  );

  const todoPill = view.getByLabelText("Status: To do");
  const todoStyle = ReactNative.StyleSheet.flatten(todoPill.props.style);
  expect(todoStyle.borderRadius).toBe(999);
  expect(todoStyle.borderWidth).toBe(1);
  expect(todoStyle.backgroundColor).toBe(colors.blueSoft);
  expect(view.getByText("To do")).toHaveStyle({ color: colors.blue });

  const stalledPill = view.getByLabelText("Status: Stalled");
  const stalledStyle = ReactNative.StyleSheet.flatten(stalledPill.props.style);
  expect(stalledStyle.backgroundColor).toBe(colors.warningSoft);
  expect(view.getByText("Stalled")).toHaveStyle({ color: colors.warning });
});
