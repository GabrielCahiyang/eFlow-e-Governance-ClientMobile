-- REVIEW ONLY. Not applied, not in a migration-push directory.
-- Deploy only from isolated live migration history after a drift/backup review.
begin;
do $fix$
declare definition text; old_expression text := 'eflow_r7.member(p_project,(m->>''office'')::uuid,(m->>''user_id'')::uuid)';
begin
 select pg_get_functiondef('eflow_r7.project_members(uuid)'::regprocedure) into definition;
 if position(old_expression in definition)=0 then raise exception 'Unexpected live project_members definition; review drift before deployment'; end if;
 if (length(definition)-length(replace(definition,old_expression,'')))/length(old_expression) <> 1 then raise exception 'Ambiguous eligibility expression; review manually'; end if;
 definition := replace(definition,old_expression,'eflow_r7.member(p_project,case when result->>''kind''=''personal'' then null::uuid else (m->>''office'')::uuid end,(m->>''user_id'')::uuid)');
 execute definition;
end $fix$;
-- Display affiliation is unchanged. Only the eligibility membership context changes.
-- Existing grants, function privileges, execution guards and read checks are preserved.
commit;
