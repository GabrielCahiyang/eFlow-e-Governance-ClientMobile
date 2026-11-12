import { useState } from "react";
import { Linking } from "react-native";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Status,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { chooseFiles, asServiceFile } from "../../../platform/files";
import {
  updateProfessionalProfile,
  confirmProfessionalProfile,
  uploadPds,
  retryPds,
  getPdsDownload,
  getPdsDraft,
} from "../../../core/web/app/features/professional-profile/services/professionalProfileService";
import {
  professionalFields,
  type PdsDocument,
  type ProfessionalProfile as ProfessionalProfileRecord,
  type ProfessionalValues,
} from "../../../core/web/app/features/professional-profile/types";
import { controlPanelFetch } from "../../../core/web/app/shared/controlPanelClient";
import { userErrorMessage } from "../../shared/userMessages";

async function readProfessionalRecord<T>(path: string): Promise<T> {
  const response = await controlPanelFetch(
    path,
    { cache: "no-store" },
    { retryOnEndpointChange: false, timeoutMs: 30000 },
  );
  if (!response.ok)
    throw Object.assign(new Error("Professional record request failed."), {
      status: response.status,
    });
  return response.json() as Promise<T>;
}
const empty: ProfessionalValues = {
  skills: [],
  education: [],
  trainings: [],
  certifications: [],
  work_experience: [],
  specializations: [],
  competency_summary: "",
};
export function ProfessionalProfile({ userId }: { userId: string }) {
  const { profile } = useAuth(),
    own = profile?.id === userId,
    facts = useFacts(`professional:${profile?.id}:${userId}`, () =>
      readProfessionalRecord<{ profile: ProfessionalProfileRecord | null }>(
        `/professional-profile/${encodeURIComponent(userId)}`,
      ),
    ),
    documents = useFacts(
      "own-pds:" + profile?.id,
      () => readProfessionalRecord<{ documents: PdsDocument[] }>("/pds/me"),
      own,
    ),
    action = useAction(),
    [draft, setDraft] = useState<ProfessionalValues>();
  const values = draft || facts.data?.profile || empty,
    save = () =>
      action.run(async () => {
        await updateProfessionalProfile(values);
        setDraft(undefined);
        await facts.refresh();
      }, "Professional profile saved. Confirm it before AI staffing uses it.");
  return (
    <>
      <Card title="Professional profile">
        {facts.error ? (
          <ErrorState
            error={facts.error}
            retry={() =>
              void Promise.all([facts.refresh(), documents.refresh()])
            }
          />
        ) : facts.loading && !facts.data ? (
          <Loading label="Loading professional profile" layout="form" />
        ) : (
          <>
            <Status
              value={
                facts.data?.profile?.confirmed_by_user
                  ? "Confirmed"
                  : "Needs confirmation"
              }
            />
            <Notice>
              Staffing suggestions use confirmed profile details. Check imported
              information before confirming.
            </Notice>
            {professionalFields.map((field) => (
              <Field
                key={field}
                label={field.replaceAll("_", " ")}
                value={values[field].join("\n")}
                onChangeText={(text) =>
                  setDraft({
                    ...values,
                    [field]: text
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                multiline
                editable={own && !action.busy}
              />
            ))}
            <Field
              label="Professional summary"
              value={values.competency_summary}
              onChangeText={(competency_summary) =>
                setDraft({ ...values, competency_summary })
              }
              multiline
              editable={own && !action.busy}
            />
            {!!own && (
              <Row>
                <Button
                  disabled={!draft || facts.loading}
                  busy={action.busy}
                  onPress={() => void save()}
                >
                  Save profile
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    !!draft ||
                    !facts.data?.profile ||
                    facts.loading ||
                    action.busy
                  }
                  onPress={() =>
                    void action.run(async () => {
                      if (
                        !(await confirmAction(
                          "Confirm your professional information?",
                          "Check the displayed skills, training and summary before confirming.",
                          "Confirm profile",
                        ))
                      )
                        return;
                      await confirmProfessionalProfile();
                      await facts.refresh();
                    }, "Professional profile confirmed.")
                  }
                >
                  Confirm information
                </Button>
              </Row>
            )}
          </>
        )}
      </Card>
      {!!own &&
        !(
          facts.error &&
          documents.error &&
          userErrorMessage(facts.error) === userErrorMessage(documents.error)
        ) && (
          <Card title="Personal Data Sheet (PDS)">
            <Notice>
              Upload a PDF up to 10 MB. Review the extracted details before
              saving them to your professional profile.
            </Notice>
            <Button
              busy={action.busy}
              onPress={() =>
                void action.run(async () => {
                  const [file] = await chooseFiles("application/pdf");
                  if (!file) return;
                  if (
                    file.size > 10 * 1024 * 1024 ||
                    !file.name.toLowerCase().endsWith(".pdf")
                  )
                    throw new Error("Choose a PDF smaller than 10 MB.");
                  await uploadPds(await asServiceFile(file));
                  await documents.refresh();
                })
              }
            >
              Upload PDS
            </Button>
            {documents.error ? (
              <ErrorState
                error={documents.error}
                retry={() => void documents.refresh()}
              />
            ) : documents.loading && !documents.data ? (
              <Loading label="Loading Personal Data Sheets" layout="files" />
            ) : !documents.data?.documents.length ? (
              <Empty
                compact
                kind="files"
                title="No Personal Data Sheets uploaded"
              />
            ) : (
              documents.data?.documents.map((document) => (
                <Card key={document.id} title={document.original_filename}>
                  <Status value={document.processing_status} />
                  {!!document.processing_error && (
                    <Notice>{document.processing_error}</Notice>
                  )}
                  <Row>
                    <Button
                      variant="outline"
                      onPress={() =>
                        void action.run(async () => {
                          await Linking.openURL(
                            (await getPdsDownload(document.id)).url,
                          );
                        })
                      }
                    >
                      Open PDF
                    </Button>
                    {!!(document.processing_status === "failed") && (
                      <Button
                        variant="outline"
                        busy={action.busy}
                        onPress={() =>
                          void action.run(async () => {
                            await retryPds(document.id);
                            await documents.refresh();
                          })
                        }
                      >
                        Retry extraction
                      </Button>
                    )}
                    {!!(document.processing_status === "completed") && (
                      <Button
                        variant="outline"
                        busy={action.busy}
                        onPress={() =>
                          void action.run(async () => {
                            const result = await getPdsDraft(document.id);
                            setDraft(result.draft);
                          })
                        }
                      >
                        Review extracted profile
                      </Button>
                    )}
                  </Row>
                </Card>
              ))
            )}
          </Card>
        )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
    </>
  );
}
