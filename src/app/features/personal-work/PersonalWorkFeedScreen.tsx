import { supabase } from "../../../platform/supabase";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Screen,
  SearchField,
  Tabs,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { loadWorkFeed } from "../../../core/web/app/features/personal-work/services/workFeedService";
import { selectWorkRows } from "../../../core/web/app/features/personal-work/workSelectors";
import {
  dateFilters,
  workDestinations,
  type WorkDestination,
  type WorkDateFilter,
} from "../../../core/web/app/features/personal-work/types";
import { deadlinePresentation } from "../../../core/web/app/shared/deadlinePresentation";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import { workDestination } from "./workDestination";
export function PersonalWorkFeedScreen({
  initial = "Assigned work",
  navigate,
}: {
  initial?: WorkDestination;
  navigate: Navigate;
}) {
  const { profile } = useAuth(),
    actor = profile!.id,
    [destination, setDestination] = useState<WorkDestination>(initial),
    [date, setDate] = useState<WorkDateFilter>("All my work"),
    [query, setQuery] = useState(""),
    [workspace, setWorkspace] = useState(""),
    [recent, setRecent] = useState(false),
    [openError, setOpenError] = useState<Error>();
  const facts = useFacts("my-work-feed:" + actor, () => loadWorkFeed(actor));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void facts.refresh(), 150);
    };
    const channel = createPostgresChannel("my-work-live:" + actor)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        schedule,
      )
      .subscribe();
    const poll = setInterval(() => {
        if (AppState.currentState === "active") void facts.refresh();
      }, 30000),
      subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void facts.refresh();
      });
    return () => {
      clearInterval(poll);
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
      subscription.remove();
    };
  }, [actor, facts.refresh]);
  const data = facts.data,
    rows = data
      ? selectWorkRows(data.rows, destination, date, query, workspace, recent)
      : [],
    issues = [...(data?.issues || []), ...(data?.unavailable || [])];
  return (
    <Screen
      title={
        destination === "Assigned work"
          ? "My Work"
          : destination === "Subtasks"
            ? "My Subtasks"
            : destination
      }
      description="Your assigned Office and personal work, with its project context."
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
    >
      {profile?.role === "member" &&
        destination === "Assigned work" &&
        data &&
        !facts.error && (
          <Card title="My work overview">
            {(() => {
              const assigned = data.rows.filter(
                (row) => row.mine && !row.history,
              );
              return (
                <>
                  <LabelValue
                    label="Overdue"
                    value={String(
                      assigned.filter(
                        (r) =>
                          deadlinePresentation(r.due, r.status).tone === "red",
                      ).length,
                    )}
                  />
                  <LabelValue
                    label="Due soon"
                    value={String(
                      assigned.filter(
                        (r) =>
                          deadlinePresentation(r.due, r.status).tone ===
                          "yellow",
                      ).length,
                    )}
                  />
                  <LabelValue
                    label="Returned for changes"
                    value={String(
                      assigned.filter((r) => r.status === "changes_requested")
                        .length,
                    )}
                  />
                  <LabelValue
                    label="Awaiting approval"
                    value={String(
                      assigned.filter((r) =>
                        ["for_review", "submitted"].includes(r.status),
                      ).length,
                    )}
                  />
                  <Button variant="outline" onPress={() => setDate("Overdue")}>
                    View overdue work
                  </Button>
                </>
              );
            })()}
          </Card>
        )}
      <Tabs
        value={destination}
        onChange={(value) => setDestination(value as WorkDestination)}
        items={workDestinations.map((id) => ({ id, label: id }))}
      />
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search work, project or workspace"
      />
      <Choice
        label="Date filter"
        value={date}
        onChange={setDate}
        options={dateFilters.map((value) => ({ value, label: value }))}
      />
      <Choice
        label="Workspace scope"
        value={workspace}
        onChange={setWorkspace}
        options={[
          { value: "", label: "All workspaces" },
          ...(data?.workspaces || []).map((w) => ({
            value: w.id,
            label: w.name,
          })),
        ]}
      />
      {destination === "History" && (
        <Button variant="outline" onPress={() => setRecent((value) => !value)}>
          {recent ? "Show all history" : "Recently completed only"}
        </Button>
      )}
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          {!!issues.length && (
            <ErrorState
              error={"Some work sources could not load.\n" + issues.join("\n")}
              retry={() => void facts.refresh()}
            />
          )}
          {!rows.length ? (
            <Empty
              title={
                issues.length
                  ? "No work loaded for this filter"
                  : "No work matches this filter"
              }
            />
          ) : (
            rows.map((row) => (
              <Card key={row.key} title={row.title}>
                <LabelValue label="Project" value={row.projectTitle} />
                <LabelValue label="Workspace" value={row.workspaceName} />
                {!!row.workContext?.pathLabel && (
                  <LabelValue
                    label="Work path"
                    value={row.workContext.pathLabel}
                  />
                )}
                <LabelValue label="Responsibility" value={row.relation} />
                <LabelValue
                  label="Status"
                  value={row.status.replace(/_/g, " ")}
                />
                <LabelValue
                  label="Due"
                  value={workDateLabel(row.due, row.timezone)}
                />
                <LabelValue label="Progress" value={`${row.progress}%`} />
                {!!row.blocker && <Notice>{row.blocker}</Notice>}
                <Button
                  variant="outline"
                  onPress={() => {
                    try {
                      navigate(workDestination(row));
                    } catch (error) {
                      setOpenError(
                        error instanceof Error
                          ? error
                          : new Error("The work location could not be opened."),
                      );
                    }
                  }}
                >
                  Open work
                </Button>
              </Card>
            ))
          )}
        </>
      )}
      {!!openError && <ErrorState error={openError} />}
    </Screen>
  );
}
