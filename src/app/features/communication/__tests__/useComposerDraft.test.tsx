import { expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { draftStore } from "../../../../platform/draftStore";
import { useComposerDraft } from "../useComposerDraft";

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

test("unsent text survives leaving a conversation and stays separate by actor, channel, and send identity", async () => {
  const records = new Map<string, unknown>();
  jest
    .mocked(draftStore.get)
    .mockImplementation(
      async (actor, key) => (records.get(actor + key) as never) ?? null,
    );
  jest.mocked(draftStore.set).mockImplementation(async (actor, key, value) => {
    records.set(actor + key, value);
  });
  jest.mocked(draftStore.remove).mockImplementation(async (actor, key) => {
    records.delete(actor + key);
  });
  const view = await renderHook(
    ({ actor, channel }: { actor: string; channel: string }) =>
      useComposerDraft(actor, channel),
    { initialProps: { actor: "actor-a", channel: "channel-a" } },
  );
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  await act(() => view.result.current.setValue("Keep this draft"));
  await view.rerender({ actor: "actor-a", channel: "channel-b" });
  expect(view.result.current.value).toBe("");
  await view.rerender({ actor: "actor-b", channel: "channel-a" });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  expect(view.result.current.value).toBe("");
  await view.rerender({ actor: "actor-a", channel: "channel-a" });
  await waitFor(() =>
    expect(view.result.current.value).toBe("Keep this draft"),
  );
  expect(draftStore.set).toHaveBeenCalledWith(
    "actor-a",
    "chat-composer:channel-a",
    "Keep this draft",
  );
  await act(async () => view.result.current.clear());
  expect(view.result.current.value).toBe("");
  expect(draftStore.remove).toHaveBeenCalledWith(
    "actor-a",
    "chat-composer:channel-a",
  );
});
