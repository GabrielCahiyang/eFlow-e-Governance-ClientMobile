import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import {
  fetchWorkEvents,
  type WorkEvent,
} from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { OfficeSubitemActivity } from "../OfficeSubitemActivity";

jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../../platform/webRuntime", () => ({
  nativeWindow: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
}));
jest.mock(
  "../../../../core/web/app/features/nested-work/services/workTreeService",
  () => ({
    fetchWorkEvents: jest.fn(),
  }),
);
jest.mock(
  "../../../../core/web/app/features/nested-work/selectors/workActivityScope",
  () => ({
    selectFocusedWorkEvents: (events: WorkEvent[], focus: { nodeId: string }) =>
      events
        .filter((event) => event.node_id === focus.nodeId)
        .map((event) => ({ event })),
  }),
);
jest.mock(
  "../../../../core/web/app/features/nested-work/selectors/workEventPresentation",
  () => ({
    presentWorkEvent: (event: WorkEvent) => ({ title: event.id, detail: "" }),
  }),
);
jest.mock(
  "../../../../core/web/app/features/subtasks/services/subtaskWorkflowService",
  () => ({
    fetchSubitemInspectorRecord: jest.fn(async () => ({
      subtask: {},
      progressUpdates: [
        {
          id: "update",
          authorName: "Lead",
          note: "Progress retained",
          createdAt: 1760000000000,
        },
      ],
      submissions: [],
    })),
  }),
);
jest.mock("../EvidenceAttachment", () => ({ EvidenceAttachment: () => null }));

test("older activity appends to the focused branch and keeps progress history", async () => {
  const row = (id: string, node_id: string, day: number) =>
    ({
      id,
      node_id,
      occurred_at: `2026-11-0${day}T00:00:00Z`,
    }) as WorkEvent;
  const latest = row("Latest action", "node", 7);
  jest
    .mocked(fetchWorkEvents)
    .mockResolvedValueOnce({ events: [latest], more: true })
    .mockResolvedValueOnce({
      events: [
        latest,
        row("Earlier action", "node", 6),
        row("Sibling action", "sibling", 5),
      ],
      more: false,
    });
  const tree = {
    root: { id: "task", kind: "office" },
    revision: 1,
  } as WorkTreeSnapshot;
  await render(
    <OfficeSubitemActivity tree={tree} nodeId="node" actorId="actor" />,
  );
  await screen.findByText("Progress retained");
  await fireEvent.press(
    await screen.findByRole("button", { name: "Load older activity" }),
  );
  expect(await screen.findByText("Earlier action")).toBeOnTheScreen();
  expect(screen.getAllByText("Latest action")).toHaveLength(1);
  expect(screen.getByText("Progress retained")).toBeOnTheScreen();
  expect(screen.queryByText("Sibling action")).toBeNull();
  expect(fetchWorkEvents).toHaveBeenLastCalledWith(["task"], {
    id: latest.id,
    time: latest.occurred_at,
  });
});
