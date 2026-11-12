import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ProjectCloseoutSheet } from "../ProjectCloseoutSheet";
import {
  archiveCompletedProject,
  completeProject,
  fetchProjectCompletionReadiness,
} from "../../../../core/web/app/features/projects/services/projectLifecycleService";
import type { Project } from "../../../../core/web/app/features/projects/services/types";

jest.mock("../../budget", () => ({ useOfficeFinanceUpdates: () => {} }));
jest.mock("../subscriptions", () => ({ netProjectUpdates: () => () => {} }));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "head" } } } }) },
  },
}));
jest.mock("../../../../core/web/app/features/projects/services/projectLifecycleService", () => ({
  archiveCompletedProject: jest.fn(),
  completeProject: jest.fn(),
  fetchProjectCompletionReadiness: jest.fn(),
}));

test("completion rechecks the server before writing and shows the current financial blocker", async () => {
  const project = { id: "project-a", orgId: "office", title: "Training", status: "active" } as Project;
  const ready = { projectId: project.id, title: project.title, status: project.status, canComplete: true, blockers: [] };
  jest.mocked(fetchProjectCompletionReadiness).mockResolvedValue(ready);
  const onClose = jest.fn();
  await render(<ProjectCloseoutSheet project={project} actor="head" mode="complete" navigate={jest.fn()}
    onOpenFunding={jest.fn()} onClose={onClose} onSaved={async () => {}} />);
  expect(await screen.findByText("All completion checks passed.")).toBeOnTheScreen();
  jest.mocked(fetchProjectCompletionReadiness).mockResolvedValue({
    ...ready, canComplete: false,
    blockers: [{ kind: "cash", id: "cash-a", title: "Settle cash", status: "open", detail: "Accounting must settle this advance." }],
  });
  await fireEvent.press(screen.getByRole("button", { name: "Confirm completion" }));
  expect(await screen.findByText("Settle cash")).toBeOnTheScreen();
  expect(completeProject).not.toHaveBeenCalled();
  expect(archiveCompletedProject).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
