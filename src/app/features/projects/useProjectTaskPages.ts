import { useEffect, useRef, useState } from "react";
import type { ProjectGroup } from "../../../core/web/app/features/project-table/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { authoritativeReadEpoch } from "../../shared/displayCache";
import { readWithTimeout } from "../../shared/readTimeout";
import { useFacts } from "../../shared/useFacts";
import type { ProjectWorkView } from "./mobileProjects";
import {
  fetchProjectAgendaPage,
  fetchProjectBoardPage,
  fetchProjectTaskPage,
  type AgendaTaskCursor,
  type ProjectTaskCursor,
} from "./services";

type Cursor = AgendaTaskCursor | ProjectTaskCursor;
type Page = { tasks: Task[]; next?: Cursor };
type MoreTasks = Page & {
  first: Page;
  loading?: boolean;
  error?: boolean;
};

export function useProjectTaskPages({
  scope,
  project,
  view,
  groups,
  includeArchived,
  search,
  enabled,
}: {
  scope: string;
  project: string;
  view: ProjectWorkView;
  groups: ProjectGroup[];
  includeArchived: boolean;
  search: string;
  enabled: boolean;
}) {
  function loadPage(next?: Cursor, signal?: AbortSignal): Promise<Page> {
    if (view === "calendar")
      return fetchProjectAgendaPage(
        project,
        includeArchived,
        search,
        next && "index" in next ? next : undefined,
        signal,
      );
    const cursor = next && "group" in next ? next : undefined;
    return view === "board"
      ? fetchProjectBoardPage(project, includeArchived, search, cursor, signal)
      : fetchProjectTaskPage(
          project,
          groups,
          includeArchived,
          search,
          cursor,
          signal,
        );
  }
  const first = useFacts(
    JSON.stringify([
      "project-task-page",
      scope,
      view,
      includeArchived,
      search,
      view === "tasks"
        ? groups.map(({ id, isDefault }) => [id, isDefault])
        : undefined,
    ]),
    () => loadPage(),
    enabled,
  );
  const [more, setMore] = useState<MoreTasks>();
  const tail = more?.first === first.data ? more : undefined;
  const next = tail ? tail.next : first.data?.next;
  const request = useRef<{
    first: Page;
    cursor: Cursor;
    controller: AbortController;
    failed?: boolean;
  }>(undefined);
  const active =
    enabled && !first.loading && !first.error ? first.data : undefined;
  const current = useRef(active);
  current.current = active;
  useEffect(
    () => () => {
      request.current?.controller.abort();
      request.current = undefined;
    },
    [active],
  );

  async function loadMore(retry = false) {
    if (
      !active ||
      current.current !== active ||
      !next ||
      (tail?.error && !retry)
    )
      return;
    const pending = request.current;
    if (
      pending?.first === active &&
      pending.cursor === next &&
      !(retry && pending.failed)
    )
      return;

    const controller = new AbortController();
    const loading = { first: active, cursor: next, controller, failed: false };
    request.current = loading;
    const epoch = authoritativeReadEpoch();
    const stillCurrent = () =>
      request.current === loading &&
      current.current === active &&
      epoch === authoritativeReadEpoch();
    const previous = tail?.tasks ?? active.tasks;
    setMore({ first: active, tasks: previous, next, loading: true });
    try {
      const page = await readWithTimeout(() =>
        loadPage(next, controller.signal),
      );
      if (!stillCurrent()) return;
      const byId = new Map(previous.map((task) => [task.id, task]));
      for (const task of page.tasks)
        if (!byId.has(task.id)) byId.set(task.id, task);
      setMore({ first: active, tasks: [...byId.values()], next: page.next });
    } catch {
      controller.abort();
      if (!stillCurrent()) return;
      loading.failed = true;
      setMore({ first: active, tasks: previous, next, error: true });
    }
  }

  return {
    ...first,
    tasks: tail?.tasks ?? first.data?.tasks ?? [],
    next,
    loadMore,
    loadingMore: !!tail?.loading && !!active,
    moreError: !!tail?.error,
  };
}
