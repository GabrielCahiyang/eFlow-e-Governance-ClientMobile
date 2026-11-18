import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SubtaskCompletionSheet } from "../SubtaskCompletionSheet";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { supabase } from "../../../../platform/supabase";

jest.mock("../../../../core/web/app/features/nested-work/services/workTreeService", () => ({ fetchWorkTree: jest.fn() }));
jest.mock("../../../../platform/supabase", () => ({ supabase: {
  auth: { getSession: jest.fn(async () => ({ data: { session: { user: { id: "actor" } } }, error: null })) },
  rpc: jest.fn(async () => ({ data: { id: "sub", status: "completed" }, error: null })),
} }));
jest.mock("../../../../platform/draftStore", () => ({ draftStore: {
  get: jest.fn(async () => null), set: jest.fn(async () => {}), remove: jest.fn(async () => {}),
} }));
jest.mock("../../budget", () => ({ assertWorkAcceptanceAvailable: jest.fn(async () => {}), fetchWorkFinancialClearance: jest.fn() }));
jest.mock("../EvidencePicker", () => ({ EvidencePicker: () => null, evidenceIssue: () => undefined }));

test.each(["unassigned-task-lead", "assigned-task-lead", "appointed-subtask-lead", "denied-submit"])(
  "fresh direct completion preserves exact-node appointments and server grants: %s", async (scenario) => {
    const tree = { revision: 1,
      root: { id: "root", kind: "office", project: "project", office: "office", open: true, lead: "actor" },
      nodes: [{ id: "sub", task_id: "root", title: "Scoped work", status: "in_progress", dependency_ids: [],
        lead_id: scenario === "appointed-subtask-lead" || scenario === "denied-submit" ? "actor" : "sub-lead",
        assigned_to_ids: scenario === "assigned-task-lead" ? ["actor"] : [],
        capabilities: { submit: { allowed: scenario !== "denied-submit", reason_code: scenario === "denied-submit" ? "branch_denied" : null } } }],
    } as unknown as WorkTreeSnapshot;
    rememberWorkCapabilityContext(tree, "actor");
    jest.mocked(fetchWorkTree).mockResolvedValue(tree);
    const onSaved = jest.fn(async () => {});
    await render(<SubtaskCompletionSheet node={{ id: "sub", title: "Scoped work" }} actorId="actor"
      rootId="root" projectId="project" officeId="office" onClose={jest.fn()} onSaved={onSaved} />);
    const submit = await screen.findByRole("button", { name: "Mark as complete" });
    await waitFor(() => expect(submit).toBeEnabled());
    await fireEvent.press(submit);
    if (scenario === "appointed-subtask-lead") {
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(supabase.rpc).toHaveBeenCalledWith("complete_subitem", expect.objectContaining({ p_subtask_id: "sub" }));
    } else {
      await waitFor(() => expect(screen.getByText(/Current access does not permit direct completion/)).toBeOnTheScreen());
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
    }
  },
);
