import { expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { AppearanceProvider } from "../Appearance";
import { PageHeader } from "../PageHeader";
import { NavigationHeaderContext } from "../../../features/navigation/navigationHeaderContext";

test("PageHeader renders title, subtitle, and right accessory without Back when no navigation context exists", async () => {
  const view = await render(
    <AppearanceProvider>
      <PageHeader
        title="Projects"
        subtitle="Authorized Office & personal projects"
        right={<Text>Action</Text>}
      />
    </AppearanceProvider>,
  );

  expect(view.getByRole("header", { name: "Projects" })).toBeOnTheScreen();
  expect(
    view.getByText("Authorized Office & personal projects"),
  ).toBeOnTheScreen();
  expect(view.getByText("Action")).toBeOnTheScreen();
  expect(view.queryByRole("button", { name: "Back" })).toBeNull();
});

test("PageHeader uses NavigationHeaderContext onBack and hint for circular Back button", async () => {
  const onBack = jest.fn();
  const view = await render(
    <AppearanceProvider>
      <NavigationHeaderContext.Provider
        value={{
          onBack,
          backHint: "Returns to Home",
          topInset: 24,
          routeTitle: "Reviews",
        }}
      >
        <PageHeader title="Reviews" subtitle="All assigned reviews handled" />
      </NavigationHeaderContext.Provider>
    </AppearanceProvider>,
  );

  const backButton = view.getByRole("button", { name: "Back" });
  expect(backButton.props.accessibilityHint).toBe("Returns to Home");
  await fireEvent.press(backButton);
  expect(onBack).toHaveBeenCalledTimes(1);
});
