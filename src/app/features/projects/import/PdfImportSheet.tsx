import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Sheet,
} from "../../../components/ui";
import { Text } from "../../../components/ui/Typography";
import { useNativePdfImport } from "./useNativePdfImport";
import { useAction } from "../../../shared/useAction";
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
  const imp = useNativePdfImport(project, () => void onImported()),
    action = useAction(),
    [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10)),
    [offices, setOffices] = useState(false),
    [assign, setAssign] = useState(true),
    [review, setReview] = useState<ProposedOffice[]>();
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
        throw new Error("Choose a PDF up to 20 MB.");
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
      open
      title={"Import PDF into " + title}
      busy={imp.busy || action.busy}
      onClose={() => {
        if (!imp.busy && !action.busy) onClose();
      }}
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
          <Button onPress={onClose}>Open project table</Button>
        </Card>
      ) : (
        <>
          {!imp.session && (
            <>
              <DateField
                label="Schedule starts"
                value={anchor}
                onChange={setAnchor}
              />
              <Choice
                label="Add participating offices from the PDF"
                value={offices ? "yes" : "no"}
                onChange={(v) => setOffices(v === "yes")}
                options={[
                  { value: "no", label: "Do not add offices" },
                  { value: "yes", label: "Extract and review offices" },
                ]}
              />
              <Choice
                label="AI assignment"
                value={assign ? "yes" : "no"}
                onChange={(v) => setAssign(v === "yes")}
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
                      setReview(
                        items.map((item, i) =>
                          i === index ? { ...item, name } : item,
                        ),
                      )
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
                    onPress={() =>
                      setReview(items.filter((_, i) => i !== index))
                    }
                  >
                    Exclude office
                  </Button>
                </Card>
              ))}
              <Button
                disabled={imp.busy || items.some((item) => !item.name.trim())}
                onPress={() => void imp.confirmOffices(items)}
              >
                Confirm offices and continue
              </Button>
            </>
          ) : (
            !imp.busy && (
              <Button busy={action.busy} onPress={() => void select()}>
                {imp.session
                  ? "Choose original PDF again"
                  : "Choose PDF · up to 20 MB"}
              </Button>
            )
          )}
          {!!imp.session && !imp.busy && !officeReview && (
            <Button onPress={() => void imp.resume()}>
              Resume saved import
            </Button>
          )}
          {!!imp.session && !imp.busy && (
            <Button
              variant="danger"
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
                    setReview(undefined);
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
      {!!(imp.error && !imp.result) && <ErrorState error={imp.error} />}{" "}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
