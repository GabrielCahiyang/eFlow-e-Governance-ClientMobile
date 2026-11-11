import { expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useChatAttachment } from "../useChatAttachment";
import { draftStore } from "../../../../platform/draftStore";

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

test("a picked attachment survives reopening its composer and stays scoped to the actor", async () => {
  const records = new Map<string, unknown>();
  jest
    .mocked(draftStore.get)
    .mockImplementation(
      async (actor, scope) => (records.get(actor + scope) as never) ?? null,
    );
  jest
    .mocked(draftStore.set)
    .mockImplementation(async (actor, scope, value) => {
      records.set(actor + scope, value);
    });
  const file = {
    name: "draft.jpg",
    uri: "file:///draft.jpg",
    type: "image/jpeg",
    size: 12,
    arrayBuffer: async () => new ArrayBuffer(12),
  };
  const view = await renderHook(() => useChatAttachment("actor", "thread"));
  await act(async () => view.result.current.set(file));
  await view.unmount();
  const reopened = await renderHook(() => useChatAttachment("actor", "thread"));
  await waitFor(() =>
    expect(reopened.result.current.file?.name).toBe(file.name),
  );
  const other = await renderHook(() => useChatAttachment("other", "thread"));
  await waitFor(() => expect(other.result.current.loading).toBe(false));
  expect(other.result.current.file).toBeUndefined();
});
