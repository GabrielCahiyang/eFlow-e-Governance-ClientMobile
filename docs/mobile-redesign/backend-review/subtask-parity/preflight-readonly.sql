-- Read-only inspection only. Does not invoke any workflow writer or change claims.
-- Run through a read-only connection/transaction; this is not a deployment script.
with expected(signature,expected_hash) as (values
 ('eflow_r7.complete_subitem(uuid,jsonb)','93234d1109e736688029de6eeb5e18a9'),
 ('public.m7_start_subtask(uuid,uuid)','f1048dc09d64f2b25033bdd64ca3e9e7'),
 ('eflow_r7.operation_capabilities(uuid,uuid)','dfa6e9d95e8303e1a737deaca383902e'),
 ('eflow_r7.subtask_dependencies_ready(uuid,uuid[])','4b4481f40a3d279807f710c964595e8c'),
 ('eflow_r7.guard_subtask_dependency_write()','b4d5670273b17c2bc3395144404452bc')
)
select jsonb_build_object(
 'at',now(),'database_role',current_user,'transaction_read_only',current_setting('transaction_read_only'),
 'functions',(select jsonb_agg(jsonb_build_object('signature',signature,
   'installed',to_regprocedure(signature) is not null,'reviewed_original',
   md5(pg_get_functiondef(to_regprocedure(signature)))=expected_hash)) from expected),
 'dependency_update_trigger_enabled',exists(select 1 from pg_trigger where tgrelid='public.subtasks'::regclass
   and tgfoid=to_regprocedure('eflow_r7.guard_subtask_dependency_write()') and not tgisinternal
   and tgenabled in ('O','A') and (tgtype & 1)=1 and (tgtype & 2)=2 and (tgtype & 16)=16),
 'records',(select jsonb_build_object('office_subtasks',count(*),
   'legacy_null',count(*) filter(where dependency_ids is null),
   'explicit_empty',count(*) filter(where cardinality(dependency_ids)=0),
   'explicit_nonempty',count(*) filter(where cardinality(dependency_ids)>0),
   'cancelled',count(*) filter(where status='cancelled')) from public.subtasks),
 'task_inventory',(select jsonb_build_object('tasks',count(*),'selected_dependencies',count(*) filter(where cardinality(dependency_ids)>0)) from public.tasks),
 'progress_publication',(select jsonb_agg(tablename order by tablename) from pg_publication_tables
   where pubname='supabase_realtime' and schemaname='public' and tablename in ('tasks','subtasks','task_progress_updates','subtask_progress_updates'))
) as evidence;
