import { expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { TaskEvidenceSheet } from "../TaskEvidenceSheet";
import { sendTaskEvidence } from "../taskEvidence";
import { captureEvidencePhoto } from "../../../../platform/evidenceFiles";
import { chooseFiles } from "../../../../platform/files";
import { draftStore } from "../../../../platform/draftStore";
import { confirmAction } from "../../../shared/confirm";

jest.mock("../taskEvidence", () => ({
  evidenceScope: () => "task-evidence:root",
  sendTaskEvidence: jest.fn(),
}));
jest.mock("../../../../platform/evidenceFiles", () => ({
  captureEvidencePhoto: jest.fn(),
}));
jest.mock("../../../../platform/files", () => ({ chooseFiles: jest.fn() }));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { set: jest.fn(), remove: jest.fn(async () => {}) },
}));
jest.mock("../../../../platform/webRuntime", () => ({
  nativeWindow: { dispatchEvent: jest.fn() },
}));
jest.mock("../../../shared/confirm", () => ({ confirmAction: jest.fn() }));

test("selection and camera failure are local, then a confirmed submission resumes the same draft after interruption", async () => {
  jest
    .mocked(chooseFiles)
    .mockResolvedValueOnce([
      {
        uri: "file:///safe.pdf",
        name: "safe.pdf",
        type: "application/pdf",
        size: 4,
        arrayBuffer: async () => new ArrayBuffer(4),
      },
    ]);
  jest
    .mocked(captureEvidencePhoto)
    .mockRejectedValueOnce(new Error("Allow camera access or choose a file."));
  jest
    .mocked(confirmAction)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  jest
    .mocked(sendTaskEvidence)
    .mockRejectedValueOnce(new Error("Upload interrupted"))
    .mockResolvedValueOnce(undefined);
  const onSaved = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  await render(
    <TaskEvidenceSheet
      actor="worker"
      taskId="root"
      saved={null}
      verifyAccess={jest.fn<() => Promise<void>>()}
      onSaved={onSaved}
      onClose={jest.fn()}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  expect(screen.getByText("safe.pdf")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Take photo" }));
  await waitFor(() =>
    expect(screen.getByText(/Allow camera access/)).toBeOnTheScreen(),
  );
  expect(screen.getByText("safe.pdf")).toBeOnTheScreen();
  await fireEvent.changeText(
    screen.getByLabelText("Completion note"),
    "QA note",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit for review" }),
  );
  expect(sendTaskEvidence).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Submit for review" }),
  );
  await waitFor(() =>
    expect(screen.getByText("The upload stopped before it finished. Check and resume your submission.")).toBeOnTheScreen(),
  );
  const request = jest.mocked(sendTaskEvidence).mock.calls[0][0].request;
  expect(request.files.map((file) => file.name)).toEqual(["safe.pdf"]);
  await fireEvent.press(
    screen.getByRole("button", { name: "Check and resume submission" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Evidence submission confirmed")).toBeOnTheScreen(),
  );
  expect(jest.mocked(sendTaskEvidence).mock.calls[1][0].request.id).toBe(
    request.id,
  );
  expect(draftStore.remove).toHaveBeenCalledWith(
    "worker",
    "task-evidence:root",
  );
  expect(onSaved).toHaveBeenCalledTimes(1);
});
