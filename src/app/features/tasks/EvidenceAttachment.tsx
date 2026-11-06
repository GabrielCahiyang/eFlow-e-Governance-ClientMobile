import { Linking } from "react-native";
import { Button, ErrorState } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { supabase } from "../../../platform/supabase";

export function EvidenceAttachment({
  path,
  name,
}: {
  path: string;
  name: string;
}) {
  const action = useAction();
  return (
    <>
      <Button
        variant="outline"
        busy={action.busy}
        onPress={() =>
          void action.run(async () => {
            const { data, error } = await supabase.storage
              .from("task-attachments")
              .createSignedUrl(path, 60);
            if (error || !data?.signedUrl)
              throw new Error(
                error?.message || "This evidence is unavailable.",
              );
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
