import * as DocumentPicker from "expo-document-picker";
import Check from "lucide-react-native/icons/check";
import ExternalLink from "lucide-react-native/icons/external-link";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Trash2 from "lucide-react-native/icons/trash";
import Upload from "lucide-react-native/icons/upload";
import X from "lucide-react-native/icons/x";
import { useTheme } from "../../../components/ui/Appearance";
import {
  Button,
  Card,
  Choice,
  DateField,
  Field,
  LabelValue,
  Loading,
  Notice,
  Sheet,
} from "../../../components/ui";
import { Text } from "../../../components/ui/Typography";
import { useAuth } from "../../authentication";
import { formDraftKey, useRetainedDraft } from "../../../shared/formDraftMemory";
import { useNativePdfImport } from "./useNativePdfImport";
import { useAction } from "../../../shared/useAction";
import { useToast } from "../../../components/ui/Toast";
import { PublicMessageError } from "../../../shared/userMessages";
import { confirmAction } from "../../../shared/confirm";
import type { ProposedOffice } from "../../../../core/web/app/features/project-import/types";
export function PdfImportSheet({
  project,
  title,
  onClose,
  onImported,
}: {
  project: string;
  title: string;
  onClose: () => void;
  onImported: () => Promise<unknown>;
}) {
  const { profile } = useAuth();
  const palette = useTheme();
  const { toast } = useToast();
  const imp = useNativePdfImport(project, () => void onImported()),
    action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(profile?.id, "pdf-import:" + project),
    true,
    () => ({
      anchor: new Date().toISOString().slice(0, 10),
      offices: false,
      assign: true,
      review: undefined as ProposedOffice[] | undefined,
    }),
  );
  const { anchor, offices, assign, review } = draft;
  const close = () => {
    if (imp.busy || action.busy) return;
    action.clear();
    if (imp.result) clearDraft();
    onClose();
  };
  const select = () =>
    action.run(async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (!asset.size || asset.size > 20 * 1024 * 1024)
        throw new PublicMessageError("Choose a PDF up to 20 MB.");
      await imp.upload(
        { uri: asset.uri, name: asset.name, size: asset.size },
        anchor,
        offices,
        assign,
      );
    });
  const officeReview = imp.session?.state.stage === "review_offices",
    items = review || imp.session?.state.draft?.offices || [];
  return (
    <Sheet
      actionError={action.error || (!imp.result ? imp.error : undefined)}
      open
      title={"Import PDF into " + title}
      busy={imp.busy || action.busy}
      onClose={close}
    >
      <Notice>
        Groups, tasks, schedules and budgets are saved through the same import
        batch as the web app. Existing work is preserved.
      </Notice>
      {imp.loading ? (
        <Loading />
      ) : imp.result ? (
        <Card title="Your project table is ready">
          <LabelValue label="Imported tasks" value={imp.result.taskCount} />
          <LabelValue
            label="Offices added"
            value={imp.result.officeCount || 0}
          />
          <LabelValue
            label="Assigned tasks"
            value={imp.result.assignedTaskCount || 0}
          />
          <Button
            icon={<ExternalLink size={16} color={palette.onPrimary} />}
            onPress={close}
          >
            Open project table
          </Button>
        </Card>
      ) : (
        <>
          {!imp.session && (
            <>
              <DateField
                label="Schedule starts"
                value={anchor}
                onChange={(next) => updateDraft({ anchor: next })}
              />
              <Choice
                label="Add participating offices from the PDF"
                value={offices ? "yes" : "no"}
                searchable={false}
                onChange={(v) => updateDraft({ offices: v === "yes" })}
                options={[
                  { value: "no", label: "Do not add offices" },
                  { value: "yes", label: "Extract and review offices" },
                ]}
              />
              <Choice
                label="AI assignment"
                value={assign ? "yes" : "no"}
                searchable={false}
                onChange={(v) => updateDraft({ assign: v === "yes" })}
                options={[
                  {
                    value: "yes",
                    label: "Choose eligible people with Qwen + LAYA",
                  },
                  { value: "no", label: "Assign people later" },
                ]}
              />
            </>
          )}
          {!!imp.session && (
            <Card title="Saved import progress">
              {imp.session.state.events.slice(-8).map((event, index) => (
                <Text key={index}>
                  {index === imp.session!.state.events.slice(-8).length - 1
                    ? "●"
                    : "✓"}{" "}
                  {event}
                </Text>
              ))}
              {!!imp.message && <Notice>{imp.message}</Notice>}
            </Card>
          )}
          {officeReview ? (
            <>
              <Notice>
                Check responsible office names. Funding sources and vague
                entries are excluded. New offices remain unstaffed until you
                invite people manually.
              </Notice>
              {imp.session?.state.extraction?.clarification.map(
                (item, index) => (
                  <Notice key={index}>Check office name: {item}</Notice>
                ),
              )}
              {items.map((office, index) => (
                <Card key={office.key}>
                  <Field
                    label="Office name"
                    value={office.name}
                    onChangeText={(name) =>
                      updateDraft({
                        review: items.map((item, i) =>
                          i === index ? { ...item, name } : item,
                        ),
                      })
                    }
                  />
                  <Text>{office.evidence}</Text>
                  <LabelValue
                    label="People"
                    value={
                      office.officeId
                        ? "Existing lead office"
                        : "Needs people · invitations are manual"
                    }
                  />
                  <Button
                    variant="danger"
                    icon={<X size={16} color={palette.onDanger} />}
                    onPress={() =>
                      updateDraft({
                        review: items.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Exclude office
                  </Button>
                </Card>
              ))}
              <Button
                disabled={imp.busy || items.some((item) => !item.name.trim())}
                icon={<Check size={16} color={palette.onPrimary} />}
                onPress={() => void imp.confirmOffices(items)}
              >
                Confirm offices and continue
              </Button>
            </>
          ) : (
            !imp.busy && (
              <Button
                busy={action.busy}
                icon={<Upload size={16} color={palette.onPrimary} />}
                onPress={() => void select()}
              >
                {imp.session
                  ? "Choose original PDF again"
                  : "Choose PDF · up to 20 MB"}
              </Button>
            )
          )}
          {!!imp.session && !imp.busy && !officeReview && (
            <Button
              icon={<RefreshCw size={16} color={palette.onPrimary} />}
              onPress={() => void imp.resume()}
            >
              Resume saved import
            </Button>
          )}
          {!!imp.session && !imp.busy && (
            <Button
              variant="danger"
              icon={<Trash2 size={16} color={palette.onDanger} />}
              onPress={() =>
                void action.run(async () => {
                  if (
                    await confirmAction(
                      "Discard pending import?",
                      "Work already saved by a completed batch is not removed.",
                      "Discard",
                    )
                  ) {
                    await imp.discard();
                    clearDraft();
                    toast("Pending import discarded.", "success");
                  }
                })
              }
            >
              Discard pending import
            </Button>
          )}
        </>
      )}
      {!!imp.busy && (
        <Notice>
          Processing your import. Keep eFlow open; saved checkpoints allow
          recovery after a refresh or restart.
        </Notice>
      )}
    </Sheet>
  );
}
