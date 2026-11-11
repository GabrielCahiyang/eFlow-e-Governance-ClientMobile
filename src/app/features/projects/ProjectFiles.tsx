import { Linking } from "react-native";
import { Empty, ErrorState, Loading, dateLabel } from "../../components/ui";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useFacts } from "../../shared/useFacts";
import { statusLabel } from "../../shared/statusLabels";
import { useAction } from "../../shared/useAction";
import { useAuth } from "../authentication";
import {
  fetchProjectFiles,
  openProjectFile,
} from "../../../core/web/app/features/project-files/services/projectFileService";

export function ProjectFiles({
  projectId,
  taskId,
  onManage,
}: {
  projectId: string;
  taskId?: string;
  onManage: () => void;
}) {
  const { profile } = useAuth();
  const facts = useFacts(`files:${profile?.id}:${projectId}:${taskId}`, () =>
    fetchProjectFiles(projectId, taskId),
  );
  const action = useAction();
  if (facts.error)
    return (
      <ErrorState error={facts.error} retry={() => void facts.refresh()} />
    );
  if (!facts.data) return <Loading label="Loading files" layout="files" />;
  return (
    <>
      {!facts.data.files.length && (
        <Empty kind="files" compact title="No files here" />
      )}
      {facts.data.files.map((file) => (
        <NavigationRow
          key={file.id}
          title={file.file_name}
          description={`${file.uploader_name} · ${dateLabel(file.created_at)} · ${file.state === "ready" ? Math.ceil(file.file_size / 1024) + " KB" : statusLabel(file.state)}`}
          disabled={file.state !== "ready" || action.busy}
          onPress={() =>
            void action.run(async () => {
              await Linking.openURL(await openProjectFile(file));
            })
          }
        />
      ))}
      {facts.data.can_write && (
        <NavigationRow title="Manage files on eFlow Web" onPress={onManage} />
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </>
  );
}
