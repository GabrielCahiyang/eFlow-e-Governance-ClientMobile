import { useEffect, useRef, useState } from "react";
import {
  Button,
  Choice,
  DateField,
  ErrorState,
  Field,
  Notice,
  Row,
  Sheet,
  Toggle,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { fetchAllProfiles } from "../../../core/web/lib/supabaseService";
import { createProject } from "../../../core/web/app/features/projects/services/projectService";
import { supabase } from "../../../platform/supabase";

type Draft = {
  title: string;
  description: string;
  scope: string;
  lead: string;
  start: string;
  end: string;
  noFunding: boolean;
};
type Snapshot = {
  project: {
    updated_at: string;
    title: string;
    description: string;
    scope: string;
    project_lead_id: string;
    start_date: string;
    target_date: string;
    funding_not_required: boolean;
  };
  total: number;
  canAuthorize: boolean;
  sources: { id: string; name: string; year: number; available: number }[];
};
const steps = ["Details", "Scope", "Lead & dates", "Funding", "Review"];
const empty: Draft = {
  title: "",
  description: "",
  scope: "",
  lead: "",
  start: "",
  end: "",
  noFunding: false,
};
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}
const read = (id: string) =>
  rpc<Snapshot>("project_flow_snapshot", { p_project: id });

export function ProjectSetupSheet({
  orgId,
  projectId,
  onClose,
  onDone,
}: {
  orgId?: string;
  projectId?: string;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const action = useAction();
  const people = useFacts("setup-people:" + orgId, fetchAllProfiles, !!orgId);
  const [draft, setDraft] = useState<Draft>(empty),
    [step, setStep] = useState(0),
    [snapshot, setSnapshot] = useState<Snapshot>();
  const [rows, setRows] = useState([{ partitionId: "", amount: "" }]),
    [reason, setReason] = useState("");
  const [locked, setLocked] = useState(false);
  const id = useRef(projectId),
    version = useRef<string | undefined>(undefined),
    fundKey = useRef<string | undefined>(undefined);
  const savedFunding = useRef(false);
  const edit = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const hydrate = () =>
    action.run(async () => {
      const data = await read(projectId!);
      const p = data.project;
      version.current = p.updated_at;
      setDraft({
        title: p.title || "",
        description: p.description || "",
        scope: p.scope || "",
        lead: p.project_lead_id || "",
        start: p.start_date || "",
        end: p.target_date || "",
        noFunding: p.funding_not_required,
      });
      setSnapshot(data);
    });
  useEffect(() => {
    if (projectId) void hydrate();
  }, [projectId]);
  async function persist() {
    if (!draft.title.trim()) throw new Error("Enter a project title.");
    if (!id.current)
      id.current = (
        await createProject({
          title: draft.title.trim(),
          description: draft.description,
          orgId,
        })
      ).id;
    const current = await read(id.current);
    if (version.current && version.current !== current.project.updated_at)
      throw new Error(
        "Project changed elsewhere. Reopen setup to review the latest details.",
      );
    const p = current.project;
    const noFunding = current.total > 0 ? false : draft.noFunding;
    if (
      p.title !== draft.title.trim() ||
      p.description !== draft.description ||
      p.scope !== draft.scope ||
      (p.project_lead_id || "") !== draft.lead ||
      (p.start_date || "") !== draft.start ||
      (p.target_date || "") !== draft.end ||
      p.funding_not_required !== noFunding
    ) {
      const saved = await rpc<{ updated_at: string }>(
        "save_project_definition",
        {
          p_project: id.current,
          p_details: { ...draft, noFunding, version: p.updated_at },
        },
      );
      version.current = saved.updated_at;
    }
    const data = await read(id.current);
    version.current = data.project.updated_at;
    setSnapshot(data);
    return data;
  }
  const validate = (index: number) => {
    if (index === 0 && (!draft.title.trim() || !draft.description.trim()))
      throw new Error("Enter a project title and description.");
    if (index === 1 && !draft.scope.trim())
      throw new Error("Enter the project scope.");
    if (
      index === 2 &&
      (!draft.lead || !draft.start || !draft.end || draft.end < draft.start)
    )
      throw new Error(
        "Choose a project lead and valid start and target dates.",
      );
  };
  const sources = (snapshot?.sources || []).filter((s) => s.available > 0);
  const changeRow = (index: number, part: Partial<(typeof rows)[number]>) =>
    setRows((old) => old.map((r, i) => (i === index ? { ...r, ...part } : r)));
  const authorize = () =>
    action.run(async () => {
      if (!id.current || !snapshot?.canAuthorize)
        throw new Error("Only the office Head can authorize project funding.");
      if (new Set(rows.map((r) => r.partitionId)).size !== rows.length)
        throw new Error("Choose each account only once.");
      const lines = rows.map((r) => {
        const source = sources.find((s) => s.id === r.partitionId),
          amount = Number(r.amount);
        if (
          !source ||
          !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(r.amount) ||
          amount <= 0
        )
          throw new Error("Choose an account and enter a positive amount.");
        if (amount > source.available)
          throw new Error(
            source.name +
              " has only ₱" +
              source.available.toLocaleString() +
              " available.",
          );
        return { partitionId: r.partitionId, amount };
      });
      if (!reason.trim()) throw new Error("Enter a reason for the funding.");
      fundKey.current ??= crypto.randomUUID();
      setLocked(true);
      if (!savedFunding.current) {
        try {
          await rpc("authorize_project_funding", {
            p_project: id.current,
            p_lines: lines,
            p_reason: reason.trim(),
            p_key: fundKey.current,
          });
          savedFunding.current = true;
        } catch (error) {
          const code = (error as { code?: string })?.code;
          if (
            code &&
            /^[0-9A-Z]{5}$/.test(code) &&
            !code.startsWith("08") &&
            code !== "57014"
          ) {
            fundKey.current = undefined;
            setLocked(false);
          }
          throw error;
        }
      }
      const data = await read(id.current);
      version.current = data.project.updated_at;
      setSnapshot(data);
      setRows([{ partitionId: "", amount: "" }]);
      setReason("");
      fundKey.current = undefined;
      savedFunding.current = false;
      setLocked(false);
    });
  const openStep = (next: number) =>
    action.run(async () => {
      if (next === 3 && !snapshot) {
        [0, 1, 2].forEach(validate);
        await persist();
      }
      setStep(next);
    });
  const finish = () =>
    action.run(async () => {
      [0, 1, 2].forEach(validate);
      if (rows.some((r) => r.amount || r.partitionId) || reason.trim())
        throw new Error("Save or remove the funding entries first.");
      const data = await persist();
      if (!draft.noFunding && data.total <= 0)
        throw new Error("Add funding or choose No funding required.");
      await rpc("finish_project_setup", { p_project: id.current });
      onDone(id.current!);
    });
  const waiting = !!projectId && !snapshot;
  const footer = !waiting && !locked && (
    <Row>
      {step > 0 && (
        <Button variant="outline" onPress={() => void openStep(step - 1)}>
          Back
        </Button>
      )}
      <Button
        variant="outline"
        busy={action.busy}
        onPress={() =>
          void action.run(async () => {
            await persist();
            onDone(id.current!);
          })
        }
      >
        Save draft
      </Button>
      {step < 4 ? (
        <Button
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              validate(step);
              if (step === 2) await persist();
              setStep(step + 1);
            })
          }
        >
          Next
        </Button>
      ) : (
        <Button busy={action.busy} onPress={() => void finish()}>
          Finish setup
        </Button>
      )}
    </Row>
  );
  return (
    <Sheet
      open
      footer={footer}
      title={projectId ? "Project setup" : "Create project"}
      busy={action.busy}
      onClose={() => {
        if (!locked && !action.busy) onClose();
      }}
    >
      {waiting ? (
        <Button busy={action.busy} onPress={() => void hydrate()}>
          Load project setup
        </Button>
      ) : (
        <>
          <Choice
            label="Setup step"
            value={String(step)}
            onChange={(v) => {
              if (!locked) void openStep(Number(v));
            }}
            options={steps.map((label, i) => ({ label, value: String(i) }))}
          />
          {step === 0 && (
            <>
              <Field
                label="Project title"
                value={draft.title}
                onChangeText={(v) => edit("title", v)}
              />
              <Field
                label="Description"
                value={draft.description}
                onChangeText={(v) => edit("description", v)}
                multiline
              />
            </>
          )}
          {step === 1 && (
            <Field
              label="Scope"
              value={draft.scope}
              onChangeText={(v) => edit("scope", v)}
              multiline
            />
          )}
          {step === 2 && (
            <>
              <Choice
                label="Project lead"
                value={draft.lead}
                onChange={(v) => edit("lead", v)}
                options={(people.data || [])
                  .filter(
                    (p) =>
                      p.org_id === orgId &&
                      p.is_active !== false &&
                      [
                        "head",
                        "member",
                        "accounting_staff",
                        "assistant_head",
                      ].includes(p.role),
                  )
                  .map((p) => ({ value: p.id, label: p.full_name }))}
              />
              {!!people.error && (
                <ErrorState
                  error={people.error}
                  retry={() => void people.refresh()}
                />
              )}
              <DateField
                label="Start date"
                value={draft.start}
                onChange={(v) => edit("start", v)}
              />
              <DateField
                label="Target date"
                value={draft.end}
                onChange={(v) => edit("end", v)}
              />
            </>
          )}
          {step === 3 && (
            <>
              <Notice>
                Authorized project funding: ₱
                {(snapshot?.total || 0).toLocaleString()}
              </Notice>
              <Toggle
                label="No funding required"
                value={draft.noFunding && !snapshot?.total}
                disabled={!!snapshot?.total || locked}
                onChange={(v) => edit("noFunding", v)}
              />
              {!draft.noFunding &&
                sources.length > 0 &&
                snapshot?.canAuthorize && (
                  <>
                    {rows.map((row, i) => (
                      <Row key={i}>
                        <Choice
                          label={"Funding account " + (i + 1)}
                          value={row.partitionId}
                          onChange={(v) => {
                            if (!locked) changeRow(i, { partitionId: v });
                          }}
                          options={sources
                            .filter(
                              (s) =>
                                s.id === row.partitionId ||
                                !rows.some((r) => r.partitionId === s.id),
                            )
                            .map((s) => ({
                              value: s.id,
                              label:
                                "FY " +
                                s.year +
                                " · " +
                                s.name +
                                " · ₱" +
                                s.available.toLocaleString() +
                                " available",
                            }))}
                        />
                        <Field
                          label="Amount"
                          keyboardType="decimal-pad"
                          value={row.amount}
                          editable={!locked}
                          onChangeText={(v) => changeRow(i, { amount: v })}
                        />
                        {!locked && (
                          <Button
                            variant="ghost"
                            onPress={() =>
                              setRows((old) =>
                                old.length === 1
                                  ? [{ partitionId: "", amount: "" }]
                                  : old.filter((_, j) => i !== j),
                              )
                            }
                          >
                            Clear line
                          </Button>
                        )}
                      </Row>
                    ))}
                    {!locked && rows.length < sources.length && (
                      <Button
                        variant="outline"
                        onPress={() =>
                          setRows((old) => [
                            ...old,
                            { partitionId: "", amount: "" },
                          ])
                        }
                      >
                        Add funding account
                      </Button>
                    )}
                    <Field
                      label="Funding reason"
                      value={reason}
                      editable={!locked}
                      onChangeText={setReason}
                    />
                    <Button busy={action.busy} onPress={() => void authorize()}>
                      {locked ? "Retry funding" : "Authorize funding"}
                    </Button>
                  </>
                )}
            </>
          )}
          {step === 4 && (
            <Notice>
              {draft.title || "Untitled"} · {draft.start || "No start date"} to{" "}
              {draft.end || "No target date"}. Setup must pass before you add
              work or people.
            </Notice>
          )}
        </>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
