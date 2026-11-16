// Isolated PostgreSQL only. No network client, connection string or hosted writes.
// Executes captured real RPC/guard bodies with synthetic identity/scope helpers.
// This proves the reviewed predicate correction, not staging/device/RLS acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

if (!process.env.EFLOW_WEB_SOURCE) throw new Error('Set EFLOW_WEB_SOURCE to the reviewed Web checkout for its installed PGlite dependency. No packages are installed.');
const require = createRequire(path.join(path.resolve(process.env.EFLOW_WEB_SOURCE),'package.json'));
const {PGlite}=require('@electric-sql/pglite');
const folder=new URL('../docs/mobile-redesign/backend-review/subtask-parity/',import.meta.url);
const baseline=JSON.parse(fs.readFileSync(new URL('baseline-functions.json',folder),'utf8'));
const migration=fs.readFileSync(new URL('20261115000000_office_subtask_explicit_completion_parity.sql',folder),'utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const R=id(1),L=id(2),X=id(3),project=id(4),office=id(5);
let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const db=new PGlite();
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const actor=async who=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[who||'']);await db.exec('set role authenticated');};
const start=(root,node)=>db.query('select public.m7_start_subtask($1,$2)',[root,node]);
const complete=(node,key)=>db.query('select eflow_r7.complete_subitem($1,$2::jsonb)',[node,JSON.stringify({id:key,note:'Synthetic review fixture',attachments:[]})]);
const deny=async(operation,pattern)=>{await assert.rejects(operation,pattern);checks++;};
try {
 await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create schema auth; create schema eflow_r3; create schema eflow_r7; create schema eflow_m7; create schema eflow_publication; create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.profiles(id uuid primary key,full_name text,is_active boolean default true);
 create table public.projects(id uuid primary key,status text);
 create table public.tasks(id uuid primary key,assigned_to uuid,org_id uuid,linked_project_id uuid,status text,deleted_at timestamptz,title text);
 create table public.personal_tasks(id uuid primary key,project_id uuid);
 create table public.personal_projects(id uuid primary key,status text);
 create table public.personal_subtasks(id uuid primary key,task_id uuid,start_date date,started_at timestamptz,status text);
 create table public.subtasks(id uuid primary key,task_id uuid,parent_subtask_id uuid,lead_id uuid,title text,
  assigned_to_ids uuid[] default '{}',sibling_order int,position int default 0,depth int default 1,
  due_date date default '2026-11-20',start_date date default '2026-11-15',started_at timestamptz,
  is_standalone boolean default false,status text default 'todo',percent_complete int default 0,
  dependency_ids uuid[],is_completed boolean default false,completed_by uuid,completed_at timestamptz,
  reviewer_id uuid,latest_submission_id uuid,custom_status_id uuid,created_at timestamptz default now());
 create view eflow_r7.nodes as select id,task_id,parent_subtask_id,lead_id,title,assigned_to_ids,sibling_order,
  due_date,is_standalone,status,percent_complete,created_at,'office'::text kind from public.subtasks;
 create table eflow_r7.receipts(actor_id uuid,request_id uuid,root_id uuid,payload jsonb,result jsonb,unique(actor_id,request_id));
 create table eflow_r7.mutations(tx bigint,actor uuid,root_id uuid);
 create table eflow_m7.activation(tx bigint,root uuid);
 create table eflow_m7.work_proposals(id uuid primary key,root_id uuid,node_id uuid,author_id uuid,reviewer_id uuid,
  kind text,submitted_as_lead boolean,state text,terms jsonb,baseline jsonb,decision_request uuid,
  decision_note text,decided_at timestamptz,submitted_at timestamptz default now());
 create table eflow_m7.applying_work_proposal(tx bigint,proposal_id uuid);
 create table public.subtask_progress_updates(id uuid default gen_random_uuid(),subtask_id uuid,task_id uuid,
  author_id uuid,author_name text,percent_complete int,blocker_category text,note text,attachment_path text,attachment_name text);
 create table public.task_activities(task_id uuid,type text,content text,actor_id uuid,actor_name text);
 create table public.audit_events(actor_id uuid,actor_name text,entity_type text,entity_id text,action text,before_data jsonb,after_data jsonb,org_id uuid);
 create table public.notifications(user_id uuid,type text,title text,message text,task_id uuid,actor_id uuid,work_node_id uuid,entity_type text,project_id uuid);
 create table public.subtask_submissions(subtask_id uuid);
 create table public.work_budget_allocations(subtask_id uuid);
 create table public.petty_cash_requests(subtask_id uuid);
 create table public.budget_ledger_entries(subtask_id uuid);
 create table storage.objects(bucket_id text,name text,owner_id text);
 insert into public.profiles values('${R}','Synthetic Task Lead',true),('${L}','Synthetic Subtask Lead',true),('${X}','Synthetic outsider',true);
 insert into public.projects values('${project}','active');
 -- These scope/identity functions are explicit local test doubles, not captured RLS.
 create function eflow_r3.eligible(uuid) returns boolean language sql stable as $$select exists(select 1 from public.profiles where id=$1 and is_active)$$;
 create function eflow_r3.actor() returns uuid language plpgsql as $$begin if not coalesce(eflow_r3.eligible(auth.uid()),false) then raise exception 'Current actor required' using errcode='42501';end if;return auth.uid();end$$;
 create function eflow_r7.read_root(uuid) returns boolean language sql stable as $$select auth.uid() in ('${R}'::uuid,'${L}'::uuid) and exists(select 1 from public.tasks where id=$1)$$;
 create function eflow_r7.root(uuid) returns jsonb language sql stable as $$select jsonb_build_object('id',id,'kind','office','project',linked_project_id,'office',org_id,'lead',assigned_to,'status',status,'open',status in ('todo','in_progress','changes_requested')) from public.tasks where id=$1$$;
 create function eflow_r7.lock_impact(uuid) returns void language sql as $$select pg_advisory_xact_lock(hashtextextended($1::text,0))$$;
 create function eflow_r7.lock_completion(uuid) returns void language sql as $$select pg_advisory_xact_lock(hashtextextended($1::text,1))$$;
 create function eflow_r7.manage(uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.tasks t where t.id=$1 and t.assigned_to=auth.uid()) or exists(select 1 from public.subtasks s where s.task_id=$1 and s.id=$2 and s.lead_id=auth.uid())$$;
 create function eflow_r7.head(uuid) returns boolean language sql stable as $$select false$$;
 create function eflow_r7.node_work(uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.subtasks where id=$1 and ($2=lead_id or $2=any(assigned_to_ids)))$$;
 create function eflow_r7.operation_impact(uuid,text,jsonb) returns jsonb language sql stable as $$select '{"allowed":false}'::jsonb$$;
 create function eflow_publication.planning_lead(uuid,uuid) returns boolean language sql stable as $$select false$$;
 create function eflow_publication.manage_plan(uuid,uuid,boolean default false) returns boolean language sql stable as $$select eflow_r7.manage($1,$2)$$;
 create function eflow_publication.root_contributor_change_locked(uuid) returns boolean language sql stable as $$select true$$;
 create function eflow_r7.internal(uuid) returns boolean language sql stable as $$select current_setting('fixture.internal',true)='on'$$;
 create function eflow_r7.subtask_dependency_scope(uuid) returns boolean language sql stable as $$select exists(select 1 from public.tasks where id=$1 and assigned_to=auth.uid())$$;
 create function eflow_m7.work_day(uuid) returns date language sql stable as $$select date '2026-11-15'$$;
 create function eflow_m7.personal_node_activated(uuid,uuid) returns boolean language sql stable as $$select false$$;
 create function eflow_m7.node_visible(uuid,uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.subtasks where task_id=$1 and id=$2) and $3 in ('${R}'::uuid,'${L}'::uuid)$$;
 create function eflow_r7.require_completed_descendants(uuid,uuid) returns void language plpgsql as $$begin
  if exists(with recursive below as(select id,status from public.subtasks where task_id=$1 and parent_subtask_id=$2 union all select c.id,c.status from public.subtasks c join below b on c.parent_subtask_id=b.id where c.task_id=$1) select 1 from below where status<>'completed') then raise exception 'Complete child steps first' using errcode='22023';end if;end$$;
 create function eflow_m7.work_reviewer(uuid,uuid,uuid,text) returns uuid language sql stable as $$select assigned_to from public.tasks where id=$1 and assigned_to<>$3$$;
 create function eflow_m7.work_scope_open(uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.tasks t join public.subtasks s on s.task_id=t.id where t.id=$1 and s.id=$2 and t.status='in_progress' and s.status<>'completed' and s.started_at is not null)$$;
 create function eflow_m7.is_subtask_lead(uuid,uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from public.subtasks where task_id=$1 and id=$2 and lead_id=$3)$$;
 create function eflow_m7.work_baseline(uuid,uuid) returns jsonb language sql stable as $$select jsonb_build_object('node',to_jsonb(s),'root_status',t.status) from public.subtasks s join public.tasks t on t.id=s.task_id where t.id=$1 and s.id=$2$$;
 create function eflow_m7.check_proposal_files(jsonb,uuid,uuid,uuid,uuid) returns void language sql as $$select$$;
 create function eflow_m7.log_proposal(eflow_m7.work_proposals,text) returns void language sql as $$select$$;
 `);
 const scenarios=[];
 async function fixture({dependencies=[],earlier='todo',selected='completed',lead=R,status='in_progress',planned='2026-11-15',standalone=false}={}) {
  const base=100+scenarios.length*10;const root=id(base),a=id(base+1),c=id(base+2),b=id(base+3);
  const deps=dependencies===null?null:dependencies.map(x=>x==='selected'?c:x==='earlier'?a:id(9999));
  await db.query('insert into public.tasks values($1,$2,$3,$4,$5,null,$6)',[root,R,office,project,status,'Synthetic root']);
  for(const [node,order,state,completed] of [[a,0,earlier,earlier==='completed'],[c,2,selected,selected==='completed']])
   await db.query('insert into public.subtasks(id,task_id,lead_id,title,sibling_order,status,is_completed) values($1,$2,$3,$4,$5,$6,$7)',[node,root,R,'Synthetic prerequisite',order,state,completed]);
  await db.query('insert into public.subtasks(id,task_id,lead_id,title,sibling_order,dependency_ids,start_date,is_standalone) values($1,$2,$3,$4,1,$5::uuid[],$6,$7)',[b,root,lead,'Synthetic target',deps,planned,standalone]);
  const result={root,a,b,c};scenarios.push(result);return result;
 }
 // Seed synthetic records before enabling captured guards. No real records are copied.
 const empty=await fixture();
 const satisfied=await fixture({dependencies:['selected']});
 const incomplete=await fixture({dependencies:['selected'],selected:'todo'});
 const cancelled=await fixture({dependencies:['selected'],selected:'cancelled'});
 const missing=await fixture({dependencies:['missing']});
 const legacy=await fixture({dependencies:null});
 const legacyCancelled=await fixture({dependencies:null,earlier:'cancelled'});
 const readyLegacy=await fixture({dependencies:null,earlier:'completed'});
 const wrongLead=await fixture();
 const future=await fixture({planned:'2026-11-16'});
 const missingDate=await fixture({planned:null});
 const parentTodo=await fixture({status:'todo'});
 const child=await fixture();
 await db.query('insert into public.subtasks(id,task_id,parent_subtask_id,lead_id,title,sibling_order) values($1,$2,$3,$4,$5,0)',[id(7777),child.root,child.b,R,'Historical incomplete child']);
 const standalone=await fixture({standalone:true});
 const standaloneBlocked=await fixture({standalone:true,dependencies:['selected'],selected:'todo'});
 const proposal=await fixture({lead:L});
 const evidenceCase=await fixture();
 const replacement=await fixture({dependencies:['selected'],selected:'cancelled',earlier:'completed'});
 await db.exec('set check_function_bodies=off');
 for(const f of baseline.functions)await db.exec(f.definition);
 await db.exec(`set check_function_bodies=on;
 create trigger zzzz_web_subtask_dependencies before insert or update on public.subtasks for each row execute function eflow_r7.guard_subtask_dependency_write();
 create trigger subtasks_guard_execution_dependencies before update of status,percent_complete,is_standalone on public.subtasks for each row execute function public.guard_subtask_execution_dependencies();
 grant usage on schema auth,eflow_r3,eflow_r7,eflow_m7,eflow_publication to authenticated;
 grant select on all tables in schema public,eflow_r7,eflow_m7 to authenticated;
 revoke all on function eflow_r7.complete_subitem(uuid,jsonb) from public,anon;
 grant execute on function eflow_r7.complete_subitem(uuid,jsonb) to authenticated;`);
 await actor(R);
 await start(empty.root,empty.b);
 await deny(()=>complete(empty.b,id(9000)),/Complete earlier ordered steps first/);
 const before=await value("select jsonb_build_object('owner',proowner,'acl',proacl::text,'security_definer',prosecdef,'config',proconfig,'oid',oid) from pg_proc where oid='eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure");
 const original=await value("select pg_get_functiondef('eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure)");
 const rowsBeforeMigration=await value('select jsonb_agg(to_jsonb(s) order by id) from public.subtasks s');
 check(createHash('md5').update(original).digest('hex'),'93234d1109e736688029de6eeb5e18a9');
 await db.exec('reset role');
 await db.exec(migration);
 const after=await value("select jsonb_build_object('owner',proowner,'acl',proacl::text,'security_definer',prosecdef,'config',proconfig,'oid',oid) from pg_proc where oid='eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure");
 check(after,before);
 check(await value('select jsonb_agg(to_jsonb(s) order by id) from public.subtasks s'),rowsBeforeMigration);
 const patched=await value("select pg_get_functiondef('eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure)");
 check(patched,original.replace('if not s.is_standalone and exists(select 1 from public.subtasks c where c.task_id=root_id','if s.dependency_ids is null and not s.is_standalone and exists(select 1 from public.subtasks c where c.task_id=root_id'));
 await actor(R);
 await complete(empty.b,id(9001));check(await value('select status from public.subtasks where id=$1',[empty.b]),'completed');
 await complete(empty.b,id(9001));check(await value('select count(*) from public.subtask_progress_updates where subtask_id=$1',[empty.b]),1);
 await deny(()=>db.query('select eflow_r7.complete_subitem($1,$2::jsonb)',[empty.b,JSON.stringify({id:id(9001),note:'Changed request terms',attachments:[]})]),/Completion request terms changed/);
 for(const f of [satisfied,readyLegacy,standalone]) {
  await start(f.root,f.b);await complete(f.b,id(9100+checks));check(await value('select status from public.subtasks where id=$1',[f.b]),'completed');
 }
 for(const f of [incomplete,cancelled,missing,standaloneBlocked]) {
  await deny(()=>start(f.root,f.b),/selected prerequisite/);
  await deny(()=>complete(f.b,id(9200+checks)),/appointed Task Lead|finish earlier|not started|review/);
  check(await value('select status from public.subtasks where id=$1',[f.b]),'todo');
 }
 for(const f of [legacy,legacyCancelled])await deny(()=>start(f.root,f.b),/Complete earlier subtasks/);
 await actor(L);await deny(()=>start(wrongLead.root,wrongLead.b),/appointed Subtask Lead/);
 await actor(X);await deny(()=>start(wrongLead.root,wrongLead.b),/work access/);
 await actor(R);
 await deny(()=>start(future.root,future.b),/on or after/);
 await deny(()=>start(missingDate.root,missingDate.b),/planned start date/);
 await deny(()=>start(parentTodo.root,parentTodo.b),/parent task must be in progress/);
 await start(evidenceCase.root,evidenceCase.b);
 await deny(()=>db.query('select eflow_r7.complete_subitem($1,$2::jsonb)',[evidenceCase.b,JSON.stringify({id:id(9350),note:'Evidence owner test',attachments:[{fileName:'QA.pdf',filePath:'not-this-request/QA.pdf',fileSize:1,mimeType:'application/pdf'}]})]),/attachment does not belong/);
 check(await value('select status from public.subtasks where id=$1',[evidenceCase.b]),'todo');
 await start(child.root,child.b);await deny(()=>complete(child.b,id(9300)),/finish earlier and child steps/);
 await db.exec('reset role');await db.query("update public.projects set status='on_hold' where id=$1",[project]);await actor(R);
 await deny(()=>start(wrongLead.root,wrongLead.b),/Project is on hold/);
 await db.exec('reset role');await db.query("update public.projects set status='active' where id=$1",[project]);
 await actor(L);await start(proposal.root,proposal.b);
 await deny(()=>complete(proposal.b,id(9400)),/appointed Task Lead to review/);
 await db.exec('reset role');
 await db.query(`insert into eflow_m7.work_proposals(id,root_id,node_id,author_id,reviewer_id,kind,submitted_as_lead,state,terms,baseline)
 values($1,$2,$3,$4,$5,'completion',true,'pending',$6::jsonb,eflow_m7.work_baseline($2,$3))`,[id(9401),proposal.root,proposal.b,L,R,JSON.stringify({note:'Synthetic completion'})]);
 await actor(L);await deny(()=>db.query('select eflow_m7.decide_work($1,$2,true,null)',[id(9401),id(9402)]),/Current assigned review|Independent Lead/);
 await actor(R);await db.query('select eflow_m7.decide_work($1,$2,true,null)',[id(9401),id(9402)]);
 check(await value('select status from public.subtasks where id=$1',[proposal.b]),'completed');
 check(await value('select state from eflow_m7.work_proposals where id=$1',[id(9401)]),'approved');
 await db.query('select eflow_m7.decide_work($1,$2,true,null)',[id(9401),id(9402)]);
 check(await value('select count(*) from public.subtask_progress_updates where subtask_id=$1',[proposal.b]),1);
 await db.exec('reset role');
 // Test the existing authorized-edit trigger, not a new edit API. The local
 // marker stands in for R7's private command context and is never set remotely.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[R]);
 await deny(()=>db.query('update public.subtasks set dependency_ids=$2::uuid[] where id=$1',[replacement.b,[replacement.a]]),/authorized subtask command/);
 await db.exec("select set_config('fixture.internal','on',false)");
 await db.query('update public.subtasks set dependency_ids=$2::uuid[] where id=$1',[replacement.b,[replacement.a]]);
 await db.exec("select set_config('fixture.internal','off',false)");
 await actor(R);await start(replacement.root,replacement.b);await complete(replacement.b,id(9450));
 check(await value('select status from public.subtasks where id=$1',[replacement.b]),'completed');
 await db.exec('reset role');
 await deny(()=>db.exec(migration),/differs from the reviewed baseline/);await db.exec('rollback');
 check(await value("select pg_get_functiondef('eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure)"),patched);
 await db.exec(original);
 await db.exec('alter table public.subtasks disable trigger zzzz_web_subtask_dependencies');
 await deny(()=>db.exec(migration),/UPDATE guard is not enabled/);await db.exec('rollback');
 check(await value("select pg_get_functiondef('eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure)"),original);
 await db.exec('alter table public.subtasks enable trigger zzzz_web_subtask_dependencies');
 const readiness=baseline.functions.find(f=>f.name==='subtask_dependencies_ready');
 await db.exec(readiness.definition.replace("where s.status is distinct from 'completed'","where false"));
 await deny(()=>db.exec(migration),/prerequisite differs/);await db.exec('rollback');
 check(await value("select pg_get_functiondef('eflow_r7.complete_subitem(uuid,jsonb)'::regprocedure)"),original);
 const receipt={at:new Date().toISOString(),checks,migrationSha256:createHash('sha256').update(migration).digest('hex'),scope:'Isolated PGlite PostgreSQL with captured actual RPC/guard bodies and explicitly synthetic identity/scope helpers',beforePatch:'Reproduced earlier-sibling rejection for explicit []',afterPatch:'Explicit [] and satisfied selected prerequisites allow Start and Complete; NULL retains legacy sequence',functionMetadataPreserved:true,hostedWrites:0,staging:'BLOCKED: no authorized staging target/actors',webMobileAuthenticatedParity:'BLOCKED: no approved actors/fixtures'};
 fs.writeFileSync(new URL('isolated-sql-result.json',folder),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt,null,2));
} catch(error) {
 console.error(JSON.stringify({outcome:'FAIL',message:error.message,code:error.code,where:error.where}));
 process.exitCode=1;
} finally {await db.close();}
