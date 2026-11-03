-- REVIEW ONLY: requires separate hosted deployment review. Never push this folder.
begin;
create table public.mobile_push_devices (
 device_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 token text not null unique, platform text not null check(platform in ('android','ios')),
 updated_at timestamptz not null default now()
);
alter table public.mobile_push_devices enable row level security;
revoke all on public.mobile_push_devices from public,anon,authenticated;
grant all on public.mobile_push_devices to service_role;
create function public.register_mobile_push_device(p_device uuid,p_token text,p_platform text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(eflow_r3.eligible(auth.uid()),false) or public.auth_role(auth.uid()) not in ('head','member','accounting_staff') then raise exception 'Current mobile work access required' using errcode='42501'; end if;
 if p_platform not in ('android','ios') or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' or length(p_token)>256 then raise exception 'Invalid device registration';end if;
 if exists(select 1 from public.mobile_push_devices where device_id=p_device and user_id<>auth.uid()) then raise exception 'Device belongs to a different signed-in account';end if;
 insert into public.mobile_push_devices(device_id,user_id,token,platform) values(p_device,auth.uid(),p_token,p_platform)
 on conflict(device_id) do update set token=excluded.token,platform=excluded.platform,updated_at=now();
end $$;
create function public.unregister_mobile_push_device(p_device uuid) returns void language sql security definer set search_path='' as $$ delete from public.mobile_push_devices where device_id=p_device and user_id=auth.uid() $$;
revoke all on function public.register_mobile_push_device(uuid,text,text),public.unregister_mobile_push_device(uuid) from public,anon;
grant execute on function public.register_mobile_push_device(uuid,text,text),public.unregister_mobile_push_device(uuid) to authenticated;
create table public.mobile_push_outbox (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.notifications(id) on delete cascade,
 device_id uuid not null references public.mobile_push_devices(device_id) on delete cascade,
 attempts integer not null default 0, lease_until timestamptz, accepted_at timestamptz, expo_ticket_id text, delivered_at timestamptz, last_error text,
 unique(notification_id,device_id)
);
alter table public.mobile_push_outbox enable row level security;
revoke all on public.mobile_push_outbox from public,anon,authenticated;
grant all on public.mobile_push_outbox to service_role;
create function public.enqueue_mobile_push() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.mobile_push_outbox(notification_id,device_id) select new.id,d.device_id from public.mobile_push_devices d where d.user_id=new.user_id on conflict do nothing;return new;
end $$;
create trigger enqueue_mobile_push after insert on public.notifications for each row execute function public.enqueue_mobile_push();
revoke all on function public.enqueue_mobile_push() from public,anon,authenticated;
create function public.claim_mobile_push() returns table(id uuid,token text,device_id uuid) language sql security definer set search_path='' as $$
 with selected as (select o.id from public.mobile_push_outbox o join public.mobile_push_devices d on d.device_id=o.device_id
 where o.delivered_at is null and o.accepted_at is null and o.attempts<5 and coalesce(o.lease_until,'-infinity')<now() and eflow_r3.eligible(d.user_id)
 order by o.id limit 100 for update of o skip locked), claimed as (
 update public.mobile_push_outbox o set attempts=attempts+1,lease_until=now()+interval '2 minutes' from selected s where o.id=s.id returning o.id,o.device_id)
 select c.id,d.token,c.device_id from claimed c join public.mobile_push_devices d on d.device_id=c.device_id;
$$;
revoke all on function public.claim_mobile_push() from public,anon,authenticated;
grant execute on function public.claim_mobile_push() to service_role;
commit;
