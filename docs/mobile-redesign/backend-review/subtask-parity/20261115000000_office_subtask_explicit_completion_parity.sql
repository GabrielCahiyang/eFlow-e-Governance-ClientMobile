-- REVIEW ONLY. Not in a deployment migration directory. Never bulk-push Web history.
-- Prerequisite: the reviewed explicit-dependency objects already installed on
-- ixnfphgjyelhckjwjkdv. This does not install/reapply their untracked migrations.
-- Changes no rows, schemas, columns, RLS, grants, signatures, or financial guards.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $reviewed_patch$
declare
  signature constant text := 'eflow_r7.complete_subitem(uuid,jsonb)';
  original text;
  dependency record;
  legacy constant text := 'if not s.is_standalone and exists(select 1 from public.subtasks c where c.task_id=root_id';
  corrected constant text := 'if s.dependency_ids is null and not s.is_standalone and exists(select 1 from public.subtasks c where c.task_id=root_id';
begin
  if to_regprocedure(signature) is null
     or to_regprocedure('eflow_r7.subtask_dependencies_ready(uuid,uuid[])') is null
     or not exists(select 1 from information_schema.columns where table_schema='public'
       and table_name='subtasks' and column_name='dependency_ids' and udt_name='_uuid') then
    raise exception 'Reviewed Office explicit-dependency prerequisites are missing. Stop and review the installed schema.';
  end if;
  original := pg_get_functiondef(signature::regprocedure);
  for dependency in select * from (values
    ('public.m7_start_subtask(uuid,uuid)', 'f1048dc09d64f2b25033bdd64ca3e9e7'),
    ('eflow_r7.operation_capabilities(uuid,uuid)', 'dfa6e9d95e8303e1a737deaca383902e'),
    ('eflow_r7.subtask_dependencies_ready(uuid,uuid[])', '4b4481f40a3d279807f710c964595e8c'),
    ('eflow_r7.guard_subtask_dependency_write()', 'b4d5670273b17c2bc3395144404452bc')
  ) as reviewed(signature, hash) loop
    if to_regprocedure(dependency.signature) is null or
       md5(pg_get_functiondef(to_regprocedure(dependency.signature))) <> dependency.hash then
      raise exception 'Explicit-dependency prerequisite differs: %. Stop for review.', dependency.signature;
    end if;
  end loop;
  if not exists(select 1 from pg_trigger where tgrelid='public.subtasks'::regclass
    and tgfoid='eflow_r7.guard_subtask_dependency_write()'::regprocedure and not tgisinternal
    and tgenabled in ('O','A') and (tgtype & 1)=1 and (tgtype & 2)=2 and (tgtype & 16)=16) then
    raise exception 'The reviewed explicit-dependency UPDATE guard is not enabled. No change applied.';
  end if;
  -- Fail closed on any installed-body drift: re-review, never weaken this check
  -- merely to make a deployment proceed. Owner/ACL are retained by OR REPLACE.
  if md5(original) <> '93234d1109e736688029de6eeb5e18a9' then
    raise exception 'Office completion writer differs from the reviewed baseline. Stop and review the current definition.';
  end if;
  if (length(original)-length(replace(original,legacy,'')))/length(legacy) <> 1 then
    raise exception 'Expected exactly one legacy completion predicate. No change applied.';
  end if;
  -- Existing current submit capabilities enforce selected dependencies before
  -- this point; the enabled dependency write trigger repeats enforcement.
  -- [] is explicitly independent. NULL alone retains the legacy sibling rule.
  execute replace(original,legacy,corrected);
end
$reviewed_patch$;

commit;
