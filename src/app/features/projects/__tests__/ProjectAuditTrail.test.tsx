import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type {
  ActivityFilters,
  ActivityPage,
} from "../../../../core/web/app/features/projects/activity/types";
import { clearDisplayCache } from "../../../shared/displayCache";
import { ProjectAuditTrail } from "../ProjectAuditTrail";

const oldGroup = "4ff3fe4c-7be5-4193-9c84-cfea54d0e2bb";
const newGroup = "777f99fb-e9aa-4e1d-841b-0b3fdbb918ba";
const mockFetchPage =
  jest.fn<
    (
      project: string,
      filters: ActivityFilters,
      size: number,
      page: number,
      snapshot?: string,
    ) => Promise<ActivityPage>
  >();

jest.mock(
  "../../../../core/web/app/features/projects/activity/activityService",
  () => ({
    fetchActivityPage: (...args: Parameters<typeof mockFetchPage>) =>
      mockFetchPage(...args),
  }),
);
jest.mock("../subscriptions", () => ({ netProjectUpdates: () => () => {} }));

const moved = Object.freeze({
  id: "project-change:change-1",
  kind: "project" as const,
  taskId: "task-1",
  title: "Task details changed · test",
  actorName: "Cheryl Gallo",
  occurredAt: Date.parse("2026-11-18T01:29:00Z"),
  detail: `Group Id: ${oldGroup} → ${newGroup}`,
});
const status = {
  id: "status:last",
  kind: "status" as const,
  taskId: "task-1",
  title: "Task status changed",
  actorName: "QA Reviewer",
  occurredAt: moved.occurredAt,
  detail: "Pending → In progress",
};
const metadata = {
  snapshot: "historical-snapshot",
  asOf: "2026-11-18T02:00:00Z",
  expiresAt: "2026-11-18T03:00:00Z",
  size: 25,
};

beforeEach(() => {
  clearDisplayCache("access");
  mockFetchPage.mockReset();
  mockFetchPage.mockImplementation(async (_project, filters, _size, page) => {
    if (filters.kind === "status")
      return { ...metadata, page: 0, total: 1, more: false, events: [status] };
    return {
      ...metadata,
      page,
      total: 26,
      more: page === 0,
      events:
        page === 0
          ? [
              moved,
              ...Array.from({ length: 24 }, (_, index) => ({
                ...status,
                id: `status:${index}`,
                title: `Earlier event ${index}`,
              })),
            ]
          : [status],
    };
  });
});

test("renders readable group history with the original actor/time and pages the unchanged snapshot", async () => {
  await render(
    <ProjectAuditTrail
      actor="actor-1"
      project="project-1"
      timezone="Asia/Manila"
    />,
  );
  expect(
    await screen.findByText("Task moved to another group"),
  ).toBeOnTheScreen();
  expect(screen.getByText("Task details changed · test")).toBeOnTheScreen();
  expect(screen.getByText(/Cheryl Gallo · .*9:29/)).toBeOnTheScreen();
  expect(screen.queryByText(new RegExp(oldGroup))).toBeNull();
  expect(screen.queryByText(new RegExp(newGroup))).toBeNull();
  expect(moved.detail).toContain(oldGroup);
  await fireEvent.press(screen.getByRole("button", { name: "Next page" }));
  expect(await screen.findByText("Pending → In progress")).toBeOnTheScreen();
  expect(mockFetchPage).toHaveBeenLastCalledWith(
    "project-1",
    expect.objectContaining({ timezone: "Asia/Manila" }),
    25,
    1,
    "historical-snapshot",
  );
  expect(screen.queryByText("Task moved to another group")).toBeNull();
});

test("category selection exposes its selected state and preserves the server filter", async () => {
  await render(
    <ProjectAuditTrail
      actor="actor-1"
      project="project-1"
      timezone="Asia/Manila"
    />,
  );
  await screen.findByText("Task moved to another group");
  await fireEvent.press(screen.getByRole("button", { name: "Status changes" }));
  await waitFor(() =>
    expect(mockFetchPage).toHaveBeenLastCalledWith(
      "project-1",
      expect.objectContaining({ kind: "status" }),
      25,
      0,
      undefined,
    ),
  );
  expect(
    screen.getByRole("button", { name: "Status changes" }).props
      .accessibilityState.selected,
  ).toBe(true);
  expect(await screen.findByText("Pending → In progress")).toBeOnTheScreen();
  expect(screen.queryByText("Task moved to another group")).toBeNull();
});
