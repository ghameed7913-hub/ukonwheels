-- DESTRUCTIVE, MANUAL MAINTENANCE ONLY. Never run as an application migration.
-- Delete all portal records and all but one verified active Admin sign-in.
-- First remove uploaded files using Supabase Storage, NOT SQL.
-- Default settings deliberately prevent execution until explicitly configured.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
set local ukow.reset_admin_email = 'REPLACE_WITH_ADMIN_EMAIL';
set local ukow.reset_confirmation = 'NOT_CONFIRMED';

do $reset$
declare
  keep_email text := lower(trim(current_setting('ukow.reset_admin_email', true)));
  keep_ids uuid[];
  keep_id uuid;
  relation_name text;
  unknown_tables text;
  remaining bigint;
  portal_tables text[] := array[
    'app_store', 'booking_events', 'booking_evidence', 'booking_inspections',
    'bookings', 'business_memberships', 'businesses', 'driver_profiles',
    'holiday_requests', 'incident_report_photos', 'incident_reports',
    'invoices', 'notifications', 'payments', 'profiles',
    'role_upgrade_requests', 'staff_profiles', 'user_permissions'
  ];
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Run this only in the Supabase SQL Editor as postgres';
  end if;
  if current_setting('ukow.reset_confirmation', true)
       is distinct from 'ERASE_PORTAL_DATA_KEEP_ONE_ADMIN'
     or keep_email is null or keep_email = ''
     or keep_email = 'replace_with_admin_email' then
    raise exception 'Reset is not configured. No portal data has been erased';
  end if;
  -- Refuse unexpected schemas rather than cascading into unrelated records.
  select string_agg(tablename, ', ' order by tablename) into unknown_tables
    from pg_catalog.pg_tables
    where schemaname = 'public' and not (tablename = any(portal_tables));
  if unknown_tables is not null then
    raise exception 'Unexpected public tables: %. Stop and review before resetting', unknown_tables;
  end if;
  foreach relation_name in array portal_tables loop
    if to_regclass(format('public.%I', relation_name)) is null then
      raise exception 'Expected portal table % is missing. No reset performed', relation_name;
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_class parent on parent.oid = c.confrelid
    join pg_catalog.pg_namespace pn on pn.oid = parent.relnamespace
    join pg_catalog.pg_class child on child.oid = c.conrelid
    join pg_catalog.pg_namespace cn on cn.oid = child.relnamespace
    where c.contype = 'f'
      and ((pn.nspname = 'public' and parent.relname = any(portal_tables))
           or (pn.nspname = 'auth' and parent.relname = 'users'))
      and not (
        (cn.nspname = 'public' and child.relname = any(portal_tables))
        or (pn.nspname = 'auth' and cn.nspname in ('auth', 'storage'))
      )
  ) then
    raise exception 'An unrelated table depends on portal data. No reset performed';
  end if;
  foreach relation_name in array portal_tables loop
    execute format('lock table public.%I in share row exclusive mode', relation_name);
  end loop;
  lock table auth.users, storage.objects, storage.buckets in share row exclusive mode;
  select array_agg(u.id) into keep_ids
    from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = keep_email
      and lower(p.role) = 'admin' and lower(p.status) = 'active';
  if coalesce(cardinality(keep_ids), 0) <> 1 then
    raise exception 'The exact active Admin sign-in could not be verified. No reset performed';
  end if;
  keep_id := keep_ids[1];
  if exists (
    select 1 from storage.buckets
    where id not in ('booking-evidence', 'incident-evidence', 'profile-documents')
  ) then
    raise exception 'Unexpected storage buckets found. Stop and review before resetting';
  end if;
  if exists (select 1 from storage.objects) then
    raise exception 'Uploaded files remain. Empty the portal buckets through Supabase Storage first; do not delete storage metadata with SQL';
  end if;
  if not exists (select 1 from public.app_store where id = 'main') then
    raise exception 'The shared portal record is missing. No reset performed';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class c
    where c.oid = 'public.app_store'::regclass and c.relrowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.app_store'::regclass and polpermissive
  ) then
    raise exception 'The shared store access policies need review before resetting. No reset performed';
  end if;

  -- Explicit dependency order: never TRUNCATE/CASCADE or drop application setup.
  delete from public.incident_report_photos;
  delete from public.incident_reports;
  delete from public.booking_evidence;
  delete from public.booking_inspections;
  delete from public.booking_events;
  delete from public.payments;
  delete from public.invoices;
  delete from public.notifications;
  delete from public.holiday_requests;
  delete from public.role_upgrade_requests;
  delete from public.business_memberships;
  delete from public.user_permissions;
  delete from public.driver_profiles;
  delete from public.staff_profiles;
  delete from public.bookings;
  update public.profiles set business_id = null, business_name = null,
    avatar_path = null, staff_role = null, driver_name = null,
    client_user_name = null, account_type = 'private',
    permissions = '[]'::jsonb, updated_at = now()
    where id = keep_id;
  delete from public.businesses;
  delete from public.profiles where id <> keep_id;
  -- Preserve the actual Admin auth row: no password changes or replacement user.
  -- Supabase cascades deletion of the other users' sessions/refresh tokens.
  delete from auth.users where id <> keep_id;
  delete from public.app_store where id <> 'main';
  update public.app_store
    set data = jsonb_build_object(
      '_resetGeneration', gen_random_uuid()::text,
      'demoDataRemoved', true,
      'accountActivity', '[]'::jsonb, 'bookings', '[]'::jsonb,
      'businesses', '[]'::jsonb, 'drivers', '[]'::jsonb,
      'expenses', '[]'::jsonb, 'expiryAlertKeys', '[]'::jsonb,
      'holidays', '[]'::jsonb, 'invoices', '[]'::jsonb,
      'messageLog', '[]'::jsonb, 'notifications', '[]'::jsonb,
      'payslips', '[]'::jsonb, 'staffUsers', '[]'::jsonb,
      'clientUsers', '[]'::jsonb, 'transactions', '[]'::jsonb,
      'updateRequests', '[]'::jsonb
    ), updated_at = now()
    where id = 'main';

  -- Verify before committing. Any error rolls back the relational reset.
  foreach relation_name in array portal_tables loop
    if relation_name not in ('profiles', 'app_store') then
      execute format('select count(*) from public.%I', relation_name) into remaining;
      if remaining <> 0 then
        raise exception 'Table % was not emptied. Reset rolled back', relation_name;
      end if;
    end if;
  end loop;
  if (select count(*) from auth.users) <> 1
     or (select count(*) from public.profiles) <> 1
     or not exists (
       select 1 from auth.users u join public.profiles p on p.id = u.id
       where u.id = keep_id and lower(u.email) = keep_email
         and lower(p.role) = 'admin' and lower(p.status) = 'active'
     ) then
    raise exception 'Admin preservation check failed. Reset rolled back';
  end if;
end;
$reset$;

-- Old browser tabs retain a full copy of shared data. Refuse stale snapshots.
-- Maintenance SQL/service-role access remains available; ordinary API writes
-- must come from a live active profile and preserve the current reset generation.
create or replace function public.ukow_guard_shared_store_after_reset()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $guard$
begin
  if current_user in ('anon', 'authenticated') then
    if auth.uid() is null or not exists (
      select 1 from public.profiles where id = auth.uid() and lower(status) = 'active'
    ) then
      raise exception 'This portal account is no longer active. Sign in again';
    end if;
    if tg_op = 'DELETE' then
      raise exception 'The shared portal record cannot be deleted through the portal';
    end if;
    if (new.data::jsonb ->> '_resetGeneration')
         is distinct from (old.data::jsonb ->> '_resetGeneration') then
      raise exception 'The portal was reset. Close this tab and sign in again before saving';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$guard$;
drop trigger if exists ukow_shared_store_reset_guard on public.app_store;
create trigger ukow_shared_store_reset_guard
  before update or delete on public.app_store
  for each row when (old.id = 'main')
  execute function public.ukow_guard_shared_store_after_reset();

-- Restrictive policies do not grant new access or replace existing role rules.
-- Deleted accounts' still-unexpired JWTs must not read/write the new shared data.
drop policy if exists ukow_reset_active_account_guard on public.app_store;
create policy ukow_reset_active_account_guard on public.app_store
  as restrictive for all to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and lower(status) = 'active'
  ))
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and lower(status) = 'active'
  ));
drop policy if exists ukow_reset_no_anon_access on public.app_store;
create policy ukow_reset_no_anon_access on public.app_store
  as restrictive for all to anon using (false) with check (false);

-- Keep reference/identity sequences advancing: old exported references must not
-- be reissued. Keep bucket settings, tables, functions and portal features.
commit;
