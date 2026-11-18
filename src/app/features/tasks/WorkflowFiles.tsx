import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import FileText from "lucide-react-native/icons/file-text";
import ExternalLink from "lucide-react-native/icons/external-link";
import {
  Card,
  Empty,
  ErrorState,
  Loading,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { BusyIndicator } from "../../components/ui/BusyIndicator";
import { useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { subscribeAppResume } from "../../shared/liveUpdates";
import { useAuth } from "../authentication";
import { openFileUrl } from "../../../platform/files";
import { nativeWindow } from "../../../platform/webRuntime";
import {
  fetchInspectorFiles,
  openInspectorFile,
} from "../../../core/web/app/features/task-inspector/services/inspectorFileService";

/** Uses Web's authorized task/subtask workflow collector and original storage buckets. */
export function WorkflowFiles({ taskId }: { taskId: string }) {
  const { profile } = useAuth();
  return (
    <WorkflowFilesContent
      key={`${profile?.id}:${taskId}`}
      taskId={taskId}
      actor={profile?.id}
    />
  );
}

function WorkflowFilesContent({
  taskId,
  actor,
}: {
  taskId: string;
  actor?: string;
}) {
  const palette = useTheme();
  const facts = useFacts(
    `workflow-files:${actor}:${taskId}`,
    () => fetchInspectorFiles(taskId),
    !!actor,
  );
  const action = useAction();
  const [opening, setOpening] = useState<string>();
  useEffect(() => {
    if (!actor) return;
    const refresh = () => {
      void facts.refresh();
    };
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    const stopResume = subscribeAppResume(refresh);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
      stopResume();
    };
  }, [actor, facts.refresh]);
  if (!actor)
    return (
      <Empty
        kind="files"
        title="Files unavailable"
        description="Sign in to view workflow evidence."
      />
    );
  if (facts.error)
    return (
      <ErrorState error={facts.error} retry={() => void facts.refresh()} />
    );
  if (!facts.data)
    return <Loading label="Loading workflow files" layout="files" />;

  return (
    <Card
      title="Workflow evidence"
      badge={`${facts.data.length} ${facts.data.length === 1 ? "file" : "files"}`}
      icon={<FileText size={16} color={palette.primary} />}
    >
      <Text style={{ color: palette.mutedLabel, fontSize: 13 }}>
        Task and subtask progress and submission attachments retain their
        original access and approval rules.
      </Text>
      {!facts.data.length ? (
        <Empty
          compact
          kind="files"
          title="No authorized workflow attachments yet."
        />
      ) : (
        <View
          style={[
            styles.group,
            {
              borderColor: palette.border,
              backgroundColor: palette.background,
            },
          ]}
        >
          {facts.data.map((file, index) => (
            <Pressable
              key={file.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${file.name}, ${file.source}, ${file.uploader}, ${file.at ? dateLabel(file.at) : "Date not recorded"}, ${file.restriction}`}
              accessibilityHint="Opens the original workflow attachment"
              accessibilityState={{ disabled: action.busy }}
              disabled={action.busy}
              onPress={() => {
                setOpening(file.id);
                void action
                  .run(async () => {
                    if (!(await openFileUrl(() => openInspectorFile(file))))
                      throw new Error(
                        "Allow the browser to open this file, then try again.",
                      );
                  })
                  .finally(() => setOpening(undefined));
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomWidth:
                    index === facts.data!.length - 1
                      ? 0
                      : StyleSheet.hairlineWidth,
                  borderColor: palette.border,
                  backgroundColor: pressed
                    ? palette.primarySoft
                    : palette.surface,
                },
              ]}
            >
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.circle,
                  {
                    backgroundColor: palette.primarySoft,
                    borderColor: palette.border,
                  },
                ]}
              >
                <FileText size={18} color={palette.primary} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.name, { color: palette.text }]}>
                  {file.name}
                </Text>
                <Text style={{ color: palette.mutedLabel, fontSize: 13 }}>
                  {file.source}
                </Text>
                <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                  {file.uploader} ·{" "}
                  {file.at ? dateLabel(file.at) : "Date not recorded"}
                </Text>
                <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
                  {file.restriction}
                </Text>
              </View>
              {opening === file.id && action.busy ? (
                <BusyIndicator size={16} color={palette.primary} />
              ) : (
                <ExternalLink size={16} color={palette.primary} />
              )}
            </Pressable>
          ))}
        </View>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Card>
  );
}
const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  row: {
    padding: 12,
    gap: 11,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontWeight: "700", fontSize: 14, lineHeight: 19 },
});
