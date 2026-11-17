import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import Briefcase from "lucide-react-native/icons/briefcase";
import Check from "lucide-react-native/icons/check";
import Eye from "lucide-react-native/icons/eye";
import FileText from "lucide-react-native/icons/file-text";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Upload from "lucide-react-native/icons/upload";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  Row,
  Status,
  withOpacity,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useToast } from "../../components/ui/Toast";
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
    { retryOnEndpointChange: false, timeoutMs: 60_000 },
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

const formatFieldLabel = (field: string) => {
  const spaced = field.replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export function ProfessionalProfile({ userId }: { userId: string }) {
  const { profile } = useAuth(),
    { toast } = useToast(),
    palette = useTheme(),
    { isDark } = useAppearance(),
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
    confirmed = Boolean(facts.data?.profile?.confirmed_by_user),
    insetSurface = isDark
      ? withOpacity(palette.background, 0.72)
      : "#f7f9fd",
    save = () =>
      action.run(async () => {
        await updateProfessionalProfile(values);
        setDraft(undefined);
        toast("Professional profile saved.", "success");
        await facts.refresh();
      }, "Professional profile saved. Confirm it before AI staffing uses it.");

  return (
    <>
      <Card
        title="Professional profile"
        icon={<Briefcase size={16} color={palette.primary} />}
        action={
          facts.data ? (
            <Status
              value={confirmed ? "approved" : "pending"}
              label={confirmed ? "Confirmed" : "Needs confirmation"}
              variant="pill"
            />
          ) : undefined
        }
        style={{ gap: 12 }}
      >
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
            <Notice>
              Staffing suggestions use confirmed profile details. Check imported
              information before confirming.
            </Notice>
            {professionalFields.map((field) => (
              <Field
                key={field}
                label={formatFieldLabel(field)}
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
                  icon={<Check size={16} color={palette.onPrimary} />}
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
                  icon={<ShieldCheck size={16} color={palette.primary} />}
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
                      toast("Professional profile confirmed.", "success");
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
          <Card
            title="Personal Data Sheet (PDS)"
            icon={<FileText size={16} color={palette.primary} />}
            badge={
              documents.data?.documents.length
                ? `${documents.data.documents.length}`
                : undefined
            }
            style={{ gap: 12 }}
          >
            <Notice>
              Upload a PDF up to 10 MB. Review the extracted details before
              saving them to your professional profile.
            </Notice>
            <Button
              busy={action.busy}
              icon={<Upload size={16} color={palette.onPrimary} />}
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
                  toast("PDS uploaded.", "success");
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
              <View style={styles.docList}>
                {documents.data?.documents.map((document) => (
                  <View
                    key={document.id}
                    style={[
                      styles.docCard,
                      {
                        backgroundColor: insetSurface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.docHeader}>
                      <View
                        style={[
                          styles.docIcon,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <FileText size={15} color={palette.primary} />
                      </View>
                      <View style={styles.docCopy}>
                        <Text
                          style={[styles.docTitle, { color: palette.text }]}
                        >
                          {document.original_filename}
                        </Text>
                        <Status
                          value={document.processing_status}
                          variant="pill"
                        />
                      </View>
                    </View>
                    {!!document.processing_error && (
                      <Notice tone="warning">
                        {document.processing_error}
                      </Notice>
                    )}
                    <Row>
                      <Button
                        variant="outline"
                        icon={<FileText size={16} color={palette.primary} />}
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
                          icon={<RefreshCw size={16} color={palette.primary} />}
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
                          icon={<Eye size={16} color={palette.primary} />}
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
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
    </>
  );
}

const styles = StyleSheet.create({
  docList: {
    gap: 10,
  },
  docCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  docHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  docIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    alignItems: "flex-start",
  },
  docTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
});
