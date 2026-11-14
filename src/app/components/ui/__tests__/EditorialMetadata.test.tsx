import { expect, test, describe } from "@jest/globals";
import { render } from "@testing-library/react-native";
import {
  EditorialMetadataStrip,
  EditorialMetadataInline,
  EditorialStatus,
} from "../EditorialMetadata";
import Calendar from "lucide-react-native/icons/calendar";

describe("EditorialMetadata", () => {
  test("EditorialMetadataStrip renders labels, values, and status accents", async () => {
    const view = await render(
      <EditorialMetadataStrip
        items={[
          {
            label: "Status",
            value: "In progress",
            status: "in_progress",
          },
          {
            label: "Priority",
            value: "High",
            accent: "#ef4444",
          },
        ]}
      />,
    );

    expect(view.getByText("STATUS")).toBeOnTheScreen();
    expect(view.getByText("In progress")).toBeOnTheScreen();
    expect(view.getByText("PRIORITY")).toBeOnTheScreen();
    expect(view.getByText("High")).toBeOnTheScreen();
  });

  test("EditorialMetadataInline renders compact inline metadata with dividers", async () => {
    const view = await render(
      <EditorialMetadataInline
        items={[
          {
            value: "In progress",
            status: "in_progress",
          },
          {
            icon: <Calendar size={12} color="#888" />,
            value: "Nov 12, 2026",
          },
          {
            label: "Role",
            value: "Task Lead",
          },
        ]}
      />,
    );

    expect(view.getByText("In progress")).toBeOnTheScreen();
    expect(view.getByText("Nov 12, 2026")).toBeOnTheScreen();
    expect(view.getByText("ROLE")).toBeOnTheScreen();
    expect(view.getByText("Task Lead")).toBeOnTheScreen();
  });

  test("EditorialStatus renders clean status typography without pills", async () => {
    const view = await render(<EditorialStatus value="completed" />);
    expect(view.getByText("Completed")).toBeOnTheScreen();
    expect(view.getByLabelText("Status: Completed")).toBeOnTheScreen();
  });
});
