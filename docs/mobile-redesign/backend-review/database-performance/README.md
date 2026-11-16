# Database performance review — 17 November 2026

Read-only review of hosted project `ixnfphgjyelhckjwjkdv`. Evidence came from four read-only SQL queries the user ran in the Supabase SQL Editor (`pg_stat_activity`, `pg_stat_statements`, `pg_policies`, `pg_stat_user_tables`) plus endpoint timings measured on 16 November. **Nothing on the hosted project was changed.** Every database action below needs the backend owner's approval and must be applied through the normal migration process, not ad hoc.

## Symptom

- `mobile-sign-in` returns 503 after 12–23 s. Its upstream calls have a 10 s limit, and the Auth password grant alone took 12 s for a nonexistent account.
- A trivial RPC (`eflow_login_gateway_endpoint`) took 39 s; `eflow_login_begin` did not answer within 40 s.

## Database restart and recovery

`pg_postmaster_start_time()` shows Postgres restarted at **15:45 UTC on 16 November**. That is after the failing measurements above (about 15:04 UTC) and before the statistics query, which explains `n_live_tup = 0`: statistics reset on restart. Automatic analysis first ran at 16:01 UTC. No manual `ANALYZE` has been run.

The same checks at 16:04 UTC, after the restart:

| Check (nonexistent account) | Before restart | After restart |
|---|---|---|
| `mobile-sign-in` | 503 in 12–23 s | **401 (correct) in 1.6–4.6 s** |
| Auth password grant | 400 in 12 s | 400 in 2.9 s |
| `eflow_login_gateway_endpoint` RPC | 200 in 39 s | 200 in 1.9 s |

Sign-in is working again, but the restart treats the symptom only. The owner should find out why the database degraded or restarted (Logs → Postgres: out-of-memory, termination, connection exhaustion), then apply the findings below so the overload does not return. A trivial RPC taking 1.9 s is still slow.

## Findings, ranked

| # | Finding | Evidence | Recommended action (owner) | Risk |
|---|---|---|---|---|
| 1 | **Planner statistics are missing.** Every public table reports `n_live_tup = 0`, so Postgres plans as if tables were empty and picks sequential scans. | `profiles`: 12,522 seq scans vs 66 index scans although lookups are by primary key. `projects`: 17,246 vs 1,496. `organizations`, `project_offices`, `users`: 0 index scans. | Run `ANALYZE;` (or `VACUUM (ANALYZE);`) once, then confirm autovacuum is enabled and `last_autoanalyze` advances in `pg_stat_user_tables`. | Low. Maintenance only; no schema or data change. Likely the largest single win. |
| 2 | ~~Long-running query~~ **Resolved: not a problem.** The long "active" entry is Supabase Realtime's replication stream (`supabase_admin`, `realtime_replication_connection`, `START_REPLICATION SLOT …`, waiting on `WalSenderWaitForWal`). It stays open by design. Its age (~18 min when checked) suggests the database or Realtime restarted recently, which would also explain finding 1, since statistics reset after an unclean restart. | `pg_stat_activity` follow-up query. | Do not cancel it. Check `select pg_postmaster_start_time();` and the Supabase logs for restarts or out-of-memory events; repeated restarts mean the instance is undersized for the load. | None. |
| 3 | **Realtime change decoding is the top database consumer.** | `realtime.list_changes` WAL query: 994 calls, 155 s total (156 ms average). | Publish only tables clients actually subscribe to. Mobile has reduced bursty refreshes (see "Already done"); filtering listeners further depends on assignment columns. | Low–medium. Removing a table from the publication stops its live updates on Web too; check Web listeners first. |
| 4 | **Two permissive SELECT policies on hot tables.** Postgres evaluates both per row and ORs them. | `tasks` (`m7_operational_task` + `tasks_read`), `subtasks`, `projects`, `subtask_progress_updates`, `notifications` each have two SELECT policies that call visibility functions. | Merge each pair into one policy with the same meaning, or make the visibility functions `STABLE` and index the columns they look up. Verify with `explain analyze` as a real Head/Member/Accounting user. | High. Authorization semantics must not change; needs regression tests on Web and Mobile. |
| 5 | **Per-row `auth.uid()` call.** | `subtask_progress_read`: `can_see_task(task_id, auth.uid())`; every other policy wraps it as `(select auth.uid())`. | Change to `(select auth.uid())` so it is evaluated once per statement. | Low. Same meaning. |
| 6 | **`r7_work_tree` averages 10.2 s.** | 3 calls, 30.7 s total. Mobile and Web call it once per assigned task while building My Work. | Profile the function with `explain analyze`; add a batched form (`r7_work_trees(p_roots uuid[])`) so the feed makes one call. | Medium. New RPC; contract must match the single-root version. |
| 7 | **Other slow RPCs / reads (1–3.6 s average).** | Project RPCs taking `p_project_id` / `p_project` (3.0–3.6 s), `list_message_conversations_v2` (3.1 s), `subtasks where task_id = any(...)` (2.4 s), `r3_list_workspaces` (1.4 s), `task_status_history` by task (1.4 s), `notifications` by user (0.97 s). | Re-measure after finding 1. Then check indexes: `subtasks(task_id)`, `task_status_history(task_id)`, `notifications(user_id, created_at desc)`, `project_office_members(project_office_id)`. | Low for indexes (create `concurrently`). |

## Security note (not performance)

`notifications` has an INSERT policy `notifs_insert_all` with `WITH CHECK (true)`, so any signed-in user can insert a notification for anyone. A second policy (`notification_conversation_reference_server_only`) does not restrict this, because permissive policies are ORed. The owner should confirm whether this is intended.

## Already done in Mobile (not yet committed)

- Whole-table realtime bursts on `tasks`, `subtasks`, `projects` and `subtask_progress_updates` now cause one My Work reload (900 ms debounce, 8 s max wait), none while backgrounded, and one catch-up on return.
- The shared visible-task list uses the same bounded debounce.
- `role_permissions` is watched only for the actor's own role.
- Teammate commit `795f48c`: `fetchWorkTree` requests for the same root are shared, feed concurrency is 2, and polling is 30 s and paused while hidden.

## Suggested order

1. Finding 1 (statistics) plus the restart check from finding 2, then re-measure sign-in. These may resolve the 503s on their own.
2. Finding 5 (one-line policy change).
3. Indexes from finding 7, then re-run the `pg_stat_statements` query and compare.
4. Findings 3, 4 and 6 as reviewed migrations with Web/Mobile regression tests.

## Re-measure

After each step, record the timings of the same checks:

```sql
select round(total_exec_time::numeric) total_ms, calls, round(mean_exec_time::numeric,1) avg_ms,
       left(regexp_replace(query,'\s+',' ','g'),120) query
from extensions.pg_stat_statements order by total_exec_time desc limit 15;
```

For comparable numbers, reset statistics first with `select extensions.pg_stat_statements_reset();` (owner only), and time sign-in with a nonexistent email.
