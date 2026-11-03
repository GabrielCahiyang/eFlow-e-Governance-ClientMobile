import { useEffect, useRef, useState } from "react";
import {
  Button,
  ErrorState,
  Field,
  Loading,
  Notice,
  Sheet,
} from "../../components/ui";
import { draftStore } from "../../../platform/draftStore";
import {
  createWorkspace,
  createPersonalProject,
} from "../../../core/web/app/features/workspaces/services/workspaceService";
interface Creation {
  schema: 1;
  kind: "workspace" | "project";
  context: string;
  request: string;
  title: string;
  created?: string;
}
export function WorkspaceCreateSheet({
  kind,
  actor,
  context,
  onClose,
  onCreated,
}: {
  kind: "workspace" | "project";
  actor: string;
  context: string;
  onClose: () => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(true),
    [title, setTitle] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<Creation | null>(null);
  const scope = `personal-create:${kind}:${context}`,
    active = useRef(false),
    ready = useRef(false),
    generation = useRef(0),
    receipt = useRef<Creation | null>(null);
  useEffect(() => {
    const revision = ++generation.current;
    ready.current = false;
    void draftStore
      .get<Creation>(actor, scope)
      .then((saved) => {
        if (revision !== generation.current) return;
        if (
          saved !== null &&
          (saved.schema !== 1 ||
            saved.kind !== kind ||
            saved.context !== context ||
            typeof saved.request !== "string" ||
            saved.request.length < 10 ||
            typeof saved.title !== "string" ||
            !saved.title.trim() ||
            (saved.created !== undefined && typeof saved.created !== "string"))
        )
          throw new Error(
            "The saved creation request could not be verified. Check its original result before continuing.",
          );
        receipt.current = saved;
        setPending(saved);
        setTitle(saved?.title || "");
        ready.current = true;
      })
      .catch((reason) => {
        if (revision === generation.current) setError(reason.message);
      })
      .finally(() => {
        if (revision === generation.current) setLoading(false);
      });
    return () => {
      ++generation.current;
    };
  }, [actor, scope]);
  const save = async () => {
    if (active.current || !ready.current) return;
    if (!title.trim()) {
      setError("Enter a name.");
      return;
    }
    active.current = true;
    setBusy(true);
    setError("");
    const revision = generation.current;
    try {
      let request = receipt.current;
      if (!request) {
        request = {
          schema: 1,
          kind,
          context,
          request: crypto.randomUUID(),
          title: title.trim(),
        };
        await draftStore.set(actor, scope, request);
        if (revision !== generation.current) return;
        receipt.current = request;
        setPending(request);
      }
      let id = request.created;
      if (!id) {
        const result =
          kind === "workspace"
            ? await createWorkspace(
                request.request,
                request.title,
                "Asia/Manila",
              )
            : await createPersonalProject(
                context,
                request.request,
                request.title,
              );
        if (!result || typeof result.id !== "string" || !result.id)
          throw new Error(
            "No creation receipt was returned. Retry this same request.",
          );
        id = result.id;
        request = { ...request, created: id };
        await draftStore.set(actor, scope, request);
        if (revision !== generation.current) return;
        receipt.current = request;
        setPending(request);
      }
      await onCreated(id);
      await draftStore.remove(actor, scope);
      if (revision === generation.current) onClose();
    } catch (reason) {
      if (revision === generation.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not create. Retry keeps the original identity.",
        );
    } finally {
      active.current = false;
      if (revision === generation.current) setBusy(false);
    }
  };
  return (
    <Sheet
      open
      title={`Create personal ${kind}`}
      onClose={onClose}
      busy={busy}
      footer={
        <Button
          busy={busy}
          disabled={loading || !ready.current || !title.trim()}
          onPress={() => void save()}
        >
          {pending?.created
            ? "Open created record"
            : pending
              ? "Retry same creation"
              : `Create ${kind}`}
        </Button>
      }
    >
      {loading ? (
        <Loading />
      ) : (
        <>
          <Field
            label={kind === "workspace" ? "Workspace name" : "Project name"}
            value={title}
            onChangeText={setTitle}
            maxLength={kind === "workspace" ? 120 : 200}
            editable={!pending && !busy}
          />
          <Notice>
            Personal work uses its own review process. Your Office affiliation
            and financial authority remain unchanged.
          </Notice>
          {!!pending && (
            <Notice>
              A saved request is retained. Retry uses its original name and
              identity.
            </Notice>
          )}
        </>
      )}
      {!!error && <ErrorState error={error} />}
    </Sheet>
  );
}
