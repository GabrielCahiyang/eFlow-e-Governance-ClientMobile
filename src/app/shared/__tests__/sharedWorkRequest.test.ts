import { expect, jest, test } from "@jest/globals";
import { saveSharedWork } from "../sharedWorkRequest";

const mockSet = jest.fn(
  async (_actor: string, _scope: string, _request: unknown) => {},
);
const mockRemove = jest.fn(async (_actor: string, _scope: string) => {});
const mockRpc = jest.fn<
  (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { code: string; message: string } | null;
  }>
>();
jest.mock("../../../platform/draftStore", () => ({
  draftStore: {
    set: (...args: Parameters<typeof mockSet>) => mockSet(...args),
    remove: (...args: Parameters<typeof mockRemove>) => mockRemove(...args),
  },
}));
jest.mock("../../../platform/supabase", () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "lead" } } } }),
    },
  },
}));

test("allocation receipt recovery freezes the request and retains it when current access changed", async () => {
  mockRpc.mockResolvedValueOnce({ data: null, error: null });
  mockRpc.mockResolvedValueOnce({
    data: null,
    error: { code: "42501", message: "Access changed" },
  });
  mockRpc.mockResolvedValueOnce({ data: "allocation-id", error: null });
  const request = {
    id: "original",
    args: { p_task: "task", p_key: "original" },
  };
  const send = (recovering: boolean) =>
    saveSharedWork(
      "lead",
      "allocation",
      "allocate_project_task_funding",
      request,
      (value): value is string => value === "allocation-id",
      recovering,
    );

  await expect(send(false)).rejects.toThrow(/could not be confirmed/i);
  expect(mockRemove).not.toHaveBeenCalled();
  await expect(send(true)).rejects.toThrow("Access changed");
  expect(mockRemove).not.toHaveBeenCalled();
  await expect(send(true)).resolves.toBe("allocation-id");
  expect(mockRpc.mock.calls).toEqual(
    Array(3).fill(["allocate_project_task_funding", request.args]),
  );
  expect(mockSet).toHaveBeenCalledTimes(3);
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
