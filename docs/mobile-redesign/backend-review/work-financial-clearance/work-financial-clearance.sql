-- M7: work acceptance, required receipts, independently approved cash returns,
-- and automatic restoration to the SAME project. Manual SQL Editor delivery.
-- Target: ixnfphgjyelhckjwjkdv. NOT applied by Codex.
-- Run the entire file in one transaction. A changed prerequisite aborts everything.
-- No account/role changes, historical backfill, Office release, or journal bypass.
begin;

-- BEGIN GENERATED PREFLIGHT
-- Exact inspected function bodies: fail closed if a teammate changed any prerequisite.
do $preflight$
declare actual text;
begin
 select md5(replace(pg_get_functiondef(to_regprocedure('eflow_m7.guard_root_start()')),chr(13),'')) into actual;
 if actual is distinct from '0c1d49011cf1002120f63b95469820ce' then raise exception 'Prerequisite changed or missing: eflow_m7.guard_root_start. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('public.m7_start_subtask(uuid,uuid)')),chr(13),'')) into actual;
 if actual is distinct from '5a661e063cb901555f91b64432320e24' then raise exception 'Prerequisite changed or missing: public.m7_start_subtask. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('public.decide_task_review(uuid,boolean,text,text)')),chr(13),'')) into actual;
 if actual is distinct from '0319a4f9e584b1178cafedbd01da9be6' then raise exception 'Prerequisite changed or missing: public.decide_task_review. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('eflow_r7.complete_subitem(uuid,jsonb)')),chr(13),'')) into actual;
 if actual is distinct from '470f2c21e617216d82855666b3b38f4d' then raise exception 'Prerequisite changed or missing: eflow_r7.complete_subitem. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('public.m7_assigned_subtask_reviews()')),chr(13),'')) into actual;
 if actual is distinct from '171f3991f0b087245329efb8c55e46dc' then raise exception 'Prerequisite changed or missing: public.m7_assigned_subtask_reviews. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('eflow_m7.work_scope_open(uuid,uuid)')),chr(13),'')) into actual;
 if actual is distinct from '10240abde79080108cf0354706f59aec' then raise exception 'Prerequisite changed or missing: eflow_m7.work_scope_open. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('eflow_r7.operation_capabilities(uuid,uuid)')),chr(13),'')) into actual;
 if actual is distinct from 'c7461a53c7f88b38576684ddad4174c7' then raise exception 'Prerequisite changed or missing: eflow_r7.operation_capabilities. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('eflow_r7.node_capabilities_fast(uuid,uuid,jsonb,boolean,boolean,boolean,boolean,boolean,boolean,uuid[],text,boolean)')),chr(13),'')) into actual;
 if actual is distinct from 'de55f05553ff40ce0682d38f2b81922f' then raise exception 'Prerequisite changed or missing: eflow_r7.node_capabilities_fast. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('public.submit_petty_cash_liquidation(uuid,numeric,text,jsonb)')),chr(13),'')) into actual;
 if actual is distinct from '757b32cb2085ba12330391d0b831947b' then raise exception 'Prerequisite changed or missing: public.submit_petty_cash_liquidation. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('public.guard_task_financial_completion()')),chr(13),'')) into actual;
 if actual is distinct from '36241e57011bf950a5b8f03205ab207f' then raise exception 'Prerequisite changed or missing: public.guard_task_financial_completion. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('eflow_budget.pre_subtask_budget_closeout(uuid)')),chr(13),'')) into actual;
 if actual is distinct from '791718a10e2d50d7e08b56c64d9ed423' then raise exception 'Prerequisite changed or missing: eflow_budget.pre_subtask_budget_closeout. Re-review against current hosted source; no changes were applied.';end if;
 select md5(replace(pg_get_functiondef(to_regprocedure('public.project_completion_readiness_internal(uuid)')),chr(13),'')) into actual;
 if actual is distinct from '487e07a54f908cacc7a0ff9abd40ab64' then raise exception 'Prerequisite changed or missing: public.project_completion_readiness_internal. Re-review against current hosted source; no changes were applied.';end if;
end $preflight$;
-- END GENERATED PREFLIGHT














create schema eflow_work_clearance;
revoke all on schema eflow_work_clearance from public, anon, authenticated;

create table eflow_work_clearance.acceptances (
  entity_id uuid primary key,
  root_id uuid not null references public.tasks(id),
  node_id uuid references public.subtasks(id),
  source_id uuid not null,
  accepted_by uuid not null references public.profiles(id),
  accepted_at timestamptz not null default now(),
  fingerprint text not null,
  note text not null,
  attachments jsonb not null default '[]',
  check (entity_id = coalesce(node_id,root_id))
);
alter table eflow_work_clearance.acceptances enable row level security;
create table eflow_work_clearance.return_decisions (
  liquidation_id uuid primary key references public.petty_cash_liquidations(id),
  version integer not null,
  fingerprint text not null,
  amount numeric(16,2) not null check (amount > 0),
  received_by uuid not null references public.profiles(id),
  received_at timestamptz not null default now(),
  receive_reference text not null,
  receive_command uuid not null unique,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  approval_note text,
  approve_command uuid unique
);
alter table eflow_work_clearance.return_decisions enable row level security;
create table eflow_work_clearance.return_commands (
 command_id uuid primary key, actor_id uuid not null references public.profiles(id),
 liquidation_id uuid not null references public.petty_cash_liquidations(id),
 terms jsonb not null, recorded_at timestamptz not null default now()
);
alter table eflow_work_clearance.return_commands enable row level security;

-- Fingerprints deliberately exclude finance/rollup timestamps, but bind the work,
-- appointments, membership list, scope, schedule and prerequisite identities.
create function eflow_work_clearance.stamp(p_root uuid,p_node uuid)
returns text language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object('task',jsonb_build_object(
   'id',t.id,'title',t.title,'description',t.description,'lead',t.assigned_to,
   'people',t.team_member_ids,'office',t.org_id,'project',t.linked_project_id,
   'reviewer',t.reviewer_id,'backup',t.backup_reviewer_id,'dependencies',t.dependency_ids,
   'projectLead',(select p.project_lead_id from public.projects p where p.id=t.linked_project_id),
   'officeHead',(select o.head_user_id from public.organizations o where o.id=t.org_id),
   'start',t.start_date,'due',t.due_date),
   'node',case when p_node is null then null else to_jsonb(n)-array[
     'updated_at','last_activity_at','completed_at','completed_by','reviewer_id',
     'latest_submission_id','is_completed','percent_complete','status'] end)::text)
 from public.tasks t left join public.subtasks n on n.task_id=t.id and n.id=p_node
 where t.id=p_root and t.deleted_at is null and (p_node is null or n.id is not null)
$$;
create function eflow_work_clearance.accepted(p_root uuid,p_node uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from eflow_work_clearance.acceptances a
 join public.tasks t on t.id=a.root_id
 join public.profiles actor on actor.id=a.accepted_by and actor.is_active
 where a.entity_id=coalesce(p_node,p_root) and a.root_id=p_root
 and a.node_id is not distinct from p_node
 and a.fingerprint=eflow_work_clearance.stamp(p_root,p_node)
 and case when p_node is null then exists(select 1 from public.task_submissions s
   where s.id=a.source_id and s.task_id=t.id and s.status='approved'
     and s.decided_by=a.accepted_by and s.submitter_id is distinct from a.accepted_by
     and not exists(select 1 from public.task_submissions newer where newer.task_id=t.id and newer.version>s.version)
     and a.accepted_by in (t.reviewer_id,t.backup_reviewer_id))
   else a.accepted_by=t.assigned_to end)
$$;
create function eflow_work_clearance.cash_open(p_root uuid,p_node uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.petty_cash_requests r where r.task_id=p_root
 and (p_node is null or r.subtask_id=p_node) and r.status not in ('settled','rejected','cancelled'))
$$;
create function eflow_work_clearance.record_acceptance(p_root uuid,p_node uuid,p_source uuid,p_note text,p_files jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into eflow_work_clearance.acceptances(entity_id,root_id,node_id,source_id,accepted_by,fingerprint,note,attachments)
 values(coalesce(p_node,p_root),p_root,p_node,p_source,auth.uid(),eflow_work_clearance.stamp(p_root,p_node),coalesce(p_note,''),coalesce(p_files,'[]'))
 on conflict(entity_id) do update set source_id=excluded.source_id,accepted_by=excluded.accepted_by,
   accepted_at=now(),fingerprint=excluded.fingerprint,note=excluded.note,attachments=excluded.attachments;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,org_id,after_data)
 select auth.uid(),case when p_node is null then 'task' else 'subtask' end,coalesce(p_node,p_root)::text,
 'work.accepted_awaiting_financial_clearance',t.org_id,jsonb_build_object('rootId',p_root,'sourceId',p_source)
 from public.tasks t where t.id=p_root;
 update public.tasks set last_activity_at=now() where id=p_root;
 insert into public.notifications(user_id,type,title,message,task_id,actor_id)
 select distinct r.cash_recipient_id,'status_change','Work accepted — receipts available',
 'Submit the required receipts and any unused cash return from Funding activity.',p_root,auth.uid()
 from public.petty_cash_requests r where r.task_id=p_root and r.subtask_id is not distinct from p_node
 and r.status not in ('settled','rejected','cancelled') and r.cash_recipient_id is distinct from auth.uid();
end $$;

-- Read contract is actor-scoped; a missing/uninstalled contract never grants authority.
create function public.work_financial_clearance(p_root uuid,p_node uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tasks; n public.subtasks; a boolean; pending boolean; done boolean; can_finish boolean;
begin
 if auth.uid() is null or not coalesce(eflow_r3.eligible(auth.uid()),false)
 or not coalesce(public.can_see_task(p_root,auth.uid()),false) then
   raise exception 'Current work access required' using errcode='42501'; end if;
 select * into t from public.tasks where id=p_root and deleted_at is null;
 if p_node is not null then
   if not coalesce(eflow_r7.read_root(p_root),false) then raise exception 'Current branch access required' using errcode='42501';end if;
   select * into n from public.subtasks where id=p_node and task_id=p_root;
   if n.id is null or not eflow_r7.chain(p_root,p_node) then raise exception 'Current branch access required' using errcode='42501';end if;
 end if;
 a:=eflow_work_clearance.accepted(p_root,p_node);
 pending:=eflow_work_clearance.cash_open(p_root,p_node);
 done:=case when p_node is null then t.status='completed' else n.status='completed' end;
 can_finish:=a and not pending and not done and t.archived_at is null
   and exists(select 1 from public.projects p where p.id=t.linked_project_id and p.status='active')
   and (auth.uid()=t.assigned_to or p_node is not null and auth.uid()=n.lead_id);
 if can_finish then
   begin
     perform eflow_r7.require_completed_descendants(p_root,coalesce(p_node,p_root));
   exception when check_violation then can_finish:=false;end;
   if p_node is null then
     can_finish:=can_finish and coalesce(cardinality(t.dependency_ids),0)=(select count(*) from public.tasks dependency
       where dependency.id=any(t.dependency_ids) and dependency.status='completed' and dependency.deleted_at is null
       and dependency.linked_project_id is not distinct from t.linked_project_id);
   else
     can_finish:=can_finish and eflow_r7.subtask_dependencies_ready(p_root,n.dependency_ids)
       and not (n.dependency_ids is null and not n.is_standalone and exists(select 1 from public.subtasks earlier
       where earlier.task_id=p_root and earlier.parent_subtask_id is not distinct from n.parent_subtask_id
       and earlier.sibling_order<n.sibling_order and not earlier.is_standalone and earlier.status<>'completed'));
   end if;
 end if;
 return jsonb_build_object('version',1,'rootId',p_root,'nodeId',p_node,'workAccepted',a,
   'cashOutstanding',pending,'completed',done,'canFinalize',coalesce(can_finish,false));
end $$;

create function public.receipt_submission_clearance(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.petty_cash_requests; accepted boolean;
begin
 select * into r from public.petty_cash_requests where id=p_request;
 if auth.uid() is null or r.id is null or not coalesce(eflow_r3.eligible(auth.uid()),false)
 or not coalesce(public.can_see_task(r.task_id,auth.uid()),false)
 or auth.uid() is distinct from r.cash_recipient_id then raise exception 'Current cash recipient access required' using errcode='42501';end if;
 accepted:=eflow_work_clearance.accepted(r.task_id,r.subtask_id)
   or case when r.subtask_id is null then exists(select 1 from public.tasks t where t.id=r.task_id and t.status='completed')
      else exists(select 1 from public.subtasks s where s.id=r.subtask_id and s.task_id=r.task_id and s.status='completed') end;
 return jsonb_build_object('version',1,'requestId',r.id,'workAccepted',accepted,
   'canSubmit',accepted and r.status in ('released','changes_requested','overdue_liquidation')
     and exists(select 1 from public.tasks t join public.projects p on p.id=t.linked_project_id
       where t.id=r.task_id and t.deleted_at is null and t.archived_at is null and p.status='active'));
end $$;

-- Only financial receipt objects are constrained; cash-request supporting files
-- retain their existing authorization policy under the /requests/ path.
create function public.can_upload_work_receipt(p_name text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r public.petty_cash_requests; pieces text[];
begin
 pieces:=string_to_array(p_name,'/');
 if auth.uid() is null or array_length(pieces,1)<3 then return false;end if;
 select * into r from public.petty_cash_requests where id=pieces[2]::uuid and org_id=pieces[1]::uuid;
 if r.id is null then return false;end if;
 return coalesce((public.receipt_submission_clearance(r.id)->>'canSubmit')::boolean,false);
exception when invalid_text_representation or insufficient_privilege then return false;
end $$;
create policy work_receipt_acceptance on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'budget-receipts' or (storage.foldername(name))[3]='requests' or public.can_upload_work_receipt(name));

create function public.cash_return_clearance(p_liquidation uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare l public.petty_cash_liquidations;r public.petty_cash_requests;d eflow_work_clearance.return_decisions; stamp text; received boolean; approved boolean; head uuid; pending boolean;
begin
 select * into l from public.petty_cash_liquidations where id=p_liquidation;
 select * into r from public.petty_cash_requests where id=l.request_id;
 if auth.uid() is null or r.id is null or not coalesce(eflow_r3.eligible(auth.uid()),false)
 or not (coalesce(eflow_finance_review.scope_allowed(r.org_id,auth.uid()),false)
   or coalesce(public.can_see_task(r.task_id,auth.uid()),false) and (auth.uid() in (r.requester_id,r.cash_recipient_id,r.task_leader_id)
     or exists(select 1 from public.tasks t where t.id=r.task_id and t.assigned_to=auth.uid())))
 then raise exception 'Current financial record access required' using errcode='42501';end if;
 stamp:=eflow_finance_review.fingerprint(l,r);
 select * into d from eflow_work_clearance.return_decisions where liquidation_id=l.id;
 received:=coalesce(d.version=l.version and d.fingerprint=stamp and d.amount=l.returned_amount
   and public.is_department_accounting_staff(r.org_id,d.received_by)
   and public.has_permission(d.received_by,'accounting.settle_liquidation'),false);
 select o.head_user_id into head from public.organizations o join public.profiles p on p.id=o.head_user_id
 where o.id=r.org_id and o.is_active and p.is_active and p.org_id=o.id and p.role='head';
 approved:=received and d.approved_by=head and d.approved_by is distinct from l.submitted_by
   and d.approved_by is distinct from r.requester_id and d.approved_by is distinct from r.cash_recipient_id;
 pending:=l.status in ('pending_leader_review','pending_department_settlement') and r.status<>'settled'
   and not exists(select 1 from public.petty_cash_liquidations newer where newer.request_id=r.id and newer.version>l.version);
 return jsonb_build_object('version',1,'liquidationId',l.id,'packageVersion',l.version,'amount',l.returned_amount,
 'received',received,'approved',coalesce(approved,false),'receivedBy',case when received then d.received_by end,
 'approvedBy',case when approved then d.approved_by end,'reference',case when received then d.receive_reference end,
 'canAcknowledge',l.returned_amount>0 and pending and not received
   and public.is_department_accounting_staff(r.org_id,auth.uid()) and public.has_permission(auth.uid(),'accounting.settle_liquidation')
   and auth.uid() is distinct from l.submitted_by and auth.uid() is distinct from r.requester_id and auth.uid() is distinct from r.cash_recipient_id,
 'canApprove',l.returned_amount>0 and pending and received and not coalesce(approved,false) and auth.uid()=head
   and auth.uid() is distinct from d.received_by and auth.uid() is distinct from l.submitted_by
   and auth.uid() is distinct from r.requester_id and auth.uid() is distinct from r.cash_recipient_id);
end $$;

create function public.record_cash_return(p_liquidation uuid,p_version integer,p_action text,p_amount numeric,p_reference text,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.petty_cash_liquidations;r public.petty_cash_requests;d eflow_work_clearance.return_decisions;context jsonb;stamp text;
 command eflow_work_clearance.return_commands;terms jsonb;
begin
 select * into l from public.petty_cash_liquidations where id=p_liquidation;
 select * into r from public.petty_cash_requests where id=l.request_id;
 perform eflow_r7.lock_impact(r.task_id);
 perform 1 from public.organizations where id=r.org_id for update;
 perform 1 from public.profiles where org_id=r.org_id order by id for share;
 select * into l from public.petty_cash_liquidations where id=p_liquidation for update;
 select * into r from public.petty_cash_requests where id=l.request_id for update;
 context:=public.cash_return_clearance(l.id);
 if p_key is null or p_version is distinct from l.version or p_amount is distinct from l.returned_amount
 or p_amount<=0 or nullif(btrim(p_reference),'') is null or length(p_reference)>2000 then
 raise exception 'Verify the exact return amount, package version and reference' using errcode='22023';end if;
 stamp:=eflow_finance_review.fingerprint(l,r);
 terms:=jsonb_build_object('liquidation',l.id,'version',p_version,'action',p_action,'amount',p_amount,'reference',btrim(p_reference),'fingerprint',stamp);
 select * into command from eflow_work_clearance.return_commands where command_id=p_key;
 if found then
   if command.actor_id is distinct from auth.uid() or command.terms is distinct from terms then
     raise exception 'Return command terms changed' using errcode='22023';end if;
   return context;
 end if;
 select * into d from eflow_work_clearance.return_decisions where liquidation_id=l.id for update;
 if p_action='acknowledge' and d.receive_command=p_key then
   if d.received_by<>auth.uid() or d.fingerprint<>stamp or d.receive_reference<>btrim(p_reference) then raise exception 'Return command terms changed' using errcode='22023';end if;
   return context;
 elsif p_action='approve' and d.approve_command=p_key then
   if d.approved_by<>auth.uid() or d.fingerprint<>stamp or d.approval_note<>btrim(p_reference) then raise exception 'Return command terms changed' using errcode='22023';end if;
   return context;
 end if;
 if p_action='acknowledge' and coalesce((context->>'canAcknowledge')::boolean,false) then
   insert into eflow_work_clearance.return_decisions(liquidation_id,version,fingerprint,amount,received_by,receive_reference,receive_command)
   values(l.id,l.version,stamp,p_amount,auth.uid(),btrim(p_reference),p_key)
   on conflict(liquidation_id) do update set version=excluded.version,fingerprint=excluded.fingerprint,amount=excluded.amount,
     received_by=excluded.received_by,received_at=now(),receive_reference=excluded.receive_reference,receive_command=excluded.receive_command,
     approved_by=null,approved_at=null,approval_note=null,approve_command=null;
 elsif p_action='approve' and coalesce((context->>'canApprove')::boolean,false) then
   update eflow_work_clearance.return_decisions set approved_by=auth.uid(),approved_at=now(),approval_note=btrim(p_reference),approve_command=p_key where liquidation_id=l.id;
 else raise exception 'Current independent return authority required' using errcode='42501';end if;
 insert into eflow_work_clearance.return_commands(command_id,actor_id,liquidation_id,terms)values(p_key,auth.uid(),l.id,terms);
 update public.petty_cash_requests set updated_at=now() where id=r.id;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,org_id,after_data)
 values(auth.uid(),'petty_cash_liquidation',l.id::text,'cash_return.'||p_action,r.org_id,
 jsonb_build_object('version',l.version,'amount',p_amount,'reference',btrim(p_reference),'commandId',p_key));
 insert into public.notifications(user_id,type,title,message,financial_record_id,financial_record_type,task_id,actor_id)
 select case when p_action='acknowledge' then o.head_user_id else r.cash_recipient_id end,'petty_cash_liquidation_decision',
 case when p_action='acknowledge' then 'Cash return received — Head approval required' else 'Cash return approved — settlement required' end,
 'Open the receipt package to review the current cash return.',l.id,'petty_cash_liquidation',r.task_id,auth.uid()
 from public.organizations o where o.id=r.org_id;
 return public.cash_return_clearance(l.id);
end $$;

-- Settlement gate runs for ALL writers, including the existing Head fallback.
-- Acknowledgment and Head approval are not themselves journal authority.
create function eflow_work_clearance.guard_settlement()
returns trigger language plpgsql security definer set search_path='' as $$
declare r public.petty_cash_requests;d eflow_work_clearance.return_decisions;head uuid;
begin
 if new.status='approved' and old.status is distinct from 'approved' and exists(
   select 1 from public.petty_cash_liquidations newer where newer.request_id=new.request_id and newer.version>new.version
 ) then raise exception 'The receipt package changed. Review the current version.' using errcode='22023';end if;
 if new.status='approved' and old.status is distinct from 'approved' and new.returned_amount>0 then
 select * into r from public.petty_cash_requests where id=new.request_id;
 perform 1 from public.organizations where id=r.org_id for update;
 perform 1 from public.profiles where org_id=r.org_id order by id for share;
 select * into d from eflow_work_clearance.return_decisions where liquidation_id=new.id;
 select o.head_user_id into head from public.organizations o join public.profiles p on p.id=o.head_user_id
 where o.id=r.org_id and o.is_active and p.is_active and p.org_id=o.id and p.role='head';
 if d.liquidation_id is null or d.version<>new.version or d.fingerprint<>eflow_finance_review.fingerprint(old,r)
 or d.amount<>new.returned_amount or head is null or d.approved_by is distinct from head
 or d.received_by in (r.requester_id,r.cash_recipient_id,new.submitted_by)
 or d.approved_by in (r.requester_id,r.cash_recipient_id,new.submitted_by,d.received_by)
 or not public.is_department_accounting_staff(r.org_id,d.received_by)
 or not public.has_permission(d.received_by,'accounting.settle_liquidation') then
 raise exception 'Accounting must acknowledge the exact cash return and an independent Office Head must approve it before settlement' using errcode='42501';end if;
 end if;
 return new;
end $$;
create trigger work_cash_return_settlement before update of status on public.petty_cash_liquidations
 for each row execute function eflow_work_clearance.guard_settlement();

-- Atomic internal restoration. Only this migration's guarded settlement and
-- completion triggers call it; it never reduces project funding/commitments.
create function eflow_work_clearance.restore(p_root uuid,p_node uuid,p_request uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare cap public.work_budget_allocations;line public.work_budget_allocation_lines; t public.tasks;
 unused numeric; remaining numeric; allowance numeric; total numeric; allowances jsonb:='{}';funding_line record;
begin
 perform eflow_r7.lock_impact(p_root);
 select * into t from public.tasks where id=p_root;
 perform 1 from public.projects where id=t.linked_project_id for update;
 if t.id is null or eflow_work_clearance.cash_open(p_root,p_node) then return;end if;
 if not eflow_work_clearance.accepted(p_root,p_node) and not (
   case when p_node is null then t.status='completed'
   else exists(select 1 from public.subtasks s where s.id=p_node and s.task_id=p_root and s.status='completed') end
 ) then return;end if;
 for cap in select * from public.work_budget_allocations a where a.task_id=p_root and a.subtask_id is not null
 and (p_node is null or a.subtask_id=p_node) and a.status in ('pending','approved') order by a.id for update loop
   unused:=public.subtask_cap_available(cap.id);
   if unused>0 then
     if cap.parent_allocation_line_id is null then raise exception 'Unused subtask funding cannot be restored: its original parent funding source is missing' using errcode='22023';end if;
     if not exists(select 1 from public.work_budget_allocation_lines parent_line join eflow_project.funding f on f.id=parent_line.project_funding_id
       where parent_line.id=cap.parent_allocation_line_id and f.project_id=t.linked_project_id) then
       raise exception 'Unused subtask funding cannot be restored: its original parent funding source is missing' using errcode='22023',
         detail=jsonb_build_object('dependency','project_funding_binding','taskId',p_root,'allocationId',cap.id,'lineId',cap.parent_allocation_line_id)::text;
     end if;
     remaining:=cap.amount-unused;
     update public.work_budget_allocations set amount=case when remaining>0 then remaining else amount end,status=case when remaining=0 then 'cancelled' else status end,
       decision_reason='Unused funding automatically restored after financial clearance',updated_at=now() where id=cap.id;
     update public.work_budget_allocation_lines set amount=remaining,unit_cost=remaining where allocation_id=cap.id;
     allowances:=jsonb_set(allowances,array[cap.parent_allocation_line_id::text],
       to_jsonb(coalesce((allowances->>cap.parent_allocation_line_id::text)::numeric,0)+unused));
     insert into public.audit_events(actor_id,entity_type,entity_id,action,org_id,before_data,after_data)
     values(auth.uid(),'subtask',cap.subtask_id::text,'project.subtask_unused_funding_restored',t.org_id,
       jsonb_build_object('allocationId',cap.id,'amount',cap.amount),jsonb_build_object('amount',remaining,'projectId',t.linked_project_id));
   end if;
 end loop;
 -- Direct subtask advances without a protected cap restore only their own
 -- settled source balances, never a different fiscal account's availability.
 if p_node is not null and p_request is not null and exists(select 1 from public.petty_cash_requests r
   join public.work_budget_allocations a on a.id=r.allocation_id where r.id=p_request and a.subtask_id is null) then
   for funding_line in select rl.allocation_line_id,greatest(0,rl.amount-eflow_budget.request_line_obligation(p_request,rl.allocation_line_id)) as unused
     from public.petty_cash_request_lines rl where rl.request_id=p_request loop
     allowances:=jsonb_set(allowances,array[funding_line.allocation_line_id::text],
       to_jsonb(coalesce((allowances->>funding_line.allocation_line_id::text)::numeric,0)+funding_line.unused));
   end loop;
 end if;
 if p_node is null and exists(select 1 from public.work_budget_allocation_lines l join public.work_budget_allocations a on a.id=l.allocation_id
   where a.task_id=p_root and a.subtask_id is null and a.status='approved' and public.task_budget_line_available(l.id,null)>0
     and not exists(select 1 from eflow_project.funding f where f.id=l.project_funding_id and f.project_id=t.linked_project_id)) then
   raise exception 'Unused subtask funding cannot be restored: its original parent funding source is missing' using errcode='22023',
     detail=jsonb_build_object('dependency','project_funding_binding','taskId',p_root)::text;
 end if;
 for line in select l.* from public.work_budget_allocation_lines l join public.work_budget_allocations a on a.id=l.allocation_id
 where a.task_id=p_root and a.subtask_id is null and a.status='approved' and l.project_funding_id is not null order by l.id for update of l loop
   unused:=public.task_budget_line_available(line.id,null);
   allowance:=coalesce((allowances->>line.id::text)::numeric,0);
   if p_node is not null then unused:=least(unused,allowance);end if;
   if unused>0 then
     update public.work_budget_allocation_lines set amount=amount-unused,unit_cost=greatest(0,unit_cost-unused) where id=line.id;
     select coalesce(sum(amount),0) into total from public.work_budget_allocation_lines where allocation_id=line.allocation_id;
     update public.work_budget_allocations set amount=case when total>0 then total else amount end,status=case when total=0 then 'cancelled' else status end,
       decision_reason='Unused funding automatically restored to the same project',updated_at=now() where id=line.allocation_id;
     insert into public.audit_events(actor_id,entity_type,entity_id,action,org_id,before_data,after_data)
     values(auth.uid(),'task',p_root::text,'project.unused_funding_restored_automatically',t.org_id,
       jsonb_build_object('lineId',line.id,'amount',line.amount),jsonb_build_object('amount',line.amount-unused,'returned',unused,'projectId',t.linked_project_id));
   end if;
 end loop;
end $$;
create function eflow_work_clearance.after_settlement()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='settled' and old.status is distinct from 'settled' then
   perform eflow_work_clearance.restore(new.task_id,new.subtask_id,new.id);
 end if;return null;
end $$;
create trigger work_restore_after_settlement after update of status on public.petty_cash_requests
 for each row execute function eflow_work_clearance.after_settlement();
create function eflow_work_clearance.after_completion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='completed' and old.status is distinct from 'completed' then
   if tg_table_name='tasks' then perform eflow_work_clearance.restore(new.id,null);
   else perform eflow_work_clearance.restore(new.task_id,new.id);end if;
 end if;return null;
end $$;
create trigger work_restore_completed_task after update of status on public.tasks for each row execute function eflow_work_clearance.after_completion();
create trigger work_restore_completed_subtask after update of status on public.subtasks for each row execute function eflow_work_clearance.after_completion();

create function eflow_work_clearance.before_project_completion()
returns trigger language plpgsql security definer set search_path='' as $$
declare task record;
begin
 if new.status='completed' and old.status is distinct from 'completed' then
   for task in select id from public.tasks where linked_project_id=new.id and deleted_at is null and status='completed' order by id loop
     perform eflow_work_clearance.restore(task.id,null);
   end loop;
 end if;
 return new;
end $$;
create trigger a_work_restore_before_project_completion before update of status on public.projects
 for each row execute function eflow_work_clearance.before_project_completion();

create function public.finalize_cleared_work(p_root uuid,p_node uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare context jsonb;t public.tasks;s public.subtasks;flag text;
begin
 perform eflow_r7.lock_impact(p_root);perform eflow_r7.lock_completion(p_root);
 select * into t from public.tasks where id=p_root and deleted_at is null for update;
 perform 1 from public.projects where id=t.linked_project_id for update;
 if p_node is not null then select * into s from public.subtasks where id=p_node and task_id=p_root for update;end if;
 context:=public.work_financial_clearance(p_root,p_node);
 if (context->>'completed')::boolean then return context;end if;
 if not coalesce((context->>'canFinalize')::boolean,false) then raise exception 'Accepted work and confirmed financial clearance are required' using errcode='42501';end if;
 perform eflow_r7.require_completed_descendants(p_root,coalesce(p_node,p_root));
 if p_node is null then
   if exists(select 1 from public.subtasks where task_id=p_root and status<>'completed') then raise exception 'Complete all subtasks first' using errcode='22023';end if;
   perform set_config('eflow.allow_status_write','on',true);
   perform set_config('eflow.review_decision_authorized','on',true);
   update public.tasks set status='completed',percent_complete=100,last_activity_at=now() where id=p_root;
   perform set_config('eflow.allow_status_write','off',true);
   perform set_config('eflow.review_decision_authorized','off',true);
 else
   if not eflow_r7.subtask_dependencies_ready(p_root,s.dependency_ids) then raise exception 'Complete prerequisite subtasks first' using errcode='22023';end if;
   if s.dependency_ids is null and not s.is_standalone and exists(select 1 from public.subtasks earlier where earlier.task_id=p_root
     and earlier.parent_subtask_id is not distinct from s.parent_subtask_id and earlier.sibling_order<s.sibling_order
     and not earlier.is_standalone and earlier.status<>'completed') then raise exception 'Complete earlier ordered steps first' using errcode='22023';end if;
   insert into eflow_r7.mutations values(txid_current(),auth.uid(),p_root);
   flag:=coalesce(current_setting('eflow.subtask_workflow_authorized',true),'off');
   perform set_config('eflow.subtask_workflow_authorized','on',true);
   update public.subtasks set status='completed',is_completed=true,percent_complete=100,completed_by=auth.uid(),completed_at=now(),reviewer_id=null,latest_submission_id=null where id=p_node;
   perform set_config('eflow.subtask_workflow_authorized',flag,true);
   delete from eflow_r7.mutations where tx=txid_current() and actor=auth.uid() and root_id=p_root;
 end if;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,org_id,after_data)
 values(auth.uid(),case when p_node is null then 'task' else 'subtask' end,coalesce(p_node,p_root)::text,
 'work.completed_after_financial_clearance',t.org_id,jsonb_build_object('rootId',p_root,'status','completed'));
 insert into public.task_activities(task_id,type,content,actor_id,actor_name)
 select p_root,'status_change','Work completed after confirmed financial clearance.',auth.uid(),p.full_name from public.profiles p where p.id=auth.uid();
 return public.work_financial_clearance(p_root,p_node);
end $$;

-- Existing writer amendments and exact prerequisite checks are appended below.

revoke all on all tables in schema eflow_work_clearance from public,anon,authenticated;
revoke all on all functions in schema eflow_work_clearance from public,anon,authenticated;
revoke all on function public.work_financial_clearance(uuid,uuid),public.receipt_submission_clearance(uuid),
 public.cash_return_clearance(uuid),public.record_cash_return(uuid,integer,text,numeric,text,uuid),
 public.finalize_cleared_work(uuid,uuid),public.can_upload_work_receipt(text) from public,anon;
grant execute on function public.work_financial_clearance(uuid,uuid),public.receipt_submission_clearance(uuid),
 public.cash_return_clearance(uuid),public.record_cash_return(uuid,integer,text,numeric,text,uuid),
 public.finalize_cleared_work(uuid,uuid),public.can_upload_work_receipt(text) to authenticated;

-- BEGIN GENERATED WRITERS
CREATE OR REPLACE FUNCTION eflow_m7.guard_root_start()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare lead uuid; root jsonb;
begin
 if new.status='in_progress' and old.status in ('todo','pending_assignment','changes_requested') then
  if tg_table_name='tasks' then lead:=old.assigned_to; else lead:=old.lead_id; end if;
  root:=eflow_r7.root(new.id);
  if lead is null or lead is distinct from auth.uid() or not coalesce(eflow_r3.eligible(lead),false)
     or root is not null and not coalesce(eflow_r7.read_root(new.id),false) then
   raise exception 'Only the appointed Task Lead can start this task' using errcode='42501';
  end if;
  if tg_table_name='tasks' and old.status in ('todo','pending_assignment') then
    perform 1 from public.tasks dependency where dependency.id=any(old.dependency_ids) order by dependency.id for share;
    if coalesce(cardinality(old.dependency_ids),0)<>(select count(*) from public.tasks dependency
      where dependency.id=any(old.dependency_ids) and dependency.status='completed' and dependency.deleted_at is null
        and dependency.linked_project_id is not distinct from old.linked_project_id) then
      raise exception 'Complete every task prerequisite before starting work' using errcode='23514';
    end if;
  end if;
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.m7_start_subtask(p_root uuid, p_node uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=eflow_r3.actor(); r jsonb; n eflow_r7.nodes; planned date; started timestamptz;
begin
 if not eflow_r7.read_root(p_root) then raise exception 'Current work access is required' using errcode='42501'; end if;
 perform eflow_r7.lock_impact(p_root);
 r:=eflow_r7.root(p_root);
 if r->>'kind'='office' then
  perform 1 from public.tasks where id=p_root for update;
 else
  perform 1 from public.personal_tasks where id=p_root for update;
 end if;
 r:=eflow_r7.root(p_root);
 if not coalesce(eflow_r7.read_root(p_root),false) then raise exception 'Current work access is required' using errcode='42501'; end if;
 select * into n from eflow_r7.nodes where id=p_node and task_id=p_root;
 if n.id is null or n.lead_id is distinct from actor then
  raise exception 'Only the appointed Subtask Lead can start this subtask' using errcode='42501';
 end if;
 if not coalesce((r->>'open')::boolean,false) or r->>'status'<>'in_progress' then
  raise exception 'The parent task must be in progress before starting this subtask' using errcode='22023';
 end if;
 if r->>'kind'='office' then
  if not exists(select 1 from public.projects where id=(r->>'project')::uuid and status='active') then
   raise exception 'Project is on hold' using errcode='22023';
  end if;
  select start_date,started_at into planned,started from public.subtasks where id=p_node and task_id=p_root for update;
 else
  if not exists(select 1 from public.personal_projects where id=(r->>'project')::uuid and status='active') then
   raise exception 'This project is closed' using errcode='22023';
  end if;
  select start_date,started_at into planned,started from public.personal_subtasks where id=p_node and task_id=p_root for update;
 end if;
 if started is not null then return jsonb_build_object('id',p_node,'started_at',started); end if;
 if n.status <> 'todo' then
  raise exception 'Only a subtask in To do can be started.' using errcode='22023';
 end if;
 if n.parent_subtask_id is not null and not exists (
  select 1 from eflow_r7.nodes parent where parent.id=n.parent_subtask_id and parent.task_id=p_root
   and case when r->>'kind'='office' then eflow_m7.node_activated(p_root,parent.id)
            else eflow_m7.personal_node_activated(p_root,parent.id) end
 ) then raise exception 'Start the parent subtask first' using errcode='22023'; end if;
 if r->>'kind'='office' and exists(select 1 from public.subtasks s where s.id=p_node and s.dependency_ids is not null) then
   if not eflow_r7.subtask_dependencies_ready(p_root,(select s.dependency_ids from public.subtasks s where s.id=p_node)) then
    raise exception 'Complete every selected prerequisite before starting this subtask.' using errcode='23514';
   end if;
 elsif not n.is_standalone and exists(select 1 from eflow_r7.nodes s where s.task_id=p_root
  and s.parent_subtask_id is not distinct from n.parent_subtask_id and s.sibling_order<n.sibling_order
  and not s.is_standalone and s.status<>'completed') then
  raise exception 'Complete earlier subtasks before starting this subtask' using errcode='22023';
 end if;
 insert into eflow_m7.activation values(txid_current(),p_root);
 if r->>'kind'='office' then
  update public.subtasks set started_at=statement_timestamp() where id=p_node returning started_at into started;
 else
  update public.personal_subtasks set started_at=statement_timestamp() where id=p_node returning started_at into started;
 end if;
 delete from eflow_m7.activation where tx=txid_current() and root=p_root;
 return jsonb_build_object('id',p_node,'started_at',started);
end $function$;

CREATE OR REPLACE FUNCTION public.decide_task_review(p_task_id uuid, p_approve boolean, p_feedback text DEFAULT NULL::text, p_audit_hash text DEFAULT NULL::text)
 RETURNS tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

declare

  caller uuid := auth.uid();

  caller_role text;

  caller_name text;

  task_row public.tasks;

  submission public.task_submissions;

  next_status text;

  decision_hash text;

  recipient_id uuid;

  office_finalization boolean;

begin /* NW5.2 shared writer lock */ perform eflow_r7.lock_impact(p_task_id); /* NW4.2 completion serialization */ perform eflow_r7.lock_completion(p_task_id);

  if caller is null then

    raise exception 'Not authenticated' using errcode = '42501';

  end if;



  if not p_approve and coalesce(btrim(p_feedback), '') = '' then

    raise exception 'Feedback is required when requesting changes'

      using errcode = '22023';

  end if;



  select role::text, full_name

    into caller_role, caller_name

  from public.profiles

  where id = caller and is_active;



  select *

    into task_row

  from public.tasks

  where id = p_task_id

    and deleted_at is null

  for update;



  if not found then

    raise exception 'Task not found' using errcode = 'P0002';

  end if;



  if task_row.status <> 'for_review' then

    raise exception 'Task is not awaiting review' using errcode = '22023';

  end if;



  select *

    into submission

  from public.task_submissions

  where task_id = p_task_id

  order by version desc

  limit 1

  for update;



  if not found then

    raise exception 'No review submission exists' using errcode = '22023';

  end if;



  if exists(select 1 from public.projects where id=task_row.linked_project_id and project_lead_id is not null) and (caller is distinct from eflow_project.reviewer(task_row.id,submission.submitter_id) or caller=submission.submitter_id) then raise exception 'Only the current independent project reviewer may decide this task' using errcode='42501';end if;
  office_finalization := task_row.review_route_mode='organization_default'

    and task_row.reviewer_id=caller and public.is_office_output_reviewer(task_row.org_id,caller);

  if caller_role is null or caller_role='admin' then raise exception 'Operational account required' using errcode='42501'; end if;

  if submission.submitter_id = caller and not coalesce(office_finalization,false) then

    raise exception 'You cannot review your own submission' using errcode = '42501';

  end if;



  if not (

    task_row.reviewer_id = caller

    or task_row.backup_reviewer_id = caller

  ) then

    raise exception 'Only the assigned reviewer may decide this submission'

      using errcode = '42501';

  end if;



  next_status := case when p_approve and eflow_work_clearance.cash_open(p_task_id,null) then 'for_review' when p_approve then 'completed' else 'changes_requested' end;

  decision_hash := case when p_approve then encode(

    extensions.digest(

      p_task_id::text || ':' || submission.id::text || ':' || caller::text || ':' ||

      clock_timestamp()::text,

      'sha256'

    ),

    'hex'

  ) else null end;



  perform set_config('eflow.allow_status_write', 'on', true);

  perform set_config('eflow.review_decision_authorized', 'on', true);



  update public.tasks

  set

    status = next_status,

    percent_complete = case when next_status='completed' then 100 else 99 end,

    feedback = nullif(btrim(p_feedback), ''),

    rejection_note = case

      when p_approve then rejection_note

      else nullif(btrim(p_feedback), '')

    end,

    rejected_at = case when p_approve then rejected_at else now() end,

    audit_hash = coalesce(decision_hash, audit_hash),

    last_activity_at = now()

  where id = p_task_id

  returning * into task_row;



  perform set_config('eflow.review_decision_authorized', 'off', true);

  perform set_config('eflow.allow_status_write', 'off', true);



  update public.task_submissions

  set

    status = case when p_approve then 'approved' else 'changes_requested' end,

    decided_by = caller,

    decided_by_name = coalesce(caller_name, 'Reviewer'),

    decision_feedback = nullif(btrim(p_feedback), ''),

    decided_at = now()

  where id = submission.id;
  if p_approve and next_status='for_review' then
    perform eflow_work_clearance.record_acceptance(p_task_id,null,submission.id,submission.note,'[]');
  end if;



  insert into public.task_status_history (

    task_id, from_status, to_status, actor_id, actor_name, note

  ) values (

    p_task_id, 'for_review', next_status, caller,

    coalesce(caller_name, 'Reviewer'), nullif(btrim(p_feedback), '')

  );



  insert into public.task_activities (

    task_id, type, content, actor_id, actor_name

  ) values (

    p_task_id, next_status,

    coalesce(

      nullif(btrim(p_feedback), ''),

      case when p_approve then 'Review approved' else 'Changes requested' end

    ),

    caller, coalesce(caller_name, 'Reviewer')

  );



  insert into public.audit_events (

    actor_id, actor_name, entity_type, entity_id, action,

    reason, before_data, after_data, org_id

  ) values (

    caller, coalesce(caller_name, 'Reviewer'), 'task', p_task_id::text,

    'task.transition.' || next_status, nullif(btrim(p_feedback), ''),

    jsonb_build_object('status', 'for_review', 'submissionId', submission.id),

    jsonb_build_object('status', next_status, 'auditHash', decision_hash,

      'performedBy',submission.submitter_id,'finalizedBy',caller,'officeId',task_row.org_id,

      'authority',case when office_finalization then 'Office Head' else 'Assigned reviewer' end,

      'selfFinalization',submission.submitter_id=caller),

    task_row.org_id

  );



  for recipient_id in

    select distinct recipient.user_id

    from unnest(array[

      task_row.assigned_to,

      submission.submitter_id,

      task_row.recommendation_lead_id

    ]) as recipient(user_id)

    where recipient.user_id is not null

      and recipient.user_id <> caller

  loop

    insert into public.notifications (

      user_id, type, title, message, task_id, task_title,

      actor_id, actor_name, status_from, status_to, reason

    ) values (

      recipient_id,

      case when next_status='completed' then 'completed' else 'status_change' end,

      case when next_status='completed' then 'Task approved' when p_approve then 'Work accepted — financial clearance required' else 'Changes requested' end,

      case

        when p_approve then 'Your work on "' || task_row.title || '" was approved.'

        else 'Changes were requested for "' || task_row.title || '".'

      end,

      p_task_id, task_row.title, caller, coalesce(caller_name, 'Reviewer'),

      'for_review', next_status, coalesce(nullif(btrim(p_feedback), ''), '')

    );

  end loop;



  return task_row;

end;

$function$;

CREATE OR REPLACE FUNCTION eflow_r7.complete_subitem(p_subtask_id uuid, p_completion jsonb)
 RETURNS subtasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 caller uuid:=auth.uid();root_id uuid;r jsonb;s public.subtasks;t public.tasks;
 v_request uuid;previous_status text;terms jsonb;receipt eflow_r7.receipts;name text;attachment jsonb;
 files jsonb:=coalesce(p_completion->'attachments','[]'::jsonb);note text:=btrim(coalesce(p_completion->>'note',''));
 index integer:=0;previous_flag text;
begin
 perform eflow_r3.actor();
 select task_id into root_id from public.subtasks where id=p_subtask_id;
 if root_id is null then raise exception 'Subitem unavailable' using errcode='42501';end if;
 r:=eflow_r7.root(root_id);
 if r is not null and not coalesce(eflow_r7.read_root(root_id),false) then raise exception 'Current work access required' using errcode='42501';end if;
 perform eflow_r7.lock_impact(root_id);
 perform 1 from public.projects where id=(r->>'project')::uuid for update;
 perform eflow_r7.lock_completion(root_id);
 select * into t from public.tasks where id=root_id and deleted_at is null for update;
 select * into s from public.subtasks where id=p_subtask_id and task_id=root_id for update;
 if t.id is null or s.id is null then raise exception 'Subitem unavailable' using errcode='42501';end if;

 if r is not null and (not eflow_m7.node_activated(root_id,p_subtask_id) or t.assigned_to is distinct from caller
    or (s.lead_id is distinct from caller and not exists(
     select 1 from eflow_m7.applying_work_proposal a join eflow_m7.work_proposals w on w.id=a.proposal_id
     where a.tx=txid_current() and w.id=(p_completion->>'id')::uuid and w.node_id=s.id
      and w.root_id=t.id and w.reviewer_id=caller and w.submitted_as_lead and w.kind='completion'
    ))) then raise exception 'Submit this subtask for the appointed Task Lead to review' using errcode='42501'; end if;
 previous_status:=s.status;
 v_request:=(p_completion->>'id')::uuid;
 if v_request is null or jsonb_typeof(files)<>'array' or jsonb_array_length(files)>10 or length(note)>3000
 or exists(select 1 from jsonb_object_keys(p_completion) k where k not in ('id','note','attachments')) then raise exception 'Invalid completion details' using errcode='22023';end if;
 terms:=jsonb_build_object('command','complete_subitem','payload',p_completion,'subtask',p_subtask_id);
 select * into receipt from eflow_r7.receipts q where q.actor_id=caller and q.request_id=v_request;
 -- Qualify the parameter/local name to avoid receipt/request column ambiguity below.
 if found then
  if receipt.root_id<>root_id or receipt.payload<>terms then raise exception 'Completion request terms changed' using errcode='22023';end if;
  return s;
 end if;
 r:=eflow_r7.root(root_id);
 if r is not null then
  if not coalesce((eflow_r7.operation_capabilities(root_id,p_subtask_id)->'submit'->>'allowed')::boolean,false) then raise exception 'Only a current subitem lead or task lead may complete this step; finish earlier and child steps first' using errcode='42501';end if;
 elsif not coalesce(public.can_manage_subtasks(root_id,caller) or s.assigned_to=caller or s.lead_id=caller,false) then raise exception 'Current task or subitem lead required' using errcode='42501';end if;
 if t.status not in ('todo','in_progress','changes_requested') or s.status='completed' then raise exception 'This work is closed or already completed' using errcode='22023';end if;
 if s.dependency_ids is null and not s.is_standalone and exists(select 1 from public.subtasks c where c.task_id=root_id and c.parent_subtask_id is not distinct from s.parent_subtask_id and c.sibling_order<s.sibling_order and not c.is_standalone and c.status<>'completed') then raise exception 'Complete earlier ordered steps first' using errcode='22023';end if;
 perform eflow_r7.require_completed_descendants(root_id,p_subtask_id);
 for attachment in select value from jsonb_array_elements(files) loop
  if jsonb_typeof(attachment)<>'object' or coalesce(attachment->>'filePath','') not like 'subtasks/'||p_subtask_id::text||'/'||v_request::text||'/%'
   or length(coalesce(attachment->>'fileName','')) not between 1 and 255 or coalesce((attachment->>'fileSize')::bigint,0) not between 1 and 26214400
   or not exists(select 1 from storage.objects o where o.bucket_id='task-attachments' and o.name=attachment->>'filePath' and o.owner_id=caller::text)
  then raise exception 'Completion attachment does not belong to this request' using errcode='42501';end if;
 end loop;
 if eflow_work_clearance.cash_open(root_id,p_subtask_id) then
   perform eflow_work_clearance.record_acceptance(root_id,p_subtask_id,v_request,note,files);
   insert into eflow_r7.receipts values(caller,v_request,root_id,terms,to_jsonb(s));
   return s;
 end if;
 select full_name into name from public.profiles where id=caller;
 insert into eflow_r7.mutations values(txid_current(),caller,root_id);
 previous_flag:=coalesce(current_setting('eflow.subtask_workflow_authorized',true),'off');
 perform set_config('eflow.subtask_workflow_authorized','on',true);
 update public.subtasks set status='completed',is_completed=true,percent_complete=100,completed_by=caller,completed_at=now(),reviewer_id=null,latest_submission_id=null where id=p_subtask_id returning * into s;
 perform set_config('eflow.subtask_workflow_authorized',previous_flag,true);
 -- Use existing update/evidence history; no review or approval record is created.
 insert into public.subtask_progress_updates(id,subtask_id,task_id,author_id,author_name,percent_complete,blocker_category,note,attachment_path,attachment_name)
 values(v_request,s.id,root_id,caller,coalesce(name,'User'),100,'None','Completed subitem.'||case when note='' then '' else E'\n'||note end,files->0->>'filePath',files->0->>'fileName');
 for attachment in select value from jsonb_array_elements(files) loop
  if index>0 then insert into public.subtask_progress_updates(subtask_id,task_id,author_id,author_name,percent_complete,blocker_category,note,attachment_path,attachment_name)
   values(s.id,root_id,caller,coalesce(name,'User'),100,'None','Additional completion attachment',attachment->>'filePath',attachment->>'fileName');end if;
  index:=index+1;
 end loop;
 insert into public.task_activities(task_id,type,content,actor_id,actor_name) values(root_id,'subtask_completed',coalesce(name,'User')||' completed subitem "'||s.title||'"',caller,coalesce(name,'User'));
 insert into public.audit_events(actor_id,actor_name,entity_type,entity_id,action,before_data,after_data,org_id)
 values(caller,coalesce(name,'User'),'subtask',s.id::text,case when exists(select 1 from eflow_m7.applying_work_proposal where tx=txid_current() and proposal_id=v_request)
  then 'subtask.completed_after_lead_review' else 'subtask.completed_directly' end,jsonb_build_object('status',previous_status),jsonb_build_object('status','completed','request',v_request),t.org_id);
 delete from eflow_r7.mutations where tx=txid_current() and actor=caller and eflow_r7.mutations.root_id=s.task_id;
 insert into eflow_r7.receipts values(caller,v_request,root_id,terms,to_jsonb(s));
 return s;
end $function$;

CREATE OR REPLACE FUNCTION public.m7_assigned_subtask_reviews()
 RETURNS TABLE(id uuid, root_id uuid, node_id uuid, task_title text, subtask_title text, kind text, submitted_at timestamp with time zone, cash_blocked boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select w.id, w.root_id, w.node_id, t.title, s.title, w.kind, w.submitted_at,
    false -- Work acceptance unlocks receipts; final completion still requires settlement.
  from eflow_m7.work_proposals w
  join public.tasks t on t.id = w.root_id
  join public.subtasks s on s.id = w.node_id and s.task_id = t.id
  where w.state = 'pending'
    and auth.uid() is not null
    and w.author_id <> auth.uid()
    and eflow_m7.work_scope_open(w.root_id, w.node_id)
    and eflow_m7.work_reviewer(w.root_id, w.node_id, w.author_id, w.kind) = auth.uid()
    and w.submitted_as_lead = eflow_m7.is_subtask_lead(w.root_id, w.node_id, w.author_id)
  order by w.submitted_at, w.id;
$function$;

CREATE OR REPLACE FUNCTION eflow_m7.work_scope_open(p_root uuid, p_node uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select not eflow_work_clearance.accepted(p_root,p_node) and coalesce(eflow_r7.read_root(p_root),false) and coalesce(eflow_r3.eligible(auth.uid()),false)
 and (exists (
  select 1 from public.tasks t join public.projects p on p.id=t.linked_project_id
  where t.id=p_root and t.deleted_at is null and t.archived_at is null
    and t.status in ('in_progress','changes_requested') and p.status='active'
    and (p_node is null or eflow_m7.node_activated(t.id,p_node) and exists(
      select 1 from public.subtasks s where s.id=p_node and s.task_id=t.id and s.status not in ('for_review','completed')
    ))
 ) or exists(
  select 1 from public.personal_tasks t join public.personal_projects p on p.id=t.project_id
  join public.personal_subtasks s on s.task_id=t.id and s.id=p_node
  where t.id=p_root and p.status='active' and t.status='in_progress'
   and eflow_m7.personal_node_activated(t.id,s.id) and s.status not in ('for_review','completed')
 ));
$function$;

CREATE OR REPLACE FUNCTION eflow_r7.operation_capabilities(p_root uuid, p_node uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare

 r jsonb := eflow_r7.root(p_root);

 n eflow_r7.nodes;

 actions text[] := case when p_node is null then

  array['manage_contributors','appoint_lead','create_child','order_children'] else

  array['manage_contributors','appoint_lead','create_child','edit_details','move','order_children','delete','execute','submit','review'] end;

 action text;

 reason text;

 common_reason text;

 result jsonb := '{}';

 manager boolean;

 untouched boolean;

 descendants_complete boolean;

 ordered_ready boolean;

 node_depth integer;

begin

 -- Do not disclose row state through the private projector to an unavailable

 -- actor/scope. Snapshot retains its existing read exception.

 if r is null or auth.uid() is null or not coalesce(eflow_r7.read_root(p_root),false) then

  common_reason := 'access_unavailable';

 elsif not coalesce(eflow_r3.eligible(auth.uid()),false) then

  common_reason := 'read_only';

 elsif not coalesce((r->>'open')::boolean,false) then

  common_reason := 'lifecycle_blocked';

 end if;

 if p_node is not null then

  select * into n from eflow_r7.nodes where id=p_node and task_id=p_root;

  if not found then common_reason := 'access_unavailable'; end if;

 end if;

 if common_reason is null then

  manager := coalesce(eflow_r7.manage(p_root,p_node),false);

  if p_node is not null then

   with recursive below as (

    select * from eflow_r7.nodes where id=p_node and task_id=p_root

    union all select c.* from eflow_r7.nodes c join below b on c.parent_subtask_id=b.id where c.task_id=p_root

   ) select not exists(select 1 from below where status<>'todo' or percent_complete<>0),

    not exists(select 1 from below where id<>p_node and status<>'completed')

    into untouched,descendants_complete;

   with recursive above as (

    select id,parent_subtask_id,1 depth from eflow_r7.nodes where id=p_node and task_id=p_root

    union all select c.id,c.parent_subtask_id,a.depth+1 from eflow_r7.nodes c join above a on c.id=a.parent_subtask_id where c.task_id=p_root and a.depth<8

   ) select max(depth) into node_depth from above;

   ordered_ready := n.is_standalone or not exists(select 1 from eflow_r7.nodes c

    where c.task_id=p_root and c.parent_subtask_id is not distinct from n.parent_subtask_id

    and c.sibling_order<n.sibling_order and not c.is_standalone and c.status<>'completed');
   if r->>'kind'='office' and exists(
     select 1 from public.subtasks s where s.id=p_node and s.task_id=p_root and s.dependency_ids is not null
   ) then
    ordered_ready := eflow_r7.subtask_dependencies_ready(p_root,(select s.dependency_ids from public.subtasks s where s.id=p_node));
   end if;

  end if;

 end if;

 foreach action in array actions loop

  reason := common_reason;

  if reason is null then

   if p_node is not null and action in ('appoint_lead','manage_contributors')
     and eflow_publication.subtask_staffing_locked(p_root)
     and (r->>'lead')::uuid is distinct from auth.uid()
     and (action='appoint_lead' or n.lead_id is distinct from auth.uid()) then reason:='active_subtask_staffing_locked';
   elsif action='appoint_lead' then

    if not coalesce(case when p_node is null then (eflow_r7.head(p_root) or (r->>'kind'='office' and eflow_publication.planning_lead((r->>'project')::uuid,(r->>'office')::uuid)))

     else eflow_publication.manage_plan(p_root,p_node,true) end,false) then reason := 'appointment_denied';

    elsif p_node is not null and n.status='completed' then reason := 'lifecycle_blocked'; end if;

   elsif action in ('execute','submit') and r->>'kind'='office' and exists (
    select 1 from public.projects where id=(r->>'project')::uuid and status in ('planning','on_hold')
   ) then
    select case when status='on_hold' then 'project_on_hold' else 'lifecycle_blocked' end into reason
     from public.projects where id=(r->>'project')::uuid;
   elsif action in ('execute','submit') then
    if not coalesce(manager,false) and (action='submit' or not coalesce(eflow_r7.node_work(p_node,auth.uid()),false)) then reason:='branch_denied';
    elsif n.status='completed' or r->>'kind'='office' and r->>'status' not in ('todo','in_progress','changes_requested') then reason:='lifecycle_blocked';
    elsif not ordered_ready or action='submit' and not descendants_complete then reason:='lifecycle_blocked';end if;
   elsif action='review' then
    reason:='lifecycle_blocked'; -- Subitems complete directly; final task retains its review.
   elsif action = 'manage_contributors' and p_node is null and coalesce(eflow_publication.root_contributor_change_locked(p_root),false) then reason := 'active_staffing_locked'; elsif not eflow_publication.manage_plan(p_root,p_node) then reason := 'branch_denied';

   elsif action='manage_contributors' then

    if p_node is null and r->>'kind'<>'office' then reason := 'read_only';

    elsif p_node is null and r->>'lead' is null or p_node is not null and (n.lead_id is null or n.status='completed') then reason := 'lifecycle_blocked'; end if;

   elsif action='create_child' then

    if p_node is not null and (n.status<>'todo' or n.percent_complete<>0 or node_depth>=8) then reason := 'lifecycle_blocked'; end if;

   elsif action='order_children' then

    -- This is parent:p_node, including parent:null for root direct children.

    if exists(select 1 from eflow_r7.nodes c where c.task_id=p_root

     and c.parent_subtask_id is not distinct from p_node and (c.status<>'todo' or c.percent_complete<>0)) then reason := 'lifecycle_blocked'; end if;

   elsif action='edit_details' and r->>'kind'='office' then
    if not coalesce((eflow_work_edit.state(p_root,p_node)->>'details')::boolean,false) then reason:='lifecycle_blocked';end if;
   elsif action in ('edit_details','move','delete') then

    if not untouched then reason := 'lifecycle_blocked';

    elsif action='delete' and r->>'kind'='office' and exists(

     with recursive below as (select id from eflow_r7.nodes where id=p_node and task_id=p_root

      union all select c.id from eflow_r7.nodes c join below b on c.parent_subtask_id=b.id where c.task_id=p_root)

     select 1 from below b where

      exists(select 1 from public.subtask_progress_updates where subtask_id=b.id) or

      exists(select 1 from public.subtask_submissions where subtask_id=b.id) or

      exists(select 1 from public.work_budget_allocations where subtask_id=b.id) or

      exists(select 1 from public.petty_cash_requests where subtask_id=b.id) or

      exists(select 1 from public.budget_ledger_entries where subtask_id=b.id)

    ) then reason := 'history_blocked'; end if;

   end if;

  end if;

  if reason is null and p_node is not null and action in ('execute','submit') and
   not (case when r->>'kind'='office' then eflow_m7.node_activated(p_root,p_node)
             else eflow_m7.personal_node_activated(p_root,p_node) end)
  then reason := 'lifecycle_blocked'; end if;

  /* NW5.1 history capability */

  if reason is null and action in ('create_child','order_children','move','delete') then

   if not (eflow_r7.operation_impact(p_root,case action when 'create_child' then 'create' when 'order_children' then 'order' else action end,

    case when action in ('create_child','order_children') then jsonb_build_object('parent',p_node) else jsonb_build_object('id',p_node,'parent',n.parent_subtask_id) end)->>'allowed')::boolean then reason:='history_blocked';end if;

  end if;

 if reason is null and p_node is not null and action in ('execute','submit')
   and eflow_work_clearance.accepted(p_root,p_node) then reason:='lifecycle_blocked';end if;
 result := result || jsonb_build_object(action,jsonb_build_object('allowed',reason is null,'reason_code',reason));

 end loop;

 return result;

end $function$;

CREATE OR REPLACE FUNCTION eflow_r7.node_capabilities_fast(p_root uuid, p_node uuid, p_root_json jsonb, p_eligible boolean, p_head boolean, p_plan_lead boolean, p_staffing_locked boolean, p_actor_member boolean, p_root_lead_member boolean, p_dirty_ids uuid[], p_project_status text, p_invalid_tree boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  n eflow_r7.nodes;
  actions text[] := array['manage_contributors','appoint_lead','create_child','edit_details','move','order_children','delete','execute','submit','review'];
  action text;
  reason text;
  common_reason text;
  result jsonb := '{}';
  manager boolean := false;
  untouched boolean := true;
  descendants_complete boolean := true;
  ordered_ready boolean := true;
  node_depth integer := 1;
  v_subtree_ids uuid[] := '{}';
  v_child_subtree_ids uuid[] := '{}';
  v_move_ids uuid[] := '{}';
  v_kind text := p_root_json->>'kind';
  v_open boolean := coalesce((p_root_json->>'open')::boolean, false);
  v_root_lead uuid := (p_root_json->>'lead')::uuid;
  v_proj uuid := (p_root_json->>'project')::uuid;
  v_office uuid := (p_root_json->>'office')::uuid;
  v_chain_parent boolean := false;
  v_chain_self boolean := false;
  v_node_work boolean := false;
  v_manage_plan boolean := false;
  v_replace_lead_plan boolean := false;
  v_can_edit_details boolean := false;
  v_dep_ids uuid[];
  v_activated boolean := false;
begin
  if p_root_json is null or v_uid is null then
    common_reason := 'access_unavailable';
  elsif not p_eligible then
    common_reason := 'read_only';
  elsif not v_open then
    common_reason := 'lifecycle_blocked';
  end if;

  select * into n from eflow_r7.nodes where id = p_node and task_id = p_root;
  if not found then
    common_reason := 'access_unavailable';
  end if;

  if common_reason is null then
    with recursive below as (
      select * from eflow_r7.nodes where id = p_node and task_id = p_root
      union all
      select c.* from eflow_r7.nodes c join below b on c.parent_subtask_id = b.id where c.task_id = p_root
    )
    select
      coalesce(array_agg(id), '{}'),
      not exists(select 1 from below where status <> 'todo' or percent_complete <> 0),
      not exists(select 1 from below where id <> p_node and status <> 'completed')
    into v_subtree_ids, untouched, descendants_complete
    from below;

    with recursive above as (
      select id, parent_subtask_id, lead_id, 1 depth from eflow_r7.nodes where id = p_node and task_id = p_root
      union all
      select c.id, c.parent_subtask_id, c.lead_id, a.depth + 1 from eflow_r7.nodes c join above a on c.id = a.parent_subtask_id where c.task_id = p_root and a.depth < 8
    )
    select max(depth) into node_depth from above;

    v_chain_parent := eflow_r7.chain(p_root, n.parent_subtask_id);
    if n.parent_subtask_id is not null then
      v_chain_self := eflow_r7.chain(p_root, p_node);
    else
      v_chain_self := p_root_lead_member and n.lead_id is not null and eflow_r7.member(v_proj, v_office, n.lead_id);
    end if;

    if p_head then
      manager := true;
    elsif p_actor_member then
      if v_root_lead = v_uid then
        manager := true;
      elsif v_chain_self then
        manager := exists(
          with recursive anc as (
            select id, parent_subtask_id, lead_id from eflow_r7.nodes where id = p_node and task_id = p_root
            union all
            select c.id, c.parent_subtask_id, c.lead_id from eflow_r7.nodes c join anc a on c.id = a.parent_subtask_id where c.task_id = p_root
          ) select 1 from anc where lead_id = v_uid
        );
      end if;
    end if;

    v_manage_plan := manager or p_plan_lead;
    if p_head then
      v_replace_lead_plan := true;
    elsif p_plan_lead then
      v_replace_lead_plan := true;
    elsif p_actor_member then
      if v_root_lead = v_uid then
        v_replace_lead_plan := true;
      elsif n.parent_subtask_id is not null and v_chain_parent then
        v_replace_lead_plan := exists(
          with recursive anc as (
            select id, parent_subtask_id, lead_id from eflow_r7.nodes where id = n.parent_subtask_id and task_id = p_root
            union all
            select c.id, c.parent_subtask_id, c.lead_id from eflow_r7.nodes c join anc a on c.id = a.parent_subtask_id where c.task_id = p_root
          ) select 1 from anc where lead_id = v_uid
        );
      end if;
    end if;

    v_node_work := p_eligible and p_actor_member and v_chain_parent and (
      v_uid = any(coalesce(n.assigned_to_ids, '{}'::uuid[]))
      or (n.kind = 'office' and v_kind = 'office' and n.lead_id = v_uid and v_chain_self)
    );

    ordered_ready := n.is_standalone or not exists(
      select 1 from eflow_r7.nodes c
      where c.task_id = p_root and c.parent_subtask_id is not distinct from n.parent_subtask_id
        and c.sibling_order < n.sibling_order and not c.is_standalone and c.status <> 'completed'
    );
    if v_kind = 'office' then
      select s.dependency_ids,
        (p_root_json->>'status' not in ('todo', 'pending_assignment') and (s.started_at is not null or s.status in ('in_progress','stuck','changes_requested','for_review','completed')))
      into v_dep_ids, v_activated
      from public.subtasks s where s.id = p_node and s.task_id = p_root;
      if v_dep_ids is not null then
        ordered_ready := eflow_r7.subtask_dependencies_ready(p_root, v_dep_ids);
      end if;
      if n.status in ('todo', 'in_progress', 'changes_requested') then
        v_can_edit_details := v_manage_plan;
      end if;
    else
      v_activated := (p_root_json->>'status' <> 'todo') and exists(
        select 1 from public.personal_subtasks s where s.id = p_node and s.task_id = p_root
          and (s.started_at is not null or s.status in ('in_progress','changes_requested','for_review','completed'))
      );
    end if;

    with recursive child_sub as (
      select id from eflow_r7.nodes where task_id = p_root and parent_subtask_id is not distinct from p_node
      union all
      select c.id from eflow_r7.nodes c join child_sub cs on c.parent_subtask_id = cs.id where c.task_id = p_root
    ) select coalesce(array_agg(id), '{}') into v_child_subtree_ids from child_sub;

    with recursive sib_sub as (
      select id from eflow_r7.nodes where task_id = p_root and parent_subtask_id is not distinct from n.parent_subtask_id
      union all
      select c.id from eflow_r7.nodes c join sib_sub ss on c.parent_subtask_id = ss.id where c.task_id = p_root
    ) select coalesce(array_agg(id), '{}') || case when n.parent_subtask_id is not null then array[n.parent_subtask_id] else '{}'::uuid[] end into v_move_ids from sib_sub;
  end if;

  foreach action in array actions loop
    reason := common_reason;
    if reason is null then
      if action in ('appoint_lead', 'manage_contributors')
         and p_staffing_locked
         and v_root_lead is distinct from v_uid
         and (action = 'appoint_lead' or n.lead_id is distinct from v_uid) then
        reason := 'active_subtask_staffing_locked';
      elsif action = 'appoint_lead' then
        if not v_replace_lead_plan then reason := 'appointment_denied';
        elsif n.status = 'completed' then reason := 'lifecycle_blocked';
        end if;
      elsif action in ('execute', 'submit') and v_kind = 'office' and p_project_status in ('planning', 'on_hold') then
        reason := case when p_project_status = 'on_hold' then 'project_on_hold' else 'lifecycle_blocked' end;
      elsif action in ('execute', 'submit') then
        if not manager and (action = 'submit' or not v_node_work) then reason := 'branch_denied';
        elsif n.status = 'completed' or (v_kind = 'office' and p_root_json->>'status' not in ('todo', 'in_progress', 'changes_requested')) then reason := 'lifecycle_blocked';
        elsif not ordered_ready or (action = 'submit' and not descendants_complete) then reason := 'lifecycle_blocked';
        end if;
      elsif action = 'review' then
        reason := 'lifecycle_blocked';
      elsif action = 'manage_contributors' and not v_manage_plan then
        reason := 'branch_denied';
      elsif not v_manage_plan then
        reason := 'branch_denied';
      elsif action = 'manage_contributors' then
        if n.lead_id is null or n.status = 'completed' then reason := 'lifecycle_blocked'; end if;
      elsif action = 'create_child' then
        if n.status <> 'todo' or n.percent_complete <> 0 or node_depth >= 8 then reason := 'lifecycle_blocked'; end if;
      elsif action = 'order_children' then
        if exists(select 1 from eflow_r7.nodes c where c.task_id = p_root and c.parent_subtask_id is not distinct from p_node and (c.status <> 'todo' or c.percent_complete <> 0)) then
          reason := 'lifecycle_blocked';
        end if;
      elsif action = 'edit_details' and v_kind = 'office' then
        if not v_can_edit_details then reason := 'lifecycle_blocked'; end if;
      elsif action in ('edit_details', 'move', 'delete') then
        if not untouched then
          reason := 'lifecycle_blocked';
        elsif action = 'delete' and v_kind = 'office' and (v_subtree_ids && p_dirty_ids) then
          reason := 'history_blocked';
        end if;
      end if;
    end if;

    if reason is null and action in ('execute', 'submit') and not v_activated then
      reason := 'lifecycle_blocked';
    end if;

    if reason is null and action in ('create_child', 'order_children', 'move', 'delete') then
      if p_invalid_tree then
        raise exception 'Work hierarchy has a cycle, foreign parent or depth beyond 8; resolve it first' using errcode = '23514';
      end if;
      if action in ('create_child', 'delete') and (v_subtree_ids && p_dirty_ids) then
        reason := 'history_blocked';
      elsif action = 'order_children' and (v_child_subtree_ids && p_dirty_ids) then
        reason := 'history_blocked';
      elsif action = 'move' and (v_move_ids && p_dirty_ids) then
        reason := 'history_blocked';
      end if;
    end if;

 if reason is null and p_node is not null and action in ('execute','submit')
   and eflow_work_clearance.accepted(p_root,p_node) then reason:='lifecycle_blocked';end if;
    result := result || jsonb_build_object(action, jsonb_build_object('allowed', reason is null, 'reason_code', reason));
  end loop;

  return result;
end $function$;

CREATE OR REPLACE FUNCTION public.submit_petty_cash_liquidation(p_request_id uuid, p_declared_spent numeric, p_note text, p_receipts jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller uuid := auth.uid();
  request public.petty_cash_requests;
  budget public.department_fiscal_budgets;
  item jsonb;
  receipt_total numeric := 0;
  liquidation_id uuid;
  next_version int;
  liquidation_status text;
begin /* NW5.2 shared writer lock */ perform eflow_r7.lock_impact((select task_id from public.petty_cash_requests where id=p_request_id));
  select * into request from public.petty_cash_requests where id = p_request_id for update;
  if not found then raise exception 'Petty-cash request not found' using errcode = 'P0002'; end if;
  if request.requester_id <> caller and request.cash_recipient_id <> caller then raise exception 'Only the cash recipient can submit this liquidation' using errcode = '42501'; end if;
  if not coalesce((public.receipt_submission_clearance(request.id)->>'canSubmit')::boolean,false) then
    raise exception 'The work must be accepted before financial receipts can be submitted' using errcode='42501';
  end if;
  if request.status not in ('released', 'changes_requested', 'overdue_liquidation') then raise exception 'All scheduled cash must be released before liquidation' using errcode = '22023'; end if;
  if p_declared_spent < 0 or p_declared_spent > request.released_amount then raise exception 'Actual spending cannot exceed the amount released' using errcode = '22023'; end if;
  if nullif(btrim(p_note), '') is null then raise exception 'Add a liquidation note' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(p_receipts, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_receipts, '[]'::jsonb)) = 0 then raise exception 'Attach at least one receipt' using errcode = '22023'; end if;
  select * into budget from public.department_fiscal_budgets where id = request.fiscal_budget_id;
  for item in select value from jsonb_array_elements(p_receipts) loop
    if nullif(btrim(item ->> 'vendor'), '') is null or nullif(btrim(item ->> 'description'), '') is null
       or nullif(btrim(item ->> 'filePath'), '') is null or nullif(item ->> 'receiptDate', '') is null then
      raise exception 'Every receipt needs vendor, date, description, amount, and attachment' using errcode = '22023';
    end if;
    if not exists(select 1 from storage.objects o where o.bucket_id='budget-receipts'
       and o.name=item->>'filePath' and o.owner_id=caller::text
       and o.name like request.org_id::text||'/'||request.id::text||'/%'
       and split_part(o.name,'/',3)<>'requests') then
      raise exception 'Attach an uploaded financial receipt owned by this cash recipient' using errcode='42501';
    end if;
    -- Per-receipt petty cash threshold check removed.
    receipt_total := receipt_total + coalesce((item ->> 'amount')::numeric, 0);
  end loop;
  if abs(receipt_total - p_declared_spent) > 0.009 then raise exception 'Receipt amounts must equal the declared amount spent' using errcode = '22023'; end if;
  select coalesce(max(version), 0) + 1 into next_version from public.petty_cash_liquidations where request_id = request.id;
  liquidation_status := case when request.task_leader_id = caller then 'pending_department_settlement' else 'pending_leader_review' end;
  insert into public.petty_cash_liquidations(request_id, version, declared_spent, returned_amount, note, status, submitted_by)
  values (request.id, next_version, p_declared_spent, request.released_amount - p_declared_spent, btrim(p_note), liquidation_status, caller)
  returning id into liquidation_id;
  for item in select value from jsonb_array_elements(p_receipts) loop
    insert into public.petty_cash_receipts(
      liquidation_id, vendor, receipt_number, receipt_date, description, amount,
      file_name, file_path, mime_type, file_size, override_reason, created_by
    ) values (
      liquidation_id, btrim(item ->> 'vendor'), nullif(btrim(item ->> 'receiptNumber'), ''),
      (item ->> 'receiptDate')::date, btrim(item ->> 'description'), (item ->> 'amount')::numeric,
      item ->> 'fileName', item ->> 'filePath', coalesce(nullif(item ->> 'mimeType', ''), 'application/octet-stream'),
      coalesce((item ->> 'fileSize')::bigint, 0), nullif(btrim(item ->> 'overrideReason'), ''), caller
    );
  end loop;
  update public.petty_cash_requests set status = case when liquidation_status = 'pending_leader_review' then 'pending_leader_liquidation_review' else 'pending_department_settlement' end, updated_at = now() where id = request.id;
  if liquidation_status = 'pending_leader_review' then
    insert into public.notifications(user_id, type, title, message, task_id, actor_id, actor_name, financial_record_id, financial_record_type)
    select request.task_leader_id, 'petty_cash_liquidation_leader_review', 'Expense liquidation needs your review',
      coalesce(profile.full_name, 'A team member') || ' submitted receipts totaling ' || to_char(p_declared_spent, 'FM999G999G999G990D00') || '.',
      request.task_id, caller, coalesce(profile.full_name, ''), liquidation_id, 'petty_cash_liquidation' from public.profiles profile where profile.id = caller;
  else
    insert into public.notifications(user_id, type, title, message, task_id, actor_id, actor_name, financial_record_id, financial_record_type)
    select approver_id, 'petty_cash_liquidation_department_review', 'Expense liquidation ready for settlement',
      coalesce(profile.full_name, 'A Task Leader') || ' submitted receipts totaling ' || to_char(p_declared_spent, 'FM999G999G999G990D00') || '.',
      request.task_id, caller, coalesce(profile.full_name, ''), liquidation_id, 'petty_cash_liquidation'
    from public.organization_approver_ids(request.org_id) approver_id left join public.profiles profile on profile.id = caller
    where approver_id <> caller;
  end if;
  return liquidation_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_task_financial_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if new.status='completed' and old.status is distinct from 'completed'
 and eflow_work_clearance.cash_open(new.id,null) then
   raise exception 'Settle all task and subtask cash before approving this task' using errcode='22023';
 end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION eflow_budget.pre_subtask_budget_closeout(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 result jsonb;
 blockers jsonb;
 p public.projects;
 unallocated numeric;
 returnable numeric;
 task_lines jsonb;
begin
 result:=eflow_phase7.baseline_completion(p_project_id);
 blockers:=result->'blockers';
 select * into p from public.projects where id=p_project_id;
 if p.status not in ('completed','archived') and p.source_collaboration_draft_id is null then
  blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('kind','governance','id',p.id,'title',c->>'label','status','review_required','detail',c->>'detail')) from jsonb_array_elements(eflow_phase7.readiness(p.id)->'checks') c where not (c->>'ok')::boolean),'[]'::jsonb);
  blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('kind','task','id',t.id,'taskId',t.id,'title',t.title,'status','evidence_required','detail','An approved task submission with completion evidence is required.')) from public.tasks t where t.linked_project_id=p.id and t.deleted_at is null and t.status='completed' and not exists(select 1 from public.task_submissions s where s.task_id=t.id and s.status='approved')),'[]'::jsonb);
 end if;

 -- Previously completed projects retain their existing archive policy.
 if p.status in ('planning','active','on_hold') then
  with active_funds as materialized (
   select f.id, f.amount, f.fiscal_year, f.partition_id
   from eflow_project.funding f
   join public.budget_commitments c on c.id=f.commitment_id and c.status='active'
   where f.project_id=p.id and f.amount>0
  ), task_allocations as materialized (
   select f.id as funding_id, l.id, l.amount, t.title, s.name, f.fiscal_year,
     case when t.linked_project_id=p.id then public.task_budget_line_available(l.id,null) else 0 end as available
   from active_funds f
   join public.work_budget_allocation_lines l on l.project_funding_id=f.id
   join public.work_budget_allocations a on a.id=l.allocation_id and a.subtask_id is null and a.status='approved'
   left join public.tasks t on t.id=a.task_id
   join public.office_budget_sections s on s.id=f.partition_id
  )
  select
   coalesce((select sum(greatest(0,f.amount-coalesce(allocated.amount,0)))
     from active_funds f left join
       (select funding_id,sum(amount) as amount from task_allocations group by funding_id) allocated
       on allocated.funding_id=f.id),0),
   coalesce(sum(available),0),
   coalesce(jsonb_agg(jsonb_build_object('id',id,'task',title,'source',name,'fiscalYear',fiscal_year,'available',available)
     order by title,name,id) filter (where available>0),'[]'::jsonb)
  into unallocated,returnable,task_lines
  from task_allocations;

  -- Retain this balance against the SAME project commitment.
  -- Eligible task/subtask allocations are reclaimed by guarded completion and
  -- settlement, not released to Office Budget as a closeout prerequisite.
 end if;
 return result||jsonb_build_object('blockers',blockers,'canComplete',p.status in ('planning','active','on_hold') and jsonb_array_length(blockers)=0);
end $function$;

CREATE OR REPLACE FUNCTION public.project_completion_readiness_internal(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; extra jsonb;
begin
  result:=eflow_budget.pre_subtask_budget_closeout(p_project_id);
  return result;
end $function$;
-- END GENERATED WRITERS
notify pgrst,'reload schema';
commit;
