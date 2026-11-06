import { useState } from "react";
import { Linking } from "react-native";
import {
  Button,
  Card,
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
  getProfessionalProfile,
  updateProfessionalProfile,
  confirmProfessionalProfile,
  getMyPds,
  uploadPds,
  retryPds,
  getPdsDownload,
  getPdsDraft,
} from "../../../core/web/app/features/professional-profile/services/professionalProfileService";
import {
  professionalFields,
  type ProfessionalValues,
} from "../../../core/web/app/features/professional-profile/types";
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
      getProfessionalProfile(userId),
    ),
    documents = useFacts("own-pds:" + profile?.id, getMyPds, own),
    action = useAction(),
    [draft, setDraft] = useState<ProfessionalValues>(),
    [validation, setValidation] = useState("");
  const values = draft || facts.data?.profile || empty,
    save = () =>
      action.run(async () => {
        await updateProfessionalProfile(values);
        setDraft(undefined);
        await facts.refresh();
      }, "Professional profile saved. Confirm it before AI staffing uses it.");
  return (
    <>
      <Card title="Professional Profile">
        {facts.error ? (
          <ErrorState error={facts.error} retry={() => void facts.refresh()} />
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
              AI staffing uses confirmed skills, training and your concise
              professional summary. Review imported information before
              confirming.
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
                  disabled={!draft}
                  busy={action.busy}
                  onPress={() => void save()}
                >
                  Save profile
                </Button>
                <Button
                  variant="outline"
                  disabled={!!draft || !facts.data?.profile || action.busy}
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
      {!!own && (
        <Card title="Personal Data Sheet (PDS)">
          <Notice>
            Upload your own PDF, review the extracted draft, then save and
            confirm the professional profile. Personal documents stay within the
            existing access rules.
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
            Upload PDS PDF
          </Button>
          {documents.error ? (
            <ErrorState
              error={documents.error}
              retry={() => void documents.refresh()}
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
      {!!validation && <ErrorState error={validation} />}
    </>
  );
}
