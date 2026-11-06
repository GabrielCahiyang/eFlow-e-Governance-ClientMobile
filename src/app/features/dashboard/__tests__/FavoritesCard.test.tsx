import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { FavoritesCard } from "../FavoritesCard";
test("carousel pages represent real favorites and the add tile, retaining exact workspace actions", async () => {
  const add = jest.fn(),
    select = jest.fn();
  const view = await render(
    <FavoritesCard
      pinned={[]}
      loading={false}
      onFavorites={add}
      onOpenWorkspace={select}
    />,
  );
  expect(
    view.getByRole("button", { name: "Favorite page 1 of 1" }),
  ).toBeOnTheScreen();
  expect(view.queryByRole("button", { name: /Favorite page 2/ })).toBeNull();
  await fireEvent.press(
    view.getByRole("button", { name: "Add favorite workspaces" }),
  );
  expect(add).toHaveBeenCalledTimes(1);
  await view.rerender(
    <FavoritesCard
      pinned={[{ id: "office-a", name: "Planning Office" }]}
      loading={false}
      onFavorites={add}
      onOpenWorkspace={select}
    />,
  );
  await fireEvent.press(
    view.getByRole("button", {
      name: "Open favorite workspace Planning Office",
    }),
  );
  expect(select).toHaveBeenCalledWith("office-a");
  await fireEvent.press(
    view.getByRole("button", { name: "Favorite page 2 of 2" }),
  );
  expect(
    view.getByRole("button", { name: "Favorite page 2 of 2" }).props
      .accessibilityState.selected,
  ).toBe(true);
  await view.rerender(
    <FavoritesCard
      pinned={[]}
      loading={false}
      onFavorites={add}
      onOpenWorkspace={select}
    />,
  );
  expect(
    view.getByRole("button", { name: "Favorite page 1 of 1" }).props
      .accessibilityState.selected,
  ).toBe(true);
});
