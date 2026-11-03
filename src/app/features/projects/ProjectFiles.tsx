import { Text } from "../../components/ui/Typography";
import { useRef } from "react";
import { Linking } from "react-native";
import {
  Button,
  Card,
  ErrorState,
  LabelValue,
  Loading,
  Row,
  colors,
  dateLabel,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { chooseFiles, asServiceFile } from "../../../platform/files";
import {
  fetchProjectFiles,
  openProjectFile,
  projectFileCommand,
  uploadProjectFile,
} from "../../../core/web/app/features/project-files/services/projectFileService";
import type { ProjectUploadDraft } from "../../../core/web/app/features/project-files/types";
export function ProjectFiles({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId?: string;
}) {
  const facts = useFacts("files:" + projectId + ":" + taskId, () =>
      fetchProjectFiles(projectId, taskId),
    ),
    action = useAction();
  const pending = useRef<ProjectUploadDraft | undefined>(undefined);
  const upload = () =>
    action.run(async () => {
      if (!pending.current) {
        const [file] = await chooseFiles();
        if (!file) return;
        pending.current = {
          id: crypto.randomUUID(),
          file: await asServiceFile(file),
        };
      }
      await uploadProjectFile(projectId, taskId, pending.current);
      pending.current = undefined;
      await facts.refresh();
    }, "File uploaded.");
  return (
    <>
      {!!facts.data?.can_write && (
        <Button busy={action.busy} onPress={() => void upload()}>
          {pending.current ? "Retry same upload" : "Upload file"}
        </Button>
      )}
      {facts.loading && !facts.data ? (
        <Loading />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        facts.data?.files.map((file) => (
          <Card key={file.id} title={file.file_name}>
            <LabelValue label="Uploaded by" value={file.uploader_name} />
            <LabelValue label="Uploaded" value={dateLabel(file.created_at)} />
            <LabelValue
              label="Size"
              value={`${Math.ceil(file.file_size / 1024)} KB`}
            />
            <Row>
              <Button
                variant="outline"
                disabled={file.state !== "ready"}
                onPress={() =>
                  void action.run(async () => {
                    await Linking.openURL(await openProjectFile(file));
                  })
                }
              >
                Open file
              </Button>
              {!!(facts.data?.can_write && taskId) && (
                <Button
                  variant="outline"
                  onPress={() =>
                    void action.run(async () => {
                      await projectFileCommand(
                        projectId,
                        taskId,
                        file.linked ? "unlink" : "link",
                        { id: file.id },
                      );
                      await facts.refresh();
                    })
                  }
                >
                  {file.linked ? "Unlink from task" : "Link to task"}
                </Button>
              )}
              {!!file.can_remove && (
                <Button
                  variant="outline"
                  onPress={() =>
                    void action.run(async () => {
                      if (
                        !(await confirmAction(
                          "Remove this file?",
                          "Existing evidence/history rules are checked before removal.",
                          "Remove",
                          true,
                        ))
                      )
                        return;
                      await projectFileCommand(projectId, taskId, "remove", {
                        id: file.id,
                      });
                      await facts.refresh();
                    })
                  }
                >
                  Remove
                </Button>
              )}
            </Row>
          </Card>
        ))
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
    </>
  );
}
