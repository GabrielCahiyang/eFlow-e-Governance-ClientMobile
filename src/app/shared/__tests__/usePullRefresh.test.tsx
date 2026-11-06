import { expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { usePullRefresh } from "../usePullRefresh";

test("a held pull is not duplicated and a failed refresh clears the indicator and permits retry", async () => {
  let fail!: (error: Error) => void;
  const load = jest
    .fn<() => Promise<void>>()
    .mockImplementationOnce(
      () =>
        new Promise((_yes, no) => {
          fail = no;
        }),
    )
    .mockResolvedValue(undefined);
  const view = await renderHook(() => usePullRefresh(load));
  await act(async () => {
    void view.result.current.refresh();
    void view.result.current.refresh();
  });
  expect(load).toHaveBeenCalledTimes(1);
  expect(view.result.current.refreshing).toBe(true);
  await act(async () => fail(new Error("Network request failed")));
  expect(view.result.current.refreshing).toBe(false);
  expect(view.result.current.error).toBeDefined();
  await act(async () => view.result.current.refresh());
  expect(view.result.current.error).toBeUndefined();
  expect(view.result.current.refreshing).toBe(false);
  expect(load).toHaveBeenCalledTimes(2);
});
