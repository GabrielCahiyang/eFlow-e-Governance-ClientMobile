import { useEffect, useState } from "react";
import Upload from "lucide-react-native/icons/upload";
import FolderPlus from "lucide-react-native/icons/folder-plus";
import Unlink from "lucide-react-native/icons/unlink";
import Trash from "lucide-react-native/icons/trash";
import { Button, Card, ErrorState, Notice, Row } from "../../components/ui";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { PublicMessageError } from "../../shared/userMessages";
import { draftStore } from "../../../platform/draftStore";
import { chooseFiles } from "../../../platform/files";
import {
  PROJECT_FILE_TYPES,
  validateProjectFile,
} from "../../../core/web/app/features/project-files/constants";
import type {
  ProjectFile,
  ProjectFileSnapshot,
} from "../../../core/web/app/features/project-files/types";
import {
  changeProjectDocument,
  documentUploadScope,
  saveProjectDocument,
  type DocumentUpload,
} from "./projectDocumentActions";

export function useProjectDocumentManagement({
  actor,
  project,
  task,
  snapshot,
  unavailable,
  readOnly,
  refresh,
}: {
  actor?: string;
  project: string;
  task?: string;
  snapshot?: ProjectFileSnapshot;
  unavailable: boolean;
  readOnly: boolean;
  refresh: () => Promise<void>;
}) {
  const palette = useTheme();
  const action = useAction();
  const [draft, setDraft] = useState<DocumentUpload>();
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<Error>();
  const [picker, setPicker] = useState(false);
  const scope = { actor: actor || "", project, task };
  const scopeKey = documentUploadScope(scope);
  useEffect(() => {
    let current = true;
    setLoading(true);
    if (!actor) {
      setLoading(false);
      return;
    }
    void draftStore
      .get<DocumentUpload>(actor, scopeKey)
      .then((saved) => {
        if (!current || !saved) return;
        if (
          typeof saved.id !== "string" ||
          !saved.file ||
          typeof saved.file.uri !== "string" ||
          typeof saved.file.name !== "string" ||
          typeof saved.file.size !== "number" ||
          typeof saved.file.type !== "string" ||
          !!validateProjectFile(saved.file as unknown as File) ||
          (saved.attempted &&
            (typeof saved.sha256 !== "string" ||
              !/^[a-f0-9]{64}$/i.test(saved.sha256)))
        )
          throw new Error(
            "This saved upload is unreadable. Check the library before choosing another file.",
          );
        setDraft(saved);
      })
      .catch((error) => {
        if (current) setRestoreError(error);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [actor, scopeKey]);
  const canWrite =
    !!actor &&
    snapshot?.can_write === true &&
    !unavailable &&
    !readOnly &&
    !loading &&
    !restoreError;
  const blocked = action.busy || !!draft;

  const change = async (
    command: "link" | "unlink" | "remove",
    file: ProjectFile,
  ) => {
    if (
      command === "remove" &&
      !(await confirmAction(
        "Remove document?",
        "This removes the unlinked document from this project library. Its provenance is retained.",
        "Remove document",
        true,
      ))
    )
      return;
    const completed = await action.run(
      async () => {
        if (!canWrite || draft)
          throw new PublicMessageError(
            "Refresh document access before making changes.",
          );
        await changeProjectDocument(scope, command, file.id);
        await refresh();
      },
      command === "link"
        ? "Document is linked to this task."
        : command === "unlink"
          ? "Document is unlinked; its source remains in the project library."
          : "Document removed; provenance retained.",
    );
    if (!completed) await refresh();
  };

  const header = (
    <>
      {!!restoreError && <ErrorState error={restoreError} />}
      {canWrite && (
        <Row>
          <Button
            icon={<Upload size={15} color={palette.onPrimary} />}
            disabled={blocked}
            onPress={() =>
              void action.run(async () => {
                const [file] = await chooseFiles([...PROJECT_FILE_TYPES]);
                if (!file) return;
                const issue = validateProjectFile(file as unknown as File);
                if (issue) throw new PublicMessageError(issue);
                const request: DocumentUpload = {
                  id: crypto.randomUUID(),
                  file: {
                    uri: file.uri,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                  },
                };
                await draftStore.set(scope.actor, scopeKey, request);
                setDraft(request);
              })
            }
          >
            Upload a project document
          </Button>
          {!!task && (
            <Button
              variant="outline"
              disabled={blocked}
              icon={<FolderPlus size={15} color={palette.primary} />}
              onPress={() => setPicker(true)}
            >
              Insert from project library
            </Button>
          )}
        </Row>
      )}
      {canWrite && (
        <Text style={{ color: palette.mutedLabel, fontSize: 12 }}>
          PDF, text, images, DOCX or XLSX · Up to 10 MB
        </Text>
      )}
      {!!draft && (
        <Card title={draft.file.name} badge="Upload draft" flat>
          <Text style={{ color: palette.mutedLabel, fontSize: 13 }}>
            {draft.attempted
              ? "Keep this saved request until its result is confirmed. Retry checks the same upload."
              : "Review this file before saving it to the project library."}
          </Text>
          <Row>
            <Button
              busy={action.busy}
              disabled={
                unavailable || loading || (!draft.attempted && !canWrite)
              }
              onPress={() =>
                void action.run(async () => {
                  await saveProjectDocument(scope, draft, readOnly);
                  setDraft(undefined);
                  await refresh();
                }, "Document saved to the project library.")
              }
            >
              {draft.attempted ? "Retry saved upload" : "Save document"}
            </Button>
            {!draft.attempted && (
              <Button
                variant="outline"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await draftStore.remove(scope.actor, scopeKey);
                    setDraft(undefined);
                  })
                }
              >
                Discard upload draft
              </Button>
            )}
          </Row>
        </Card>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      <SelectionSheet
        open={picker && canWrite}
        title="Insert from project library"
        emptyLabel="No unlinked documents are available in this project library."
        description="Link a shared reference document to this task. Formal submission evidence stays separate."
        options={(snapshot?.files || [])
          .filter((file) => file.state === "ready" && file.linked === false)
          .map((file) => ({
            id: file.id,
            title: file.file_name,
            description: file.uploader_name,
          }))}
        onClose={() => setPicker(false)}
        onSelect={(id) => {
          setPicker(false);
          const file = snapshot?.files.find((item) => item.id === id);
          if (file) change("link", file);
        }}
      />
    </>
  );
  const rowActions = (file: ProjectFile) =>
    canWrite ? (
      <Row>
        {!!task && (
          <Button
            variant="outline"
            disabled={blocked}
            icon={<Unlink size={14} color={palette.primary} />}
            onPress={() => change("unlink", file)}
          >
            Unlink document
          </Button>
        )}
        {file.can_remove === true && file.links === 0 && (
          <Button
            variant="outline"
            disabled={blocked}
            icon={<Trash size={14} color={palette.danger} />}
            onPress={() => change("remove", file)}
          >
            Remove from library
          </Button>
        )}
      </Row>
    ) : null;
  return { header, rowActions, busy: action.busy };
}
