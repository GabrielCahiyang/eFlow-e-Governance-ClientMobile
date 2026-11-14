import { expect, jest, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Sheet } from "../Sheet";
import { Text } from "../Typography";

test("action errors render above the fields and keep the original submit label", async () => {
  const onClose = jest.fn();
  const form = (actionError?: Error) => (
    <Sheet
      open
      title="Add subtask"
      onClose={onClose}
      actionError={actionError}
      footer={<Text>Save changes</Text>}
    >
      <Text>Start date</Text>
    </Sheet>
  );
  const view = await render(form());
  expect(view.queryByRole("alert")).toBeNull();
  await view.rerender(form(new Error("Title is required.")));
  expect(view.getByRole("alert")).toBeOnTheScreen();
  expect(view.getByText("Title is required.")).toBeOnTheScreen();
  expect(view.getByText("Save changes")).toBeOnTheScreen();
  expect(JSON.stringify(view.toJSON()).indexOf("Title is required.")).toBeLessThan(
    JSON.stringify(view.toJSON()).indexOf("Start date"),
  );
});
