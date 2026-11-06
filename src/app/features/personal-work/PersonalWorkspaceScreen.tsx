import { useState } from "react";
import { Pressable } from "../../components/ui/Primitives";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Notice,
  Screen,
  SearchField,
  Status,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useWorkspace, WorkspaceCreateSheet } from "../workspaces";
import type { Navigate } from "../../shared/routes";
export function PersonalWorkspaceScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth(),
    workspace = useWorkspace(),
    [search, setSearch] = useState(""),
    [creating, setCreating] = useState(false);
  const current = workspace.selected,
    owner = current?.workspace.owner_id === profile?.id;
  const projects = (current?.projects || []).filter((project) =>
    project.title.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Screen
      title={current?.workspace.name || "Personal workspace"}
      description={`Personal workspace · Owner: ${current?.workspace.owner_name || profile?.full_name || "Workspace owner"}`}
      onRefresh={() => workspace.refresh()}

      actions={
        owner ? (
          <Button onPress={() => setCreating(true)}>
            Create personal project
          </Button>
        ) : undefined
      }
    >
      <Notice>
        Personal review and closeout apply here. Office approvals and finance
        stay in their Office projects.
      </Notice>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search personal projects…"
      />
      {workspace.error ? (
        <ErrorState
          error={workspace.error}
          retry={() => void workspace.refresh()}
        />
      ) : !current ? (
        <Loading label="Loading personal projects" layout="projects" />
      ) : projects.length ? (
        projects.map((project) => (
          <Pressable
            key={project.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${project.title}`}
            onPress={() =>
              navigate({
                name:
                  project.kind === "personal" ? "personal_project" : "project",
                id: project.id,
              })
            }
          >
            <Card title={project.title}>
              <Status value={project.status} />
              <Text>Open project →</Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty
          title="No personal projects match"
          description={
            owner
              ? "Create a project to start working."
              : "Your selected project memberships will appear here."
          }
        />
      )}
      {!!creating && (
        <WorkspaceCreateSheet
          kind="project"
          actor={profile!.id}
          context={current!.workspace.id}
          onClose={() => setCreating(false)}
          onCreated={async (id) => {
            await workspace.refresh();
            navigate({ name: "personal_project", id });
          }}
        />
      )}
    </Screen>
  );
}
