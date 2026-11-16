import { useEffect, useState } from "react";
import { AppState, Linking } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Text } from "../../components/ui/Typography";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Loading,
  Notice,
  Sheet,
  Toggle,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useAction } from "../../shared/useAction";
import { PublicMessageError } from "../../shared/userMessages";
import { supabase } from "../../../platform/supabase";
import { resolveNativeControlBase } from "../../../platform/gateway";
import { backendConfig } from "../../../platform/config";
import { chooseFiles } from "../../../platform/files";
import type {
  ArchiveFile,
  ArchiveManifest,
  ProjectSeal,
  SealConfiguration,
  SealStatus,
} from "./types";

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}
async function gateway(path: string, body?: unknown) {
  const { data } = await supabase.auth.getSession();
  if (!data.session)
    throw new PublicMessageError("Sign in again to review this project.");
  const base = await resolveNativeControlBase();
  const response = await fetch(base + "/project-seals/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + data.session.access_token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : "The publication service could not respond.",
    );
  }
  return response;
}
const running = ["preparing", "queued", "uploading", "broadcast", "confirming"];
async function shareFile(
  name: string,
  value: string | Uint8Array,
  mimeType: string,
) {
  const safe =
    name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(-100) || "project-record";
  const local = new File(Paths.cache, crypto.randomUUID() + "-" + safe);
  local.write(value);
  try {
    await Sharing.shareAsync(local.uri, { mimeType });
  } finally {
    local.delete();
  }
}

export function ProjectPublication({
  projectId,
  canPublish,
}: {
  projectId: string;
  canPublish: boolean;
}) {
  const [open, setOpen] = useState(false);
  const index = useFacts("certificate:" + projectId, async () => {
    const { data, error } = await supabase
      .from("project_seal_certificates")
      .select("id,tx_hash")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
  async function publicRecord(id: string) {
    if (!backendConfig.webOrigin)
      throw new PublicMessageError(
        "The public eFlow website address is not configured on this build.",
      );
    const url = new URL(backendConfig.webOrigin);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new PublicMessageError(
        "Configure the public eFlow HTTPS address.",
      );
    await Linking.openURL(
      new URL("/project-record/" + encodeURIComponent(id), url).toString(),
    );
  }
  const action = useAction();
  return (
    <>
      {canPublish && (
        <Button variant="outline" onPress={() => setOpen(true)}>
          {index.data ? "View blockchain seal" : "Seal on blockchain"}
        </Button>
      )}
      {!!index.data && (
        <Button
          variant="outline"
          onPress={() => void action.run(() => publicRecord(index.data!.id))}
        >
          Open public record
        </Button>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {open && (
        <SealSheet
          projectId={projectId}
          onClose={() => {
            setOpen(false);
            void index.refresh();
          }}
          onPublic={publicRecord}
        />
      )}
    </>
  );
}

function SealSheet({
  projectId,
  onClose,
  onPublic,
}: {
  projectId: string;
  onClose: () => void;
  onPublic: (id: string) => Promise<void>;
}) {
  const state = useFacts("seal:" + projectId, () =>
    rpc<SealStatus>("project_seal_status", { p_project_id: projectId }),
  );
  const config = useFacts(
    "seal-config",
    async () =>
      (await gateway("configuration")).json() as Promise<SealConfiguration>,
  );
  const seal = state.data?.snapshot;
  const preview = useFacts(
    "seal-preview:" + seal?.id + ":" + seal?.manifest_hash,
    () =>
      rpc<ProjectSeal>("seal_snapshot_preview", { p_snapshot_id: seal!.id }),
    !!seal?.manifest_hash &&
      ["review_ready", "failed", "confirmed", "simulation"].includes(
        seal.state,
      ),
  );
  const manifest: ArchiveManifest | undefined = preview.data?.manifest
    ? JSON.parse(preview.data.manifest)
    : undefined;
  const { profile } = useAuth();
  const [section, setSection] = useState("");
  const [copy, setCopy] = useState<ArchiveFile>();
  const action = useAction();
  const [draft, updateDraft] = useRetainedDraft(
    formDraftKey(profile?.id, "project-publication:" + projectId),
    true,
    () => ({
      consent: "",
      correction: "",
      copyReason: "",
    }),
  );
  const { consent, correction, copyReason } = draft;
  useEffect(() => {
    if (!seal || !running.includes(seal.state)) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void state.refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [seal?.state, state.refresh]);
  const run = (fn: () => Promise<unknown>) =>
    void action.run(async () => {
      await fn();
      updateDraft({ consent: "" });
      await state.refresh();
    });
  const hash = preview.data?.manifest_hash || "";
  const ready = seal?.state === "review_ready";
  const live = config.data?.mode === "live";
  const retryConsent = seal?.state === "failed" && !!seal.approved_at;
  return (
    <Sheet
      actionError={action.error}
      open
      title="Project publication"
      onClose={() => {
        if (!action.busy) {
          action.clear();
          onClose();
        }
      }}
      busy={action.busy}
    >
      {!state.data && state.loading && <Loading />}
      {!!state.error && (
        <ErrorState error={state.error} retry={() => void state.refresh()} />
      )}
      {!!config.error && (
        <ErrorState error={config.error} retry={() => void config.refresh()} />
      )}
      {!!preview.error && (
        <ErrorState
          error={preview.error}
          retry={() => void preview.refresh()}
        />
      )}
      {state.data && (
        <>
          <Notice>
            Archiving does not publish a project. Review the full record and
            every attachment before approving publication.
          </Notice>
          {!seal || seal.state === "cancelled" ? (
            <Button
              busy={action.busy}
              onPress={() =>
                run(() => gateway(projectId + "/prepare", { correction: null }))
              }
            >
              Prepare project preview
            </Button>
          ) : (
            <>
              <Notice>
                Version {seal.version} · {seal.state.replace(/_/g, " ")}
              </Notice>
              {!!seal.error && <ErrorState error={new Error(seal.error)} />}
              {running.includes(seal.state) && (
                <Notice>Publication is processing on the server.</Notice>
              )}
              {manifest && (
                <>
                  <Button
                    variant="outline"
                    busy={action.busy}
                    onPress={() =>
                      void action.run(() =>
                        shareFile(
                          "project-record.json",
                          preview.data!.manifest!,
                          "application/json",
                        ),
                      )
                    }
                  >
                    Share complete review record
                  </Button>
                  {Object.entries(manifest.records).map(([key, value]) => (
                    <Card key={key} title={key.replace(/_/g, " ")}>
                      <Button
                        variant="ghost"
                        onPress={() => setSection(section === key ? "" : key)}
                      >
                        {section === key ? "Hide details" : "Review details"}
                      </Button>
                      {section === key && (
                        <Text selectable>{JSON.stringify(value, null, 2)}</Text>
                      )}
                    </Card>
                  ))}
                  {manifest.files.map((f, i) => (
                    <Card key={f.sha256 + ":" + i} title={f.name}>
                      {!!f.publication_copy_note && (
                        <Notice>{f.publication_copy_note}</Notice>
                      )}
                      <Button
                        variant="outline"
                        busy={action.busy}
                        onPress={() =>
                          void action.run(async () => {
                            const response = await gateway(
                              "snapshots/" + seal.id + "/files/" + f.sha256,
                            );
                            await shareFile(
                              f.name,
                              new Uint8Array(await response.arrayBuffer()),
                              f.mime_type,
                            );
                          })
                        }
                      >
                        Open review file
                      </Button>
                      {ready && (
                        <Button
                          variant="ghost"
                          onPress={() => {
                            setCopy(f);
                            updateDraft({ consent: "" });
                          }}
                        >
                          Use publication copy
                        </Button>
                      )}
                    </Card>
                  ))}
                  {!!copy && ready && (
                    <Card title={"Replace publication copy: " + copy.name}>
                      <Field
                        label="Reason for the publication copy"
                        value={copyReason}
                        onChangeText={(next) => updateDraft({ copyReason: next })}
                      />
                      <Button
                        variant="ghost"
                        onPress={() => setCopy(undefined)}
                      >
                        Cancel replacement
                      </Button>
                      <Button
                        busy={action.busy}
                        onPress={() =>
                          run(async () => {
                            if (copyReason.trim().length < 5)
                              throw new PublicMessageError(
                                "Explain why the public copy is different.",
                              );
                            const [file] = await chooseFiles();
                            if (!file) return;
                            const bytes = await file.arrayBuffer();
                            if (
                              !bytes.byteLength ||
                              bytes.byteLength > 25 * 1024 * 1024
                            )
                              throw new PublicMessageError(
                                "Choose a nonempty file up to 25 MB.",
                              );
                            const { data } = await supabase.auth.getSession();
                            if (!data.session)
                              throw new PublicMessageError("Sign in again.");
                            const path =
                              seal.id +
                              "/" +
                              data.session.user.id +
                              "/" +
                              crypto.randomUUID();
                            const { error } = await supabase.storage
                              .from("project-seal-copies")
                              .upload(path, bytes, {
                                upsert: false,
                                contentType: file.type,
                              });
                            if (error) throw error;
                            await gateway(
                              "snapshots/" + seal.id + "/publication-copy",
                              {
                                original_sha256:
                                  copy.publication_copy_of || copy.sha256,
                                copy_path: path,
                                file_name: file.name,
                                mime_type: file.type,
                                reason: copyReason.trim(),
                              },
                            );
                            updateDraft({ copyReason: "" });
                            setCopy(undefined);
                          })
                        }
                      >
                        Choose and save copy
                      </Button>
                    </Card>
                  )}
                </>
              )}
              {(ready || retryConsent) && !!hash && !!config.data && (
                <>
                  <Toggle
                    label={
                      live
                        ? "I reviewed this exact record and approve public publication"
                        : "I reviewed this record for simulation"
                    }
                    value={consent === hash}
                    onChange={(v) => updateDraft({ consent: v ? hash : "" })}
                  />
                  {ready && (
                    <Button
                      busy={action.busy}
                      disabled={
                        consent !== hash ||
                        !config.data.worker_enabled ||
                        (live && !config.data.configured)
                      }
                      onPress={() =>
                        run(() =>
                          rpc("approve_project_seal", {
                            p_snapshot_id: seal.id,
                            p_manifest_hash: hash,
                          }),
                        )
                      }
                    >
                      {live ? "Publish and seal" : "Run simulation"}
                    </Button>
                  )}
                </>
              )}
              {["review_ready", "failed", "simulation"].includes(seal.state) &&
                !seal.approved_at && (
                  <Button
                    variant="outline"
                    busy={action.busy}
                    onPress={() =>
                      run(() =>
                        rpc("discard_project_seal", { p_snapshot_id: seal.id }),
                      )
                    }
                  >
                    Discard preview
                  </Button>
                )}
              {seal.state === "failed" && (
                <Button
                  variant="outline"
                  busy={action.busy}
                  disabled={
                    !config.data?.worker_enabled ||
                    (retryConsent && (!hash || consent !== hash))
                  }
                  onPress={() =>
                    run(() =>
                      rpc("retry_project_seal", { p_snapshot_id: seal.id }),
                    )
                  }
                >
                  Retry saved publication
                </Button>
              )}
              {seal.state === "confirmed" && (
                <>
                  {!!seal.tx_hash && /^0x[0-9a-f]{64}$/i.test(seal.tx_hash) && (
                    <Button
                      variant="outline"
                      onPress={() =>
                        void action.run(() =>
                          Linking.openURL(
                            "https://amoy.polygonscan.com/tx/" + seal.tx_hash,
                          ),
                        )
                      }
                    >
                      View Amoy transaction
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onPress={() => void action.run(() => onPublic(seal.id))}
                  >
                    Open public record
                  </Button>
                  <Field
                    label="Correction note"
                    value={correction}
                    onChangeText={(next) => updateDraft({ correction: next })}
                    multiline
                  />
                  <Button
                    disabled={!correction.trim()}
                    busy={action.busy}
                    onPress={() =>
                      run(async () => {
                        await gateway(projectId + "/prepare", {
                          correction: correction.trim(),
                        });
                        updateDraft({ correction: "" });
                      })
                    }
                  >
                    Prepare linked correction
                  </Button>
                </>
              )}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
