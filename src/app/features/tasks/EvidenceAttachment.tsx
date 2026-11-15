import { Linking } from "react-native";
import { Button, ErrorState } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { PublicMessageError } from "../../shared/userMessages";
import { supabase } from "../../../platform/supabase";

export function EvidenceAttachment({
  path,
  name,
  bucket,
}: {
  path: string;
  name: string;
  bucket?: "task-attachments" | "m7-work-evidence";
}) {
  const action = useAction();
  const resolvedBucket =
    bucket ??
    (path.split("/").length === 5 && path.split("/")[1] !== "subtasks"
      ? "m7-work-evidence"
      : "task-attachments");
  return (
    <>
      <Button
        variant="outline"
        busy={action.busy}
        onPress={() =>
          void action.run(async () => {
            const { data, error } = await supabase.storage
              .from(resolvedBucket)
              .createSignedUrl(path, 60);
            if (error) throw error;
            if (!data?.signedUrl)
              throw new PublicMessageError("This evidence is unavailable.");
            await Linking.openURL(data.signedUrl);
          })
        }
      >
        {name}
      </Button>
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </>
  );
}
