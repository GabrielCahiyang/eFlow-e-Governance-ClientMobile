import { expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AccountActionContext } from "../AccountActionAccess";
import { useAction } from "../useAction";

test("background readiness gates an existing handler immediately and preserves public feedback", async () => {
  const access = {
    current: { actor: "worker-a" as string | null, ready: true },
  };
  const view = await renderHook(() => useAction(), {
    wrapper: ({ children }) => (
      <AccountActionContext.Provider value={access}>
        {children}
      </AccountActionContext.Provider>
    ),
  });
  const oldHandler = view.result.current.run,
    write = jest.fn(async () => {});
  access.current.ready = false;
  await act(async () => {
    expect(await oldHandler(write)).toBe(false);
  });
  expect(write).not.toHaveBeenCalled();
  expect(view.result.current.error?.message).toContain("Please wait");
  access.current.ready = true;
  await act(async () => {
    expect(await view.result.current.run(write)).toBe(true);
  });
  expect(write).toHaveBeenCalledTimes(1);
  access.current = { actor: "worker-b", ready: true };
  await act(async () => {
    expect(await oldHandler(write)).toBe(false);
  });
  expect(write).toHaveBeenCalledTimes(1);
});
