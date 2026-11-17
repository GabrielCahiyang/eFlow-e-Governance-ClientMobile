// Disposable PostgreSQL only. Real captured writers/guards; synthetic identity,
// membership, locks and financial-read adapters. NOT hosted/RLS/native acceptance.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
if (!process.env.EFLOW_WEB_SOURCE)
  throw new Error(
    "Set EFLOW_WEB_SOURCE to the existing Web dependency checkout. No packages are installed.",
  );
const require = createRequire(
  path.join(process.env.EFLOW_WEB_SOURCE, "package.json"),
);
const { PGlite } = require("@electric-sql/pglite");
const dir = new URL(
  "../docs/mobile-redesign/backend-review/work-financial-clearance/",
  import.meta.url,
);
const catalog = JSON.parse(
  fs.readFileSync(new URL("fixture-catalog.json", dir), "utf8"),
);
const baseline = JSON.parse(
  fs.readFileSync(new URL("installed-functions.json", dir), "utf8"),
).rows;
let sql = fs.readFileSync(new URL("work-financial-clearance.sql", dir), "utf8");
if (process.argv.includes("--crlf-sql")) sql = sql.replace(/\r?\n/g, "\r\n");
const db = new PGlite();
let checks = 0;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [
  O,
  P,
  T,
  N,
  LEAD,
  SUBLEAD,
  WORKER,
  ACCOUNTANT,
  HEAD,
  ROGUE,
  SOURCE,
  ALLOC,
  LINE,
  CAP,
  REQ,
  LIQ,
] = Array.from({ length: 16 }, (_, i) => id(i + 1));
const exec = (s, args = []) => db.query(s, args);
const scalar = async (s, args = []) =>
  Object.values((await exec(s, args)).rows[0])[0];
const actor = (who) =>
  exec("select set_config('request.jwt.claim.sub',$1,false)", [who]);
const check = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const deny = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create schema eflow_r3;create schema eflow_r7;create schema eflow_m7;create schema eflow_budget;create schema eflow_finance_review;create schema eflow_project;create schema eflow_phase7;
 create domain public.ltree as text;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 `);
  for (const t of catalog.tables) {
    await db.exec(`create table ${t.schema}.${t.table}(${t.columns})`);
    if (/(^|,)id uuid/.test(t.columns))
      await db.exec(
        `alter table ${t.schema}.${t.table} alter column id set default gen_random_uuid();alter table ${t.schema}.${t.table} add primary key(id)`,
      );
  }
  await db.exec(`create view eflow_r7.nodes as select * from public.subtasks;
 create schema extensions;
 create function extensions.digest(text,text) returns bytea language sql immutable as $$select decode(md5($1),'hex')$$;
 create function public.is_office_output_reviewer(uuid,uuid) returns boolean language sql stable as $$select false$$;
 create function eflow_project.reviewer(uuid,uuid) returns uuid language sql stable as $$select reviewer_id from public.tasks where id=$1$$;
 create table eflow_project.funding(id uuid primary key,project_id uuid,commitment_id uuid,partition_id uuid,amount numeric,fiscal_year integer);
 alter table public.work_budget_allocations add check(amount>0);
 create table public.fixture_access(root_id uuid,actor_id uuid);
 create table public.fixture_permissions(actor_id uuid,permission text);
 create function public.can_see_task(uuid,uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.fixture_access where root_id=$1 and actor_id=$2)$$;
 create function eflow_r3.eligible(uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.profiles where id=$1 and is_active and role in ('member','head','accounting_staff'))$$;
 create function eflow_r3.actor() returns uuid language sql stable as $$select auth.uid()$$;
 create function eflow_r7.read_root(uuid) returns boolean language sql stable as $$select public.can_see_task($1,auth.uid())$$;
 create function eflow_r7.chain(uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.subtasks where task_id=$1 and id=$2)$$;
 create function eflow_r7.root(uuid) returns jsonb language sql stable as $$select jsonb_build_object('id',id,'project',linked_project_id,'office',org_id,'kind','office','status',status,'lead',assigned_to,'open',true) from public.tasks where id=$1$$;
 create function eflow_r7.lock_impact(uuid) returns void language plpgsql as $$begin perform pg_advisory_xact_lock(hashtext($1::text));end$$;
 create function eflow_r7.lock_completion(uuid) returns void language plpgsql as $$begin perform pg_advisory_xact_lock(hashtext($1::text));end$$;
 create function eflow_r7.require_completed_descendants(uuid,uuid) returns void language plpgsql as $$begin if exists(select 1 from public.subtasks where task_id=$1 and ($2 is null or parent_subtask_id=$2) and status<>'completed') then raise exception 'Complete descendants first';end if;end$$;
 create function eflow_r7.subtask_dependencies_ready(uuid,uuid[]) returns boolean language sql stable as $$select coalesce(cardinality($2),0)=(select count(*) from public.subtasks where task_id=$1 and id=any($2) and status='completed')$$;
 create function eflow_m7.node_activated(uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.subtasks where id=$2 and task_id=$1 and started_at is not null)$$;
 create function eflow_m7.personal_node_activated(uuid,uuid) returns boolean language sql stable as $$select true$$;
 create function eflow_m7.work_day(uuid) returns date language sql stable as $$select date '2026-11-18'$$;
 create function eflow_m7.is_subtask_lead(uuid,uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.subtasks where task_id=$1 and id=$2 and lead_id=$3)$$;
 create function public.has_permission(uuid,text) returns boolean language sql stable security definer as $$select exists(select 1 from public.fixture_permissions where actor_id=$1 and permission=$2)$$;
 create function public.is_department_accounting_staff(uuid,uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.profiles where id=$2 and org_id=$1 and role='accounting_staff' and is_active)$$;
 create function public.subtask_cap_available(uuid) returns numeric language sql stable as $$select greatest(0,a.amount-coalesce((select sum(case when r.status='settled' then r.actual_spent else r.requested_amount end) from public.petty_cash_requests r where r.allocation_id=a.id and r.status not in ('rejected','cancelled')),0)) from public.work_budget_allocations a where a.id=$1$$;
 create function eflow_budget.request_line_obligation(uuid,uuid) returns numeric language sql stable as $$select coalesce(actual_spent,0) from public.petty_cash_requests where id=$1$$;
 create function public.task_budget_line_available(uuid,uuid) returns numeric language sql stable as $$select greatest(0,l.amount-coalesce((select sum(a.amount) from public.work_budget_allocations a where a.parent_allocation_line_id=l.id and a.status in ('pending','approved')),0)-coalesce((select sum(r.actual_spent) from public.petty_cash_requests r join public.work_budget_allocations a on a.id=r.allocation_id where r.allocation_line_id=l.id and r.status='settled' and a.subtask_id is null),0)) from public.work_budget_allocation_lines l where l.id=$1$$;
 create function eflow_phase7.baseline_completion(uuid) returns jsonb language sql stable as $$select jsonb_build_object('blockers','[]'::jsonb,'canComplete',true)$$;
 create function eflow_phase7.readiness(uuid) returns jsonb language sql stable as $$select jsonb_build_object('checks','[]'::jsonb)$$;
 create table public.office_budget_sections(id uuid primary key,name text);
 `);
  // Only pre-existing writers are installed with deferred dependency validation;
  // every new function and amendment in the delivered SQL uses normal validation.
  await db.exec("set check_function_bodies=false");
  const patched = [
    "guard_root_start",
    "m7_start_subtask",
    "decide_task_review",
    "complete_subitem",
    "m7_assigned_subtask_reviews",
    "submit_petty_cash_liquidation",
    "guard_task_financial_completion",
    "pre_subtask_budget_closeout",
    "project_completion_readiness_internal",
    "operation_capabilities",
    "node_capabilities_fast",
  ];
  for (const r of baseline.filter(
    (r) =>
      patched.includes(r.proname) ||
      [
        "fingerprint",
        "scope_allowed",
        "work_scope_open",
        "work_reviewer",
      ].includes(r.proname),
  ))
    await db.exec(r.definition);
  await db.exec("set check_function_bodies=true");
  await db.exec(sql);
  checks++;
  await db.exec(
    baseline.find((r) => r.proname === "guard_financial_work_completion")
      .definition,
  );
  await db.exec(`create trigger financial_subtask before update of status on public.subtasks for each row execute function public.guard_financial_work_completion();
 create trigger financial_task before update of status on public.tasks for each row execute function public.guard_task_financial_completion();
 create trigger root_start before update of status on public.tasks for each row execute function eflow_m7.guard_root_start();
 create policy original_receipt_insert on storage.objects for insert to authenticated with check(bucket_id='budget-receipts');
 grant usage on schema public,auth,storage to authenticated;
 grant insert on storage.objects to authenticated;
 `);
  await exec(
    "insert into public.organizations(id,head_user_id,is_active)values($1,$2,true)",
    [O, HEAD],
  );
  for (const [who, role] of [
    [LEAD, "member"],
    [SUBLEAD, "member"],
    [WORKER, "member"],
    [ACCOUNTANT, "accounting_staff"],
    [HEAD, "head"],
    [ROGUE, "member"],
  ]) {
    await exec(
      "insert into public.profiles(id,full_name,role,org_id,is_active)values($1,$2,$3,$4,true)",
      [who, role, role, O],
    );
    if (who !== ROGUE)
      await exec("insert into public.fixture_access values($1,$2)", [T, who]);
  }
  await exec("insert into public.fixture_permissions values($1,$2)", [
    ACCOUNTANT,
    "accounting.settle_liquidation",
  ]);
  await exec(
    "insert into public.projects(id,org_id,status)values($1,$2,'active')",
    [P, O],
  );
  await exec(
    "insert into public.tasks(id,title,linked_project_id,org_id,assigned_to,reviewer_id,status,start_date)values($1,'Root',$2,$3,$4,$5,'todo','2027-01-01')",
    [T, P, O, LEAD, HEAD],
  );
  await exec(
    "insert into public.subtasks(id,task_id,title,lead_id,status,started_at,is_standalone,sibling_order,dependency_ids) values($1,$2,'Child',$3,'in_progress',now(),true,1,'{}')",
    [N, T, SUBLEAD],
  );
  await actor(LEAD);
  await exec("update public.tasks set status='in_progress' where id=$1", [T]);
  checks++;
  await actor(WORKER);
  await deny(
    () =>
      exec("update public.tasks set status='todo' where id=$1", [T]).then(() =>
        exec("update public.tasks set status='in_progress' where id=$1", [T]),
      ),
    /appointed Task Lead/,
  );
  await actor(LEAD);
  await exec("update public.tasks set status='in_progress' where id=$1", [T]);
  await exec(
    "insert into public.petty_cash_requests(id,task_id,subtask_id,requester_id,cash_recipient_id,org_id,status,released_amount,requested_amount,actual_spent,allocation_id,allocation_line_id)values($1,$2,$3,$4,$4,$5,'released',10000,10000,0,$6,$7)",
    [REQ, T, N, WORKER, O, CAP, LINE],
  );
  await actor(WORKER);
  check(
    (await scalar("select public.receipt_submission_clearance($1)", [REQ]))
      .canSubmit,
    false,
  );
  await db.exec("set role authenticated");
  await deny(
    () =>
      exec(
        "insert into storage.objects(bucket_id,name,owner_id)values($1,$2,$3)",
        ["budget-receipts", `${O}/${REQ}/receipt.pdf`, WORKER],
      ),
    /row-level security/,
  );
  await db.exec("reset role");
  await actor(LEAD);
  await exec(
    "select eflow_work_clearance.record_acceptance($1,$2,$3,'Work verified','[]')",
    [T, N, id(90)],
  );
  await actor(WORKER);
  check(
    (await scalar("select public.receipt_submission_clearance($1)", [REQ]))
      .canSubmit,
    true,
  );
  await db.exec("set role authenticated");
  await exec(
    "insert into storage.objects(bucket_id,name,owner_id)values($1,$2,$3)",
    ["budget-receipts", `${O}/${REQ}/receipt.pdf`, WORKER],
  );
  checks++;
  await deny(
    () =>
      scalar("select eflow_work_clearance.record_acceptance($1,$2,$3,$4,$5)", [
        T,
        N,
        id(90),
        "fake",
        "[]",
      ]),
    /permission denied/,
  );
  await db.exec("reset role");
  await actor(WORKER);
  await deny(()=>scalar('select public.submit_petty_cash_liquidation($1,100,\'Supplies\',\'[]\'::jsonb)',[REQ]),/at least one receipt/);
  await deny(()=>scalar('select public.submit_petty_cash_liquidation($1,100,\'Supplies\',$2::jsonb)',[REQ,JSON.stringify([
    {vendor:'Shop',description:'Supplies',receiptDate:'2026-11-18',amount:100,filePath:`${O}/${REQ}/not-uploaded.pdf`}
  ])]),/uploaded financial receipt/);
  await actor(ROGUE);
  await deny(
    () => scalar("select public.receipt_submission_clearance($1)", [REQ]),
    /access required/,
  );
  await actor(LEAD);
  await exec("update public.subtasks set title='Changed work' where id=$1", [
    N,
  ]);
  await actor(WORKER);
  check(
    (await scalar("select public.receipt_submission_clearance($1)", [REQ]))
      .canSubmit,
    false,
  );
  await actor(LEAD);
  await exec(
    "select eflow_work_clearance.record_acceptance($1,$2,$3,'Current work verified','[]')",
    [T, N, id(91)],
  );
  const STARTNODE=id(89);
  await exec("insert into public.subtasks(id,task_id,title,lead_id,status,is_standalone,sibling_order,dependency_ids,start_date)values($1,$2,'Future child',$3,'todo',true,2,'{}','2099-01-01')",[STARTNODE,T,SUBLEAD]);
  await actor(SUBLEAD);
  check((await scalar('select public.m7_start_subtask($1,$2)',[T,STARTNODE])).id,STARTNODE);
  await actor(LEAD);await exec('delete from public.subtasks where id=$1',[STARTNODE]);
  await exec(
    "insert into public.petty_cash_liquidations(id,request_id,version,declared_spent,returned_amount,submitted_by,submitted_at,status,refund_receipt_number,refund_date) values($1,$2,1,8500,1500,$3,now(),'pending_department_settlement','OR-42','2026-11-18')",
    [LIQ, REQ, WORKER],
  );
  await exec(
    "update public.petty_cash_requests set status='pending_department_settlement' where id=$1",
    [REQ],
  );
  await actor(ACCOUNTANT);
  check(
    (await scalar("select public.cash_return_clearance($1)", [LIQ]))
      .canAcknowledge,
    true,
  );
  await deny(
    () =>
      exec(
        "update public.petty_cash_liquidations set status='approved' where id=$1",
        [LIQ],
      ),
    /acknowledge/,
  );
  await deny(
    () =>
      scalar(
        "select public.record_cash_return($1,1,'acknowledge',1400,'OR-42',$2)",
        [LIQ, id(100)],
      ),
    /exact return/,
  );
  check(
    (
      await scalar(
        "select public.record_cash_return($1,1,'acknowledge',1500,'OR-42',$2)",
        [LIQ, id(101)],
      )
    ).received,
    true,
  );
  check(
    (
      await scalar(
        "select public.record_cash_return($1,1,'acknowledge',1500,'OR-42',$2)",
        [LIQ, id(101)],
      )
    ).approved,
    false,
  );
  await deny(
    () =>
      scalar(
        "select public.record_cash_return($1,1,'approve',1500,'approve own receipt',$2)",
        [LIQ, id(102)],
      ),
    /independent return authority/,
  );
  await actor(WORKER);
  await deny(
    () =>
      scalar(
        "select public.record_cash_return($1,1,'approve',1500,'my return',$2)",
        [LIQ, id(103)],
      ),
    /independent return authority/,
  );
  await actor(HEAD);
  check(
    (
      await scalar(
        "select public.record_cash_return($1,1,'approve',1500,'Verified return',$2)",
        [LIQ, id(104)],
      )
    ).approved,
    true,
  );
  check(
    (
      await scalar(
        "select public.record_cash_return($1,1,'approve',1500,'Verified return',$2)",
        [LIQ, id(104)],
      )
    ).approved,
    true,
  );
  await actor(ACCOUNTANT);
  await exec(
    "update public.petty_cash_liquidations set status='approved' where id=$1",
    [LIQ],
  );
  checks++;
  await actor(LEAD);
  await deny(
    () => exec("update public.tasks set status='completed' where id=$1", [T]),
    /Settle all/,
  );
  await exec(
    "insert into public.work_budget_allocations(id,task_id,subtask_id,status,amount,parent_allocation_line_id) values($1,$2,null,'approved',50000,null),($3,$2,$4,'approved',10000,$5)",
    [ALLOC, T, CAP, N, LINE],
  );
  await exec(
    "insert into public.work_budget_allocation_lines(id,allocation_id,amount,unit_cost,project_funding_id)values($1,$2,50000,50000,$3)",
    [LINE, ALLOC, SOURCE],
  );
  await exec('insert into public.budget_commitments(id,amount,status)values($1,50000,$2)',[id(112),'active']);
  await exec('insert into eflow_project.funding(id,project_id,commitment_id,amount)values($1,$2,$3,50000)',[SOURCE,P,id(112)]);
  await exec(
    "update public.petty_cash_requests set actual_spent=8500,returned_amount=1500,status='settled' where id=$1",
    [REQ],
  );
  check(
    Number(
      await scalar(
        "select amount from public.work_budget_allocations where id=$1",
        [CAP],
      ),
    ),
    8500,
  );
  check(
    Number(
      await scalar(
        "select amount from public.work_budget_allocation_lines where id=$1",
        [LINE],
      ),
    ),
    48500,
  );
  check(
    (await scalar("select public.work_financial_clearance($1,$2)", [T, N]))
      .cashOutstanding,
    false,
  );
  await actor(SUBLEAD);
  check(
    (await scalar("select public.finalize_cleared_work($1,$2)", [T, N]))
      .completed,
    true,
  );
  check(
    (await scalar("select public.finalize_cleared_work($1,$2)", [T, N]))
      .completed,
    true,
  );
  // The restoration is idempotent and a completed root retains project funds.
  check(
    Number(
      await scalar(
        "select amount from public.work_budget_allocation_lines where id=$1",
        [LINE],
      ),
    ),
    48500,
  );
  // Root review accepts the work while its own advance remains open. Real
  // captured reviewer authorization, submission, audit and notification writer.
  const ROOTREQ=id(110), SUBMISSION=id(111);
  await actor(LEAD);
  await exec("update public.tasks set status='for_review' where id=$1",[T]);
  await exec("insert into public.task_submissions(id,task_id,version,submitter_id,note,status)values($1,$2,1,$3,'Finished root work','pending')",[SUBMISSION,T,LEAD]);
  await exec("insert into public.petty_cash_requests(id,task_id,org_id,requester_id,cash_recipient_id,status,released_amount,requested_amount,allocation_id)values($1,$2,$3,$4,$4,'released',100,100,$5)",[ROOTREQ,T,O,LEAD,ALLOC]);
  await actor(HEAD);
  check((await scalar('select to_jsonb(public.decide_task_review($1,true,null,null))',[T])).status,'for_review');
  check(await scalar('select status from public.task_submissions where id=$1',[SUBMISSION]),'approved');
  await actor(LEAD);
  check((await scalar('select public.work_financial_clearance($1,null)',[T])).workAccepted,true);
  await deny(()=>scalar('select public.finalize_cleared_work($1,null)',[T]),/confirmed financial clearance/);
  await exec("update public.petty_cash_requests set status='cancelled' where id=$1",[ROOTREQ]);
  check((await scalar('select public.finalize_cleared_work($1,null)',[T])).completed,true);
  check(Number(await scalar('select amount from public.work_budget_allocation_lines where id=$1',[LINE])),8500);
  check(Number(await scalar('select amount from eflow_project.funding where id=$1',[SOURCE])),50000);
  check(Number(await scalar('select amount from public.budget_commitments where id=$1',[id(112)])),50000);
  check((await scalar('select public.project_completion_readiness_internal($1)',[P])).canComplete,true);
  // A fully unused allocation is cancelled without violating its positive
  // historical amount constraint or releasing the project's commitment.
  const T2=id(120),N2=id(121),A2=id(122),L2=id(123),C2=id(124);
  await exec('insert into public.fixture_access values($1,$2)',[T2,LEAD]);
  await exec("insert into public.tasks(id,title,linked_project_id,org_id,assigned_to,status)values($1,'Unspent task',$2,$3,$4,'in_progress')",[T2,P,O,LEAD]);
  await exec("insert into public.subtasks(id,task_id,title,lead_id,status,is_standalone)values($1,$2,'Unspent child',$3,'in_progress',true)",[N2,T2,LEAD]);
  await exec("insert into public.work_budget_allocations(id,task_id,subtask_id,amount,status,parent_allocation_line_id)values($1,$2,null,100,'approved',null),($3,$2,$4,100,'approved',$5)",[A2,T2,C2,N2,L2]);
  await exec('insert into public.work_budget_allocation_lines(id,allocation_id,amount,unit_cost,project_funding_id)values($1,$2,100,100,$3)',[L2,A2,SOURCE]);
  await exec("update public.subtasks set status='completed' where id=$1",[N2]);
  check(await scalar('select status from public.work_budget_allocations where id=$1',[C2]),'cancelled');
  check(await scalar('select status from public.work_budget_allocations where id=$1',[A2]),'cancelled');
  check(Number(await scalar('select amount from public.work_budget_allocation_lines where id=$1',[L2])),0);
  check(Number(await scalar('select amount from public.budget_commitments where id=$1',[id(112)])),50000);
  // Server prerequisite start enforcement does not depend on a client check.
  await exec("update public.tasks set status='todo',dependency_ids=$2 where id=$1",[T2,[T]]);
  await exec("update public.tasks set status='in_progress' where id=$1",[T2]);checks++;
  await exec("update public.tasks set status='todo',dependency_ids=$2 where id=$1",[T2,[id(999)]]);
  await deny(()=>exec("update public.tasks set status='in_progress' where id=$1",[T2]),/prerequisite/);
  // Removed receiver authority invalidates acknowledgment instead of granting
  // settlement from an old cached capability.
  await actor(ACCOUNTANT);
  await exec('delete from public.fixture_permissions where actor_id=$1',[ACCOUNTANT]);
  check((await scalar('select public.cash_return_clearance($1)',[LIQ])).received,false);
  await actor(HEAD);await deny(()=>scalar("select public.record_cash_return($1,1,'approve',1500,'Old receiver removed',$2)",[LIQ,id(125)]),/independent return authority/);
  // Returning one source must not release another source's allocation.
  const T3=id(130),N3=id(131),A3=id(132),LA=id(133),LB=id(134),C3=id(135);
  await actor(LEAD);
  await exec("insert into public.tasks(id,title,linked_project_id,org_id,assigned_to,status)values($1,'Two sources',$2,$3,$4,'in_progress')",[T3,P,O,LEAD]);
  await exec("insert into public.subtasks(id,task_id,title,lead_id,status,is_standalone)values($1,$2,'Source B work',$3,'in_progress',true)",[N3,T3,LEAD]);
  await exec("insert into public.work_budget_allocations(id,task_id,subtask_id,amount,status,parent_allocation_line_id)values($1,$2,null,5000,'approved',null),($3,$2,$4,2000,'approved',$5)",[A3,T3,C3,N3,LB]);
  await exec('insert into public.work_budget_allocation_lines(id,allocation_id,amount,unit_cost,project_funding_id)values($1,$2,3000,3000,$3),($4,$2,2000,2000,$5)',[LA,A3,SOURCE,LB,id(136)]);
  await exec('insert into eflow_project.funding(id,project_id,commitment_id,amount)values($1,$2,$3,2000)',[id(136),P,id(112)]);
  await exec("update public.subtasks set status='completed' where id=$1",[N3]);
  check(Number(await scalar('select amount from public.work_budget_allocation_lines where id=$1',[LA])),3000);
  check(Number(await scalar('select amount from public.work_budget_allocation_lines where id=$1',[LB])),0);
  check(Number(await scalar('select amount from public.budget_commitments where id=$1',[id(112)])),50000);
  await exec('update public.work_budget_allocation_lines set project_funding_id=null where id=$1',[LA]);
  await deny(()=>exec("update public.tasks set status='completed' where id=$1",[T3]),/original parent funding source is missing/);
  check(await scalar('select status from public.tasks where id=$1',[T3]),'in_progress');
  const O2=id(140);
  await exec('insert into public.organizations(id,head_user_id,is_active)values($1,$2,true)',[O2,ROGUE]);
  await exec("update public.profiles set role='head',org_id=$2 where id=$1",[ROGUE,O2]);
  await actor(ROGUE);await deny(()=>scalar('select public.cash_return_clearance($1)',[LIQ]),/financial record access/);
  await exec("insert into public.petty_cash_liquidations(id,request_id,version,status,returned_amount)values($1,$2,2,'pending_department_settlement',0),($3,$2,3,'pending_department_settlement',0)",[id(150),ROOTREQ,id(151)]);
  await deny(()=>exec("update public.petty_cash_liquidations set status='approved' where id=$1",[id(150)]),/receipt package changed/);
  const drift = new PGlite();
  try {
    await drift.exec("create schema eflow_m7;create function eflow_m7.guard_root_start() returns trigger language plpgsql as $$begin return new;end$$;");
    await deny(()=>drift.exec(sql),/Prerequisite changed or missing/);
    await drift.exec('rollback');
    check((await drift.query("select count(*)::integer as n from pg_namespace where nspname='eflow_work_clearance'")).rows[0].n,0);
  } finally { await drift.close(); }
  console.log(
    `PASS ${checks} local PostgreSQL assertions (${process.argv.includes("--crlf-sql") ? "CRLF" : "LF"}). Synthetic identity/scope adapters; no hosted writes.`,
  );
} catch (error) {
  console.error(error.message);
  if (error.query) console.error(error.query.slice(0, 600));
  process.exitCode = 1;
} finally {
  await db.close();
}
