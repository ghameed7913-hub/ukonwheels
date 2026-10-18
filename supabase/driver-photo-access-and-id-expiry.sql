-- Run after driver-digital-id-upload.sql. No records or files are deleted.
begin;

-- Drivers may read their own portraits, but only Admin/HR managers may upload.
create or replace function public.driver_portrait_permission(p_path text,p_write boolean)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select (not p_write and public.hr_screening_access(false))
    or exists(select 1 from public.profiles p
      where p.role='driver' and p_path ~ ('^'||p.id::text||'/[a-f0-9-]{36}\.jpg$')
        and ((not p_write and p.id=auth.uid() and lower(p.status)='active')
          or (p_write and public.hr_screening_access(true))))
$$;

-- Retire the old self-service RPC, including calls from previously cached apps.
create or replace function public.register_driver_portrait(p_path text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  raise exception 'Driver photos can only be changed by Admin/HR' using errcode='42501';
end $$;
revoke all on function public.register_driver_portrait(text) from public,anon,authenticated;

-- Restrictive guards also protect against older broad storage policies.
drop policy if exists hr_only_portrait_insert on storage.objects;
create policy hr_only_portrait_insert on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'driver-portraits' or public.driver_portrait_permission(name,true));
drop policy if exists portrait_private_read on storage.objects;
create policy portrait_private_read on storage.objects as restrictive for select to authenticated
using(bucket_id<>'driver-portraits' or public.driver_portrait_permission(name,false));
drop policy if exists portrait_immutable_update on storage.objects;
create policy portrait_immutable_update on storage.objects as restrictive for update to authenticated
using(bucket_id<>'driver-portraits') with check(bucket_id<>'driver-portraits');
drop policy if exists portrait_immutable_delete on storage.objects;
create policy portrait_immutable_delete on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'driver-portraits');

-- Change only validity, not the stored file, reference, issue details or revocation.
create or replace function public.update_driver_company_id_expiry(
  p_user_id uuid,p_valid_until date,p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare d public.driver_identities;
begin
  if not public.hr_screening_access(true) then
    raise exception 'HR management access required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||p_user_id::text,0));
  if not exists(select 1 from public.profiles where id=p_user_id and role='driver') then
    raise exception 'Driver account not found';
  end if;
  select * into d from public.driver_identities where user_id=p_user_id for update;
  if d.card_reference is null then raise exception 'Upload or issue a Digital ID first'; end if;
  if d.valid_until is not distinct from p_valid_until then
    return public.driver_identity_snapshot(p_user_id);
  end if;
  if d.version is distinct from p_expected_version then
    raise exception 'This Driver record changed. Refresh before changing the Digital ID expiry';
  end if;
  update public.driver_identities set valid_until=p_valid_until,version=version+1
    where user_id=p_user_id;
  return public.driver_identity_snapshot(p_user_id);
end $$;
revoke all on function public.update_driver_company_id_expiry(uuid,date,integer) from public,anon;
grant execute on function public.update_driver_company_id_expiry(uuid,date,integer) to authenticated;

notify pgrst,'reload schema';
commit;
