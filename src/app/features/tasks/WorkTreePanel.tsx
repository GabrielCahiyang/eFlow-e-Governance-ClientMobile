import { DeadlineBadge } from "../../components/ui/DeadlineBadge";
import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import { Pressable, View } from "../../components/ui/Primitives";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Plus from "lucide-react-native/icons/plus";
import {
  Button,
  Card,
  LabelValue,
  Notice,
  Row,
  Status,
  colors,
  dateLabel,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { SubtaskCompletionSheet } from "./SubtaskCompletionSheet";
import { WorkEditorSheet } from "./WorkEditorSheet";
import { buildWorkDisplayTree } from "../../../core/web/app/features/nested-work/selectors/displayTree";
import {
  selectNodeWorkCapability,
  selectRootWorkCapability,
} from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type {
  WorkTreeSnapshot,
  NodeWorkAction,
} from "../../../core/web/app/features/nested-work/types";
import type { WorkEdit } from "../../../core/web/app/features/nested-work/types/editor";
export function WorkTreePanel({
  data,
  onSaved,
  readOnly = false,
}: {
  data: WorkTreeSnapshot;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
}) {
  const { profile } = useAuth(),
    [collapsed, setCollapsed] = useState(new Set<string>()),
    [edit, setEdit] = useState<WorkEdit>(),
    [completion, setCompletion] = useState<{ id: string; title: string }>();
  const context = {
    actorId: profile?.id || null,
    rootId: data.root.id,
    projectId: data.root.project,
    officeId: data.root.office,
    kind: data.root.kind,
    revision: data.revision,
    readOnly,
  };
  const display = buildWorkDisplayTree(data.nodes);
  const visible = display.filter(
    (row) => !row.path.slice(0, -1).some((p) => collapsed.has(p.id)),
  );
  const rootCan = (action: "create_child" | "order_children") =>
    selectRootWorkCapability(data, action, context).allowed;
  return (
    <>
      <Row>
        {!!rootCan("create_child") && (
          <Button
            icon={<Plus color="#fff" size={17} />}
            onPress={() => setEdit({ command: "create" })}
          >
            Add subtask
          </Button>
        )}
        {!!rootCan("order_children") && (
          <Button
            variant="outline"
            onPress={() => setEdit({ command: "order" })}
          >
            Reorder subtasks
          </Button>
        )}
      </Row>
      {!data.nodes.length && <Notice>No subtasks in this task.</Notice>}
      {visible.map((row) => {
        const node = data.nodes.find((n) => n.id === row.id)!;
        const can = (action: NodeWorkAction) =>
          selectNodeWorkCapability(data, node.id, action, context).allowed;
        return (
          <View
            key={node.id}
            style={{
              marginLeft: Math.min(row.indentLevel, 4) * 10,
              borderLeftWidth: 3,
              borderLeftColor:
                node.status === "completed" ? colors.success : colors.primary,
              paddingLeft: 8,
            }}
          >
            <Card>
              <Row>
                {!!row.hasChildren && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      (collapsed.has(row.id) ? "Expand " : "Collapse ") +
                      node.title
                    }
                    onPress={() =>
                      setCollapsed((old) => {
                        const next = new Set(old);
                        next.has(row.id)
                          ? next.delete(row.id)
                          : next.add(row.id);
                        return next;
                      })
                    }
                  >
                    {collapsed.has(row.id) ? (
                      <ChevronRight color={colors.primary} />
                    ) : (
                      <ChevronDown color={colors.primary} />
                    )}
                  </Pressable>
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    flex: 1,
                    color: colors.text,
                  }}
                >
                  {node.title}
                </Text>
              </Row>
              <Status value={node.status} />
              <LabelValue
                label="Lead"
                value={
                  data.people.find((p) => p.id === node.lead_id)?.name ||
                  "Needs assignment"
                }
              />
              <LabelValue
                label="Contributors"
                value={
                  node.assigned_to_ids
                    .filter((id) => id !== node.lead_id)
                    .map(
                      (id) =>
                        data.people.find((p) => p.id === id)?.name ||
                        "Project person",
                    )
                    .join(", ") || "None"
                }
              />
              <DeadlineBadge value={node.due_date} status={node.status} />
              {!!node.blocker && <Notice>{node.blocker}</Notice>}
              {!!row.context && (
                <Notice>
                  Some parent context is unavailable. Canonical work links
                  remain unchanged.
                </Notice>
              )}
              <Row>
                {!!can("execute") && (
                  <Button
                    variant="outline"
                    onPress={() => setEdit({ command: "progress", node })}
                  >
                    Update work
                  </Button>
                )}
                {!!(
                  can("execute") &&
                  profile?.id &&
                  (node.lead_id === profile.id ||
                    data.root.lead === profile.id) &&
                  node.status !== "completed"
                ) && (
                  <Button variant="outline" onPress={() => setCompletion(node)}>
                    Mark complete
                  </Button>
                )}
                {!!(can("appoint_lead") || can("manage_contributors")) && (
                  <Button
                    variant="outline"
                    onPress={() => setEdit({ command: "staff", node })}
                  >
                    Choose people
                  </Button>
                )}
                {!!can("create_child") && (
                  <Button
                    variant="outline"
                    onPress={() =>
                      setEdit({ command: "create", parent: node.id })
                    }
                  >
                    Add child
                  </Button>
                )}
                {!!can("edit_details") && (
                  <Button
                    variant="ghost"
                    onPress={() => setEdit({ command: "edit", node })}
                  >
                    Edit details
                  </Button>
                )}
                {!!can("move") && (
                  <Button
                    variant="ghost"
                    onPress={() => setEdit({ command: "move", node })}
                  >
                    Move
                  </Button>
                )}
                {!!can("order_children") && (
                  <Button
                    variant="ghost"
                    onPress={() =>
                      setEdit({ command: "order", parent: node.id })
                    }
                  >
                    Reorder children
                  </Button>
                )}
                {!!can("delete") && (
                  <Button
                    variant="ghost"
                    onPress={() => setEdit({ command: "delete", node })}
                  >
                    Delete
                  </Button>
                )}
              </Row>
            </Card>
          </View>
        );
      })}
      {!!completion && !!profile?.id && (
        <SubtaskCompletionSheet
          key={completion.id + profile.id}
          node={completion}
          actorId={profile.id}
          rootId={data.root.id}
          onClose={() => setCompletion(undefined)}
          onSaved={onSaved}
        />
      )}
      {!!edit && (
        <WorkEditorSheet
          key={`${data.root.id}:${edit.command}:${edit.node?.id || edit.parent || "root"}`}
          data={data}
          edit={edit}
          readOnly={readOnly}
          onClose={() => setEdit(undefined)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
