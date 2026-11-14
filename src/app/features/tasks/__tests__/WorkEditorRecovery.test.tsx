import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { captureWorkEditorBaseline } from "../../../../core/web/app/features/nested-work/selectors/editorDraft";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { WorkRequestFailure } from "../../../../core/web/app/features/nested-work/types/editor";
import { draftStore } from "../../../../platform/draftStore";
import { recoverWorkRequest } from "../workRecovery";
import { WorkEditorSheet } from "../WorkEditorSheet";

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "actor" } }),
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), remove: jest.fn() },
}));
jest.mock("../workRecovery", () => ({
  ...jest.requireActual<object>("../workRecovery"),
  recoverWorkRequest: jest.fn(),
}));

test("a confirmed rejection restores saved Subtask details with the specific error", async () => {
  const data = {
    root: { id: "task", kind: "office", office: "office", project: "project",
      open: true, people: [], capabilities: { create_child: { allowed: true, reason_code: null } } },
    revision: 3,
    nodes: [],
    people: [],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(data, "actor");
  const edit = { command: "create" } as const;
  const baseline = captureWorkEditorBaseline(data, edit, "actor", "original-node");
  jest.mocked(draftStore.get).mockResolvedValue({
    baseline,
    fields: { ...baseline.fields, title: "Prepare venue invitation" },
    request: { id: "original-request", revision: 3, command: "create", payload: {} },
  });
  jest.mocked(recoverWorkRequest).mockRejectedValue(
    new WorkRequestFailure("confirmed_failure", "Choose a start date within the parent schedule, or reschedule the parent first"),
  );
  await render(<WorkEditorSheet data={data} edit={edit} onClose={jest.fn()} onSaved={async () => {}} />);
  expect(await screen.findByText(/An earlier save still needs to be confirmed/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Add subtask" }));
  expect(await screen.findByText(/Choose a start date within the parent schedule/)).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Prepare venue invitation")).toHaveProp("editable", true);
  expect(draftStore.remove).toHaveBeenCalledWith("actor", "work.task");
});

test("a confirmed save closes the editor and refreshes the list without a notice", async () => {
  const data = {
    root: {
      id: "task", kind: "office", office: "office", project: "project",
      open: true, lead: "task-lead", people: [],
      scheduling: { version: 1, today: "2026-11-13" },
      capabilities: { create_child: { allowed: true, reason_code: null } },
    },
    revision: 3,
    nodes: [],
    people: [],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(data, "actor");
  const edit = { command: "create" } as const;
  const baseline = captureWorkEditorBaseline(data, edit, "actor", "original-node");
  jest.mocked(draftStore.get).mockResolvedValue({
    baseline, fields: baseline.fields,
    request: {
      id: "original-request", revision: 3, command: "create",
      payload: { id: "original-node", start: "2026-11-25" },
    },
  });
  jest.mocked(recoverWorkRequest).mockResolvedValue(data);
  const onClose = jest.fn();
  const onSaved = jest.fn(async (_receipt: WorkTreeSnapshot) => {});
  await render(<WorkEditorSheet data={data} edit={edit} onClose={onClose} onSaved={onSaved} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Add subtask" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSaved).toHaveBeenCalledWith(data);
  expect(screen.queryByText("Subtask saved")).toBeNull();
});
