-- NON-DESTRUCTIVE. Requires the existing HR and Driver document-access setup.
begin;
do $$begin
  if to_regprocedure('public.driver_document_status()') is null then
    raise exception 'Run the Driver document-access setup first';
  end if;
end $$;
create sequence if not exists public.driver_company_id_seq;
create table if not exists public.driver_identities (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  photo_path text,
  photo_updated_at timestamptz,
  card_reference text unique,
  card_name text,
  card_photo_path text,
  issued_at timestamptz,
  issued_by uuid references public.profiles(id),
  valid_until date,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revoke_reason text,
  version integer not null default 1
);
alter table public.driver_identities enable row level security;
revoke all on public.driver_identities from public,anon,authenticated;
revoke all on sequence public.driver_company_id_seq from public,anon,authenticated;

create or replace function public.driver_identity_snapshot(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare p public.profiles; d public.driver_identities; card_state text; has_photo boolean; blocked boolean;
begin
  select * into p from public.profiles where id=p_user_id and role='driver';
  if p.id is null then raise exception 'Driver account not found'; end if;
  select * into d from public.driver_identities where user_id=p_user_id;
  has_photo:=d.photo_path is not null and exists(select 1 from storage.objects
    where bucket_id='driver-portraits' and name=d.photo_path);
  blocked:=exists(
    select 1 from public.hr_employee_records h cross join
      (values ('licenceExpiry'),('passportExpiry'),('visaExpiry')) f(key)
    where (h.data->>'portalUserId'=p.id::text or
      (nullif(h.data->>'portalUserId','') is null and lower(trim(h.data->>'email'))=lower(trim(p.email))))
      and nullif(h.data->>f.key,'') is not null
      and (h.data->>f.key)::date<(now() at time zone 'Europe/London')::date);
  card_state:=case
    when d.revoked_at is not null then 'revoked'
    when d.valid_until<(now() at time zone 'Europe/London')::date then 'expired'
    when lower(p.status)<>'active' or blocked or not has_photo or not exists(
      select 1 from storage.objects where bucket_id='driver-portraits' and name=d.card_photo_path)
      then 'suspended'
    else 'active' end;
  return jsonb_build_object('user_id',p.id,'name',coalesce(p.full_name,p.name),
    'email',p.email,'phone',p.phone,'account_status',p.status,'version',coalesce(d.version,0),
    'photo_path',case when has_photo then d.photo_path end,
    'card',case when d.card_reference is not null then jsonb_build_object(
      'reference',d.card_reference,'name',d.card_name,'photo_path',d.card_photo_path,
      'issued_at',d.issued_at,'valid_until',d.valid_until,'state',card_state,'revoked_at',d.revoked_at) end);
end $$;
revoke all on function public.driver_identity_snapshot(uuid) from public,anon,authenticated;

create or replace function public.own_driver_identity()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='driver' and lower(status)='active') then
    raise exception 'Active Driver account required' using errcode='42501';
  end if;
  return public.driver_identity_snapshot(auth.uid());
end $$;

create or replace function public.list_driver_identities()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if not public.hr_screening_access(false) then raise exception 'HR access required' using errcode='42501'; end if;
  return jsonb_build_object('canIssue',public.hr_screening_access(true),'drivers',coalesce((
    select jsonb_agg(public.driver_identity_snapshot(p.id) order by p.name,p.id)
    from public.profiles p where p.role='driver'),'[]'::jsonb));
end $$;

create or replace function public.register_driver_portrait(p_path text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare oldpath text;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='driver' and lower(status)='active') then
    raise exception 'Active Driver account required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||auth.uid()::text,0));
  if p_path !~ ('^'||auth.uid()::text||'/[a-f0-9-]{36}\.jpg$') or not exists(
    select 1 from storage.objects where bucket_id='driver-portraits' and name=p_path
      and metadata->>'mimetype'='image/jpeg'
      and (metadata->>'size')::bigint between 1 and 2097152) then
    raise exception 'Upload a valid Driver portrait first';
  end if;
  select photo_path into oldpath from public.driver_identities where user_id=auth.uid() for update;
  if oldpath=p_path then return public.driver_identity_snapshot(auth.uid()); end if;
  insert into public.driver_identities(user_id,photo_path,photo_updated_at)
    values(auth.uid(),p_path,now())
  on conflict(user_id) do update set photo_path=excluded.photo_path,photo_updated_at=now(),
    revoked_at=case when driver_identities.card_reference is not null then now() end,
    revoked_by=case when driver_identities.card_reference is not null then auth.uid() end,
    revoke_reason=case when driver_identities.card_reference is not null then 'Portrait changed: HR must reissue' end,
    version=driver_identities.version+1;
  return public.driver_identity_snapshot(auth.uid());
end $$;

create or replace function public.issue_driver_company_id(p_user_id uuid,p_valid_until date,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.profiles; d public.driver_identities; snapshot jsonb;
begin
  if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||p_user_id::text,0));
  select * into p from public.profiles where id=p_user_id and role='driver' and lower(status)='active';
  if p.id is null then raise exception 'Choose an active Driver account'; end if;
  select * into d from public.driver_identities where user_id=p_user_id for update;
  if d.version is distinct from p_expected_version then
    raise exception 'This Driver record changed. Refresh the list before issuing the card';
  end if;
  snapshot:=public.driver_identity_snapshot(p_user_id);
  if snapshot->>'photo_path' is null then raise exception 'The Driver must upload a profile photo before an ID can be issued'; end if;
  if p_valid_until<(now() at time zone 'Europe/London')::date then
    raise exception 'Choose today or a future date for ID validity';
  end if;
  update public.driver_identities set
    card_reference=coalesce(card_reference,'UKOW-ID-'||lpad(nextval('public.driver_company_id_seq')::text,6,'0')),
    card_name=coalesce(p.full_name,p.name),card_photo_path=photo_path,
    issued_at=now(),issued_by=auth.uid(),valid_until=p_valid_until,
    revoked_at=null,revoked_by=null,revoke_reason=null,version=version+1
  where user_id=p_user_id;
  snapshot:=public.driver_identity_snapshot(p_user_id);
  if snapshot->'card'->>'state'<>'active' then
    raise exception 'Driver compliance must be current before issuing a company ID';
  end if;
  return snapshot;
end $$;

create or replace function public.revoke_driver_company_id(p_user_id uuid,p_reason text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare d public.driver_identities;
begin
  if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
  if nullif(trim(p_reason),'') is null or length(p_reason)>1000 then raise exception 'Enter a revocation reason (up to 1000 characters)'; end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||p_user_id::text,0));
  select * into d from public.driver_identities where user_id=p_user_id for update;
  if d.card_reference is null then raise exception 'No issued company ID found'; end if;
  if d.version is distinct from p_expected_version then raise exception 'This Driver record changed. Refresh before revoking'; end if;
  update public.driver_identities set revoked_at=coalesce(revoked_at,now()),revoked_by=auth.uid(),
    revoke_reason=trim(p_reason),version=version+1 where user_id=p_user_id;
  return public.driver_identity_snapshot(p_user_id);
end $$;

-- Private, immutable image objects. No Driver update/delete policy is granted.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('driver-portraits','driver-portraits',false,2097152,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.driver_portrait_permission(p_path text,p_write boolean)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select (not p_write and public.hr_screening_access(false)) or exists(
    select 1 from public.profiles p where p.id=auth.uid() and p.role='driver' and lower(p.status)='active'
      and p_path ~ ('^'||p.id::text||'/[a-f0-9-]{36}\.jpg$'))
$$;
revoke all on function public.driver_portrait_permission(text,boolean) from public,anon;
grant execute on function public.driver_portrait_permission(text,boolean) to authenticated;
drop policy if exists driver_portrait_read on storage.objects;
create policy driver_portrait_read on storage.objects for select to authenticated
using(bucket_id='driver-portraits' and public.driver_portrait_permission(name,false));
drop policy if exists driver_portrait_upload on storage.objects;
create policy driver_portrait_upload on storage.objects for insert to authenticated
with check(bucket_id='driver-portraits' and public.driver_portrait_permission(name,true));

create or replace function public.driver_has_required_photo()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select not exists(select 1 from public.profiles where id=auth.uid() and role='driver')
    or exists(select 1 from public.driver_identities d join storage.objects o
      on o.bucket_id='driver-portraits' and o.name=d.photo_path where d.user_id=auth.uid())
$$;
revoke all on function public.driver_has_required_photo() from public,anon;
grant execute on function public.driver_has_required_photo() to authenticated;
drop policy if exists driver_required_portrait_upload_guard on storage.objects;
create policy driver_required_portrait_upload_guard on storage.objects as restrictive
for insert to authenticated with check(bucket_id='driver-portraits' or public.driver_has_required_photo());

-- Keep the existing critical-document lock, and require a saved portrait for work.
-- Read-only bootstrapping and portrait registration remain available during setup.
create or replace function public.enforce_driver_document_access()
returns void language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if auth.uid() is null then return; end if;
  if current_setting('request.path',true)='/rpc/driver_document_status' then return; end if;
  if (public.driver_document_status()->>'blocked')::boolean then
    raise exception 'Driver access blocked: provide renewed licence, passport or visa to HR. HR must update your employee record.'
      using errcode='42501';
  end if;
  if not public.driver_has_required_photo()
    and coalesce(current_setting('request.method',true),'POST') not in ('GET','HEAD','OPTIONS')
    and coalesce(current_setting('request.path',true),'') not in (
      '/rpc/own_driver_identity','/rpc/register_driver_portrait','/rpc/read_own_portal_store') then
    raise exception 'Upload your compulsory Driver profile photo before using job actions' using errcode='42501';
  end if;
end $$;

revoke all on function public.own_driver_identity(),public.list_driver_identities(),
  public.register_driver_portrait(text),public.issue_driver_company_id(uuid,date,integer),
  public.revoke_driver_company_id(uuid,text,integer) from public,anon;
grant execute on function public.own_driver_identity(),public.list_driver_identities(),
  public.register_driver_portrait(text),public.issue_driver_company_id(uuid,date,integer),
  public.revoke_driver_company_id(uuid,text,integer) to authenticated;
notify pgrst,'reload schema';
notify pgrst,'reload config';
commit;
