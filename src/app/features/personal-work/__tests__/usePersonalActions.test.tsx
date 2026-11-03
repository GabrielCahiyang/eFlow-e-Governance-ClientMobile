import { beforeEach, test, expect, jest } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { usePersonalActions } from "../usePersonalActions";
import { draftStore } from "../../../../platform/draftStore";
import { sendPersonalRequest, PersonalCommandFailure } from "../services";
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));
jest.mock("../services", () => ({
  sendPersonalRequest: jest.fn(),
  PersonalCommandFailure: class extends Error {
    confirmedRejected: boolean;
    constructor(confirmed: boolean, message: string) {
      super(message);
      this.confirmedRejected = confirmed;
    }
  },
}));
const request = {
  schema: 1 as const,
  actor: "actor",
  project: "project",
  command: "create_task" as const,
  payload: { title: "Original task", lead_id: "actor" },
  request: "request-original",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(draftStore.get).mockReset().mockResolvedValue(null);
  jest.mocked(draftStore.set).mockReset().mockResolvedValue(undefined);
  jest.mocked(draftStore.remove).mockReset().mockResolvedValue(undefined);
  jest.mocked(sendPersonalRequest).mockReset();
});
test("restored personal request blocks replacement and retries the original terms and ID", async () => {
  jest.mocked(draftStore.get).mockResolvedValue(request);
  jest.mocked(sendPersonalRequest).mockResolvedValue({ saved: true });
  const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    { result } = await renderHook(() =>
      usePersonalActions("actor", "project", onSaved),
    );
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    expect(
      await result.current.run("create_task", { title: "Different task" }),
    ).toBe(false);
  });
  expect(sendPersonalRequest).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.retry();
  });
  expect(sendPersonalRequest).toHaveBeenCalledWith(request);
  expect(draftStore.remove).toHaveBeenCalledWith(
    "actor",
    "personal-command:project",
  );
  expect(onSaved).toHaveBeenCalledTimes(1);
});
test("unreadable or cross-scope requests fail closed and cannot be overwritten", async () => {
  jest
    .mocked(draftStore.get)
    .mockResolvedValue({ ...request, actor: "another-actor" });
  const { result } = await renderHook(() =>
    usePersonalActions("actor", "project", async () => {}),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.recoveryBlocked).toBe(true);
  await act(async () => {
    await result.current.run("complete_project", {});
  });
  expect(draftStore.set).not.toHaveBeenCalled();
  expect(sendPersonalRequest).not.toHaveBeenCalled();
});
test("unknown outcomes retain the durable request; only a confirmed rollback permits discard", async () => {
  jest
    .mocked(sendPersonalRequest)
    .mockRejectedValueOnce(new Error("Connection lost"));
  const { result } = await renderHook(() =>
    usePersonalActions("actor", "project", async () => {}),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.run("progress_task", {
      task_id: "task",
      revision: 3,
      progress: 50,
    });
  });
  expect(draftStore.set).toHaveBeenCalledTimes(1);
  expect(result.current.pending?.payload.progress).toBe(50);
  expect(result.current.canDiscard).toBe(false);
  await act(async () => {
    await result.current.discard();
  });
  expect(draftStore.remove).not.toHaveBeenCalled();
  jest
    .mocked(sendPersonalRequest)
    .mockRejectedValueOnce(
      new PersonalCommandFailure(true, "Revision changed"),
    );
  await act(async () => {
    await result.current.retry();
  });
  expect(result.current.canDiscard).toBe(true);
  expect(jest.mocked(sendPersonalRequest).mock.calls[1][0].request).toBe(
    jest.mocked(sendPersonalRequest).mock.calls[0][0].request,
  );
  await act(async () => {
    await result.current.discard();
  });
  expect(result.current.pending).toBeNull();
});
