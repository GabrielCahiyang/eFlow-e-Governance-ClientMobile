# M4 backend proposal for separate review

Status **PROPOSED, NOT APPLIED**. Target `ixnfphgjyelhckjwjkdv`. Catalog inspection and authenticated-role query planning were read-only. No data rows, policies, grants or hosted configuration were changed.

## Announcements

The Android client received PostgreSQL `42P17` while requesting Announcements. The hosted catalog shows two reciprocal SELECT predicates.

| Policy | Relevant dependency |
| --- | --- |
| `public.announcements` · `announcements readable` | Published notices use an existence check in `public.announcement_recipients` for the current recipient. |
| `public.announcement_recipients` · `recipients read own` | Own rows are allowed. The publisher branch reads `public.announcements` to check the announcement creator and exclude Admin. |

Both isolated plans reproduced the failure before reading any records. The first returned `42P17` on `announcements` and the second returned `42P17` on `announcement_recipients`. Neither probe used an Admin mobile session or credentials.

```sql
-- Diagnostics already run, shown here separately because each fails.
begin;
set local role authenticated;
explain (costs off)
select id from public.announcements where status = 'published' limit 1;
rollback;

begin;
set local role authenticated;
explain (costs off)
select announcement_id
from public.announcement_recipients
where user_id = auth.uid()
limit 1;
rollback;
```

The canonical web service at `b8d9fd8a7195b50fe7446b45092c9528586b0778` also reads these tables and uses the recipient join. A smaller projection, another HTTP client, a narrower filter, or switching to a recipient-first join cannot repair a recursive policy. The catalog exposed no authorized public announcement RPC. The mobile retest keeps RLS, scopes the read to the caller's recipient rows or their own published notices, and surfaces an unavailable state.

### Proposed policy repair

Break the edge from the recipient SELECT predicate to announcement RLS while preserving the existing checks for the recipient and non-Admin author. Review an internal, non-exposed, read-only creator predicate that derives the actor from `auth.uid()`. The current announcement table owner is `postgres` and forced RLS is off. The database owner must confirm the planned helper owner and the schema's API exposure before testing it. The helper returns a boolean for one notice, binds all object names explicitly, and accepts no actor parameter.

```sql
-- Review sketch only. Do not run against the hosted project.
create schema eflow_announcement_internal;
revoke all on schema eflow_announcement_internal from public, anon;
grant usage on schema eflow_announcement_internal to authenticated;

create function eflow_announcement_internal.is_current_non_admin_author(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.announcements as a
    where a.id = target
      and a.created_by = (select auth.uid())
      and public.auth_role((select auth.uid())) <> 'admin'
  );
$$;

revoke all on function eflow_announcement_internal.is_current_non_admin_author(uuid)
from public, anon;
grant execute on function eflow_announcement_internal.is_current_non_admin_author(uuid)
to authenticated;

alter policy "recipients read own" on public.announcement_recipients
using (
  user_id = (select auth.uid())
  or eflow_announcement_internal.is_current_non_admin_author(announcement_id)
);
```

The proposal does not grant table access or replace the recipient update or publisher mutation predicates. The live catalog also has permissive `FOR ALL` policies on announcements, including `announcements_write_permission`, which is permission-only and can apply to SELECT. Restoring policy evaluation may expose effective grants that were previously masked by recursion. Review that publisher policy together with the proposed cycle fix. In an isolated copy, require an unrelated publisher to be denied another author's recipient-only notice before allowing any hosted application. If that check fails, obtain approval for a separately scoped policy correction before deployment.

Approval requested only if the owner wants implementation. Approve an isolated validation of this exact policy edge and the effective publisher permissions. Review the final migration, rollback and access evidence before separately approving any hosted schema, policy or grant change. Before release, run the two plans again and verify authenticated recipient, unrelated user, unrelated publisher, original author, expired or withdrawn notice, and Admin fixtures. Verify the recipient can update only their own read receipt, the first timestamp stays stable, and existing authorized publisher workflows retain their intended boundaries. Record before and after policy definitions. Rollback restores the saved predicate and drops the helper and its private schema after verifying no other dependencies.

## Protected Office Team gateway

The pinned web client calls `phase2Request('/office-team')`. The canonical FastAPI server registers `GET /controlpanelEflow/api/office-team` with `Depends(require_user)` and `service.require_head(user)`. The handler derives the Office from the authenticated user and reads only that Office's roster. The mobile build uses the same path and shared authenticated control-panel transport, which attaches the current Supabase bearer session and refreshes once on HTTP 401.

| Probe | Result |
| --- | --- |
| Android QA build configuration | Explicit base `http://127.0.0.1:8322` normalizes to `/controlpanelEflow/api`. ADB reverse maps device TCP 8322 to host TCP 8322. The APK only permits cleartext on its approved loopback route. |
| Host loopback | No listening TCP socket on 8322. An unauthenticated GET could not connect and had no HTTP status. The emulator's gateway request terminated before a valid HTTP response. |
| Published discovery | `eflow_login_gateway_endpoint()` reads `system_config.ai_endpoint`. It returned the prior Cloudflare hostname `aspects-aims-viewer-pichunter.trycloudflare.com`. DNS returned name does not exist and HTTPS could not resolve it. |
| Authorization | A roster HTTP 401 or 403 was not observed on this retest because the gateway was unreachable. The mobile adapter keeps a separate session, denied-access, missing-route, invalid-response and connection state. |

The QA route matches the canonical contract. There is no evidence that the Office Team failure originates from an incorrect URL path or a Head authorization rejection. There is no approved fallback to a raw directory read.

- **Local emulator QA**. The owner can run the existing reviewed gateway privately at `127.0.0.1:8322` with its private environment and the unrelated PDS worker disabled. Keep the existing ADB mapping. Verify its health and a 401 without credentials before entering a dedicated QA account through normal mobile sign-in. This requires a working owner-run local process. No public change is needed. See [local gateway setup](M0-login-fix-qa.md).
- **Normal device access**. Separately approve restoring or deploying the reviewed gateway at an owner-provided durable HTTPS hostname with the same JWT and Office checks. Verify the route and auth contract on that endpoint before separately approving changing the discovered `system_config.ai_endpoint` value on `ixnfphgjyelhckjwjkdv`. The setting is shared with other gateway consumers, so verify those consumers and record the prior value and rollback. A QA APK with an explicit loopback override continues to use ADB forwarding. Approving a public discovery change does not retarget it.

## Project conversations

Native project context lists authorized task channels in that project. The installed chat schema has task and Office channel keys and text message content. Dedicated project-wide rooms and chat file attachments are intentionally unsupported. The M4 retest retains the existing task, Office and direct text channels.
