import { Text } from "../../components/ui/Typography";
import { useMemo, useState } from "react";
import { Pressable, View } from "../../components/ui/Primitives";
import Plus from "lucide-react-native/icons/plus";
import Star from "lucide-react-native/icons/star";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  Loading,
  Row,
  Screen,
  SearchField,
  Status,
  colors,
  dateLabel,
} from "../../components/ui";
import { ProjectSetupSheet } from "./ProjectSetupSheet";
import { fetchProjects } from "./services";
export function ProjectsScreen({ navigate }: { navigate: Navigate }) {
  const { profile, can } = useAuth(),
    workspace = useWorkspace();
  const facts = useFacts(
    "projects:" + profile?.id + ":" + workspace.selected?.workspace.id,
    fetchProjects,
    !!profile,
  );
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("current"),
    [create, setCreate] = useState(false);
  const projects = useMemo(() => {
    const ids = workspace.selected
      ? new Set(workspace.selected.projects.map((p) => p.id))
      : undefined;
    return (facts.data || []).filter(
      (p) =>
        (!ids || ids.has(p.id)) &&
        (status === "all" || status === "current"
          ? status === "all" || p.status !== "archived"
          : p.status === status) &&
        p.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [facts.data, workspace.selected, status, search]);
  return (
    <Screen
      title="All projects"
      description="Your projects, teams and progress in one place."
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
      actions={
        can("navigation.projects") && profile?.role === "head" ? (
          <Button
            icon={<Plus color="#fff" size={17} />}
            onPress={() => setCreate(true)}
          >
            Create project
          </Button>
        ) : undefined
      }
    >
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search projects"
      />
      <Choice
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "current", label: "Current projects" },
          { value: "all", label: "All statuses" },
          ...["planning", "active", "on_hold", "completed", "archived"].map(
            (value) => ({ value, label: value.replace("_", " ") }),
          ),
        ]}
      />
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : projects.length ? (
        projects.map((project) => (
          <Pressable
            key={project.id}
            accessibilityRole="button"
            accessibilityLabel={"Open " + project.title}
            onPress={() =>
              navigate({
                name: "project",
                id: project.id,
                title: project.title,
              })
            }
          >
            <Card title={project.title}>
              <Text
                style={{ color: colors.muted, lineHeight: 20 }}
                numberOfLines={3}
              >
                {project.description || "No description yet"}
              </Text>
              <Row>
                <Status value={project.status} />
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Target: {dateLabel(project.targetDate)}
                </Text>
              </Row>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                Open project →
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty
          title="No projects match these filters"
          description="Try another name or status."
        />
      )}
      {create && (
        <ProjectSetupSheet
          orgId={profile?.org_id || undefined}
          onClose={() => setCreate(false)}
          onDone={(id) => {
            setCreate(false);
            void workspace.refresh().catch(() => {});
            void facts.refresh().catch(() => {});
            navigate({ name: "project", id });
          }}
        />
      )}
    </Screen>
  );
}
