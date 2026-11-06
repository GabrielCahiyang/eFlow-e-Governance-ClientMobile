import { useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Notice,
  Screen,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "./AuthProvider";
import { chooseFiles, asServiceFile } from "../../../platform/files";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
} from "../../../core/web/app/features/professional-profile/services/professionalProfileService";
import {
  completeProjectOnboarding,
  uploadRequestPds,
} from "../../../core/web/app/features/project-invitations/services/projectInvitationService";
export function ProjectGuestProfile({
  requestId,
  onDone,
}: {
  requestId: string;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const action = useAction();
  const profile = useFacts(
    "guest-profile:" + user?.id,
    () => getProfessionalProfile(user!.id),
    !!user,
  );
  const [skills, setSkills] = useState<string>();
  const [experience, setExperience] = useState<string>();
  const [summary, setSummary] = useState<string>();
  const [fileName, setFileName] = useState("");
  const current = profile.data?.profile;
  const values = {
    skills: skills ?? current?.skills?.join(", ") ?? "",
    experience: experience ?? current?.work_experience?.join("\n") ?? "",
    summary: summary ?? current?.competency_summary ?? "",
  };
  const edited =
    skills !== undefined || experience !== undefined || summary !== undefined;
  const list = (text: string, separator: RegExp) =>
    text
      .split(separator)
      .map((s) => s.trim())
      .filter(Boolean);
  return (
    <Screen title="Your project access is ready">
      <Card title="Professional profile">
        <Notice>These details are optional. Your PDS stays private.</Notice>
        {!!profile.error && (
          <ErrorState
            error={profile.error}
            retry={() => void profile.refresh()}
          />
        )}
        <Field
          label="Skills (comma separated)"
          value={values.skills}
          onChangeText={setSkills}
        />
        <Field
          label="Work experience (one entry per line)"
          value={values.experience}
          onChangeText={setExperience}
          multiline
        />
        <Field
          label="Professional summary"
          value={values.summary}
          onChangeText={setSummary}
          multiline
        />
        <Button
          variant="outline"
          busy={action.busy}
          disabled={!user}
          onPress={() =>
            void action.run(async () => {
              const [file] = await chooseFiles("application/pdf");
              if (!file) return;
              if (
                file.type !== "application/pdf" ||
                file.size > 10 * 1024 * 1024
              )
                throw new Error("Choose a PDF up to 10 MB.");
              await uploadRequestPds(await asServiceFile(file), requestId);
              setFileName(file.name);
            })
          }
        >
          Upload private PDS
        </Button>
        {!!fileName && <Notice>Uploaded {fileName}</Notice>}
        {!!action.error && <ErrorState context="action" error={action.error} />}
        <Button
          busy={action.busy}
          disabled={!user || (edited && (profile.loading || !!profile.error))}
          onPress={() =>
            void action.run(async () => {
              if (edited)
                await updateProfessionalProfile({
                  skills: list(values.skills, /,/),
                  work_experience: list(values.experience, /\r?\n/),
                  competency_summary: values.summary.trim(),
                  education: current?.education || [],
                  trainings: current?.trainings || [],
                  certifications: current?.certifications || [],
                  specializations: current?.specializations || [],
                });
              await completeProjectOnboarding(requestId);
              onDone();
            })
          }
        >
          Continue to project
        </Button>
      </Card>
    </Screen>
  );
}
