import { Platform } from "react-native";
import { Button, LabelValue, Notice, Row } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { chooseFiles } from "../../../platform/files";
import {
  captureEvidencePhoto,
  type EvidenceFile,
} from "../../../platform/evidenceFiles";
import { attachmentError } from "../../../core/web/app/shared/fileValidation";

export function evidenceIssue(files: EvidenceFile[], maxCount = 10) {
  if (files.some((file) => !file.name.trim() || file.name.length > 255))
    return "Each file needs a name of up to 255 characters.";
  return attachmentError(files as unknown as File[], { maxCount });
}

export function EvidencePicker({
  files,
  onChange,
  run,
  disabled,
  maxCount = 10,
}: {
  files: EvidenceFile[];
  onChange: (files: EvidenceFile[]) => void;
  run: (pick: () => Promise<void>) => void;
  disabled?: boolean;
  maxCount?: number;
}) {
  const pick = (load: () => Promise<EvidenceFile[]>) =>
    run(async () => {
      const selected = await load();
      if (!selected.length) return;
      const next = [...files, ...selected].filter(
        (file, index, all) =>
          all.findIndex((entry) => entry.uri === file.uri) === index,
      );
      const issue = evidenceIssue(next, maxCount);
      if (issue) throw new Error(issue);
      onChange(next);
    });
  return (
    <>
      <Text style={{ fontWeight: "600" }}>Evidence (optional)</Text>
      <Notice>
        Choose supported images, PDF, Word or Excel files. Up to {maxCount}{" "}
        {maxCount === 1 ? "file" : "files"}, 25 MB each.
      </Notice>
      <Row>
        <Button
          variant="outline"
          disabled={disabled}
          onPress={() => pick(() => chooseFiles("*/*", maxCount > 1))}
        >
          Choose files
        </Button>
        {Platform.OS !== "web" && (
          <Button
            variant="outline"
            disabled={disabled}
            onPress={() => pick(captureEvidencePhoto)}
          >
            Take photo
          </Button>
        )}
      </Row>
      {files.map((file) => (
        <Row key={file.uri}>
          <LabelValue
            label={file.name}
            value={`${Math.ceil(file.size / 1024)} KB`}
          />
          <Button
            variant="ghost"
            disabled={disabled}
            accessibilityLabel={`Remove ${file.name}`}
            onPress={() =>
              onChange(files.filter((item) => item.uri !== file.uri))
            }
          >
            Remove
          </Button>
        </Row>
      ))}
    </>
  );
}
