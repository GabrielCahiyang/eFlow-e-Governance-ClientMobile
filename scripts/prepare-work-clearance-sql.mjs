// Reproducible, offline source amendments. Never connects to a database.
import fs from "node:fs";
import crypto from "node:crypto";
const dir = new URL(
  "../docs/mobile-redesign/backend-review/work-financial-clearance/",
  import.meta.url,
);
const rows = JSON.parse(
  fs.readFileSync(new URL("installed-functions.json", dir), "utf8"),
).rows;
const normalize = (value) => value.replaceAll("\r", "");
const patches = [];
const changed = [];
function patch(schema, name, edit) {
  const row = rows.find((r) => r.schema_name === schema && r.proname === name);
  if (!row) throw new Error(`Missing captured prerequisite ${schema}.${name}`);
  const original = normalize(row.definition);
  let source = original;
  const replace = (before, after) => {
    if (
      !source.includes(before) ||
      source.indexOf(before) !== source.lastIndexOf(before)
    )
      throw new Error(
        `Expected one source anchor in ${schema}.${name}: ${before}`,
      );
    source = source.replace(before, after);
  };
  edit(replace, () => source);
  if (source === original) throw new Error(`Unchanged ${name}`);
  patches.push(source.trimEnd() + ";");
  changed.push({
    row,
    hash: crypto.createHash("md5").update(original).digest("hex"),
  });
}
patch("eflow_m7", "guard_root_start", (replace, source) => {
  const s = source();
  const from = s.indexOf("  if tg_table_name='tasks' and old.status");
  const to = s.indexOf("\n end if;\n return new;", from);
  replace(
    s.slice(from, to),
    `  if tg_table_name='tasks' and old.status in ('todo','pending_assignment') then
    perform 1 from public.tasks dependency where dependency.id=any(old.dependency_ids) order by dependency.id for share;
    if coalesce(cardinality(old.dependency_ids),0)<>(select count(*) from public.tasks dependency
      where dependency.id=any(old.dependency_ids) and dependency.status='completed' and dependency.deleted_at is null
        and dependency.linked_project_id is not distinct from old.linked_project_id) then
      raise exception 'Complete every task prerequisite before starting work' using errcode='23514';
    end if;
  end if;`,
  );
});
patch("public", "m7_start_subtask", (replace, source) => {
  const s = source();
  const from = s.indexOf(" if planned is null then");
  const to = s.indexOf(" if n.parent_subtask_id", from);
  replace(s.slice(from, to), "");
});
patch("public", "decide_task_review", (replace) => {
  replace(
    "next_status := case when p_approve then 'completed' else 'changes_requested' end;",
    "next_status := case when p_approve and eflow_work_clearance.cash_open(p_task_id,null) then 'for_review' when p_approve then 'completed' else 'changes_requested' end;",
  );
  replace(
    "percent_complete = case when p_approve then 100 else 99 end,",
    "percent_complete = case when next_status='completed' then 100 else 99 end,",
  );
  replace(
    "where id = submission.id;",
    `where id = submission.id;
  if p_approve and next_status='for_review' then
    perform eflow_work_clearance.record_acceptance(p_task_id,null,submission.id,submission.note,'[]');
  end if;`,
  );
  replace(
    "case when p_approve then 'Task approved' else 'Changes requested' end,",
    "case when next_status='completed' then 'Task approved' when p_approve then 'Work accepted — financial clearance required' else 'Changes requested' end,",
  );
  replace(
    "case when p_approve then 'completed' else 'status_change' end,",
    "case when next_status='completed' then 'completed' else 'status_change' end,",
  );
});
patch("eflow_r7", "complete_subitem", (replace) => {
  replace(
    " select full_name into name from public.profiles where id=caller;",
    ` if eflow_work_clearance.cash_open(root_id,p_subtask_id) then
   perform eflow_work_clearance.record_acceptance(root_id,p_subtask_id,v_request,note,files);
   insert into eflow_r7.receipts values(caller,v_request,root_id,terms,to_jsonb(s));
   return s;
 end if;
 select full_name into name from public.profiles where id=caller;`,
  );
});
patch("public", "m7_assigned_subtask_reviews", (replace, source) => {
  const s = source();
  const from = s.indexOf("    w.kind = 'completion'");
  const to = s.indexOf("\n  from eflow_m7.work_proposals", from);
  replace(
    s.slice(from, to),
    "    false -- Work acceptance unlocks receipts; final completion still requires settlement.",
  );
});
patch("eflow_m7", "work_scope_open", (replace) => {
  replace(" select coalesce(eflow_r7.read_root(p_root),false)",
    " select not eflow_work_clearance.accepted(p_root,p_node) and coalesce(eflow_r7.read_root(p_root),false)");
});
for (const name of ["operation_capabilities", "node_capabilities_fast"])
  patch("eflow_r7", name, (replace, source) => {
    const s = source();
    const anchor = s
      .split("\n")
      .find((line) =>
        line.includes("result := result || jsonb_build_object(action"),
      );
    replace(
      anchor,
      ` if reason is null and p_node is not null and action in ('execute','submit')
   and eflow_work_clearance.accepted(p_root,p_node) then reason:='lifecycle_blocked';end if;
${anchor}`,
    );
  });
patch("public", "submit_petty_cash_liquidation", (replace) => {
  replace(
    "  if request.status not in ('released', 'changes_requested', 'overdue_liquidation')",
    `  if not coalesce((public.receipt_submission_clearance(request.id)->>'canSubmit')::boolean,false) then
    raise exception 'The work must be accepted before financial receipts can be submitted' using errcode='42501';
  end if;
  if request.status not in ('released', 'changes_requested', 'overdue_liquidation')`,
  );
  // A stored path is not proof of an upload. Bind each required receipt to the
  // correct private bucket/request and the authenticated cash recipient.
  replace(
    "    -- Per-receipt petty cash threshold check removed.",
    `    if not exists(select 1 from storage.objects o where o.bucket_id='budget-receipts'
       and o.name=item->>'filePath' and o.owner_id=caller::text
       and o.name like request.org_id::text||'/'||request.id::text||'/%'
       and split_part(o.name,'/',3)<>'requests') then
      raise exception 'Attach an uploaded financial receipt owned by this cash recipient' using errcode='42501';
    end if;
    -- Per-receipt petty cash threshold check removed.`,
  );
});
// Strict root guard: remove the old Head-review-only exception. Acknowledgment,
// review approval and settled journals are deliberately different milestones.
patch("public", "guard_task_financial_completion", (replace, source) => {
  const s = source();
  const from = s.indexOf("declare\n");
  const to = s.indexOf("\n$function$", from);
  replace(
    s.slice(from, to),
    `begin
 if new.status='completed' and old.status is distinct from 'completed'
 and eflow_work_clearance.cash_open(new.id,null) then
   raise exception 'Settle all task and subtask cash before approving this task' using errcode='22023';
 end if;
 return new;
end;`,
  );
});
patch("eflow_budget", "pre_subtask_budget_closeout", (replace, source) => {
  const s = source();
  const from = s.indexOf("  if unallocated+returnable>0 then");
  const to = s.indexOf("\n end if;\n return result", from);
  replace(
    s.slice(from, to),
    `  -- Retain this balance against the SAME project commitment.
  -- Eligible task/subtask allocations are reclaimed by guarded completion and
  -- settlement, not released to Office Budget as a closeout prerequisite.`,
  );
});
patch("public", "project_completion_readiness_internal", (replace, source) => {
  const s = source();
  const from = s.indexOf("  select coalesce(jsonb_agg");
  const to = s.indexOf("\nend $function$", from);
  replace(s.slice(from, to), "  return result;");
});
const preflight = `-- Exact inspected function bodies: fail closed if a teammate changed any prerequisite.
do $preflight$
declare actual text;
begin
${changed
  .map(
    ({
      row,
      hash,
    }) => ` select md5(replace(pg_get_functiondef(to_regprocedure('${row.schema_name}.${row.proname}(${row.args
      .split(", ")
      .map((a) => a.trim().split(" ").slice(1).join(" "))
      .join(",")})')),chr(13),'')) into actual;
 if actual is distinct from '${hash}' then raise exception 'Prerequisite changed or missing: ${row.schema_name}.${row.proname}. Re-review against current hosted source; no changes were applied.';end if;`,
  )
  .join("\n")}
end $preflight$;
`;
const file = new URL("work-financial-clearance.sql", dir);
let sql = normalize(fs.readFileSync(file, "utf8"));
sql = sql.replace(
  /-- BEGIN GENERATED PREFLIGHT[\s\S]*?-- END GENERATED PREFLIGHT\n/,
  "",
);
sql = sql.replace(
  "begin;\n",
  "begin;\n\n-- BEGIN GENERATED PREFLIGHT\n" +
    preflight +
    "-- END GENERATED PREFLIGHT\n",
);
const marker = "-- PATCHES_INSERT_HERE";
sql = sql.replace(
  /-- BEGIN GENERATED WRITERS[\s\S]*?-- END GENERATED WRITERS/,
  marker,
);
if (!sql.includes(marker)) throw new Error("Missing writer marker");
sql = sql.replace(
  marker,
  "-- BEGIN GENERATED WRITERS\n" +
    patches.join("\n\n") +
    "\n-- END GENERATED WRITERS",
);
fs.writeFileSync(file, sql);
const delivery = new URL("../artifacts/M7/M7-Work-Financial-Clearance.sql", import.meta.url);
fs.mkdirSync(new URL(".", delivery), { recursive: true });
fs.writeFileSync(delivery, sql);
console.log(
  `Prepared standalone SQL with ${changed.length} inspected writer amendments; no network or hosted writes.`,
);
