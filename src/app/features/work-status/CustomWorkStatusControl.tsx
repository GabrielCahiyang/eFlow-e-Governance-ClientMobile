import { useState } from "react";
import { customStatusChoices } from "../../../core/web/app/features/work-status/statusDefinitions";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/Screen";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useAction } from "../../shared/useAction";
import { PublicMessageError } from "../../shared/userMessages";
import {
  useWorkStatus,
  useWorkStatusCatalog,
} from "../../shared/workStatusPresentation";

export function CustomWorkStatusControl({
  actor,
  taskId,
  nodeId,
  customId,
}: {
  actor: string;
  taskId: string;
  nodeId?: string;
  customId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const action = useAction();
  const { definitions, ready } = useWorkStatusCatalog();
  const resolve = useWorkStatus();
  const choices = customStatusChoices(definitions, nodeId ? "subtask" : "task");
  if (!choices.length && !customId) return null;
  const options = [
    { id: "", title: resolve("in_progress").label },
    ...choices.map(({ id, label }) => ({ id, title: label })),
  ];
  const change = (id: string) => {
    setOpen(false);
    if (id === (customId ?? "")) return;
    void action.run(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || data.session?.user.id !== actor)
        throw new PublicMessageError("Sign in again to change the status.");
      // The same RPC as Web rechecks current membership, lifecycle and label scope.
      const result = await supabase.rpc("set_work_custom_status", {
        p_task: taskId,
        p_subtask: nodeId ?? null,
        p_status: id || null,
      });
      if (result.error)
        throw new PublicMessageError(
          "Could not change the status. Check that the work and label are still available.",
        );
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    });
  };
  return (
    <>
      <Button
        variant="outline"
        disabled={!ready || action.busy}
        onPress={() => setOpen(true)}
      >
        In-progress label
      </Button>
      {action.error && <ErrorState error={action.error} />}
      {open && ready && (
        <SelectionSheet
          open
          title="In-progress label"
          value={customId ?? ""}
          options={options}
          onSelect={change}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
