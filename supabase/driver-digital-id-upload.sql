-- Additive company-ID file storage. Requires the earlier company-ID and HR-photo setup.
-- No employee records, files or passwords are deleted or reset.
begin;
alter table public.driver_identities add column if not exists company_id_path text;
alter table public.driver_identities add column if not exists company_id_name text;
alter table public.driver_identities add column if not exists company_id_mime text;

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
      or (d.company_id_path is not null and not exists(
        select 1 from storage.objects where bucket_id='driver-company-ids' and name=d.company_id_path))
      then 'suspended'
    else 'active' end;
  return jsonb_build_object('user_id',p.id,'name',coalesce(p.full_name,p.name),
    'email',p.email,'phone',p.phone,'account_status',p.status,'version',coalesce(d.version,0),
    'photo_path',case when has_photo then d.photo_path end,
    'card',case when d.card_reference is not null then jsonb_build_object(
      'reference',d.card_reference,'name',d.card_name,'photo_path',d.card_photo_path,
      'issued_at',d.issued_at,'valid_until',d.valid_until,'state',card_state,'revoked_at',d.revoked_at,
      'source',case when d.company_id_path is null then 'generated' else 'uploaded' end,
      'document',case when d.company_id_path is not null then jsonb_build_object(
        'path',d.company_id_path,'name',d.company_id_name,'mime',d.company_id_mime) end) end);
end $$;
revoke all on function public.driver_identity_snapshot(uuid) from public,anon,authenticated;

create or replace function public.register_driver_company_id_file(
  p_user_id uuid,p_path text,p_name text,p_mime text,p_valid_until date,p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.profiles; d public.driver_identities; snapshot jsonb; ext text;
begin
  if not public.hr_screening_access(true) then
    raise exception 'HR management access required' using errcode='42501';
  end if;
  select * into p from public.profiles where id=p_user_id and role='driver' and lower(status)='active';
  if p.id is null then raise exception 'Choose an active Driver account'; end if;
  ext:=case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png'
    when 'image/webp' then 'webp' when 'application/pdf' then 'pdf' end;
  if ext is null or nullif(trim(p_name),'') is null or length(p_name)>200
    or p_path !~ ('^'||p_user_id::text||'/[a-f0-9-]{36}\.'||ext||'$')
    or not exists(select 1 from storage.objects
      where bucket_id='driver-company-ids' and name=p_path
        and metadata->>'mimetype'=p_mime and (metadata->>'size')::bigint between 1 and 10485760) then
    raise exception 'Upload a valid company ID image or PDF for this Driver first';
  end if;
  if p_valid_until<(now() at time zone 'Europe/London')::date then
    raise exception 'Choose today or a future validity date';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||p_user_id::text,0));
  select * into d from public.driver_identities where user_id=p_user_id for update;
  if d.company_id_path=p_path and d.valid_until is not distinct from p_valid_until then
    return public.driver_identity_snapshot(p_user_id);
  end if;
  if d.version is distinct from p_expected_version then
    raise exception 'This Driver record changed. Refresh before uploading the company ID';
  end if;
  snapshot:=public.driver_identity_snapshot(p_user_id);
  if snapshot->>'photo_path' is null then raise exception 'Save the Driver profile photo first'; end if;
  update public.driver_identities set
    company_id_path=p_path,company_id_name=trim(p_name),company_id_mime=p_mime,
    card_reference=coalesce(card_reference,'UKOW-ID-'||lpad(nextval('public.driver_company_id_seq')::text,6,'0')),
    card_name=coalesce(p.full_name,p.name),card_photo_path=photo_path,
    issued_at=now(),issued_by=auth.uid(),valid_until=p_valid_until,
    revoked_at=null,revoked_by=null,revoke_reason=null,version=version+1
  where user_id=p_user_id;
  snapshot:=public.driver_identity_snapshot(p_user_id);
  if snapshot->'card'->>'state'<>'active' then
    raise exception 'Driver compliance must be current before uploading a company ID';
  end if;
  return snapshot;
end $$;
revoke all on function public.register_driver_company_id_file(uuid,text,text,text,date,integer) from public,anon;
grant execute on function public.register_driver_company_id_file(uuid,text,text,text,date,integer) to authenticated;

-- Explicit legacy generated-card reissue clears any earlier uploaded file.
create or replace function public.issue_driver_company_id(p_user_id uuid,p_valid_until date,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.profiles; d public.driver_identities; snapshot jsonb;
begin
  if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||p_user_id::text,0));
  select * into p from public.profiles where id=p_user_id and role='driver' and lower(status)='active';
  if p.id is null then raise exception 'Choose an active Driver account'; end if;
  select * into d from public.driver_identities where user_id=p_user_id for update;
  if d.version is distinct from p_expected_version then raise exception 'This Driver record changed. Refresh before issuing'; end if;
  snapshot:=public.driver_identity_snapshot(p_user_id);
  if snapshot->>'photo_path' is null then raise exception 'Save the Driver profile photo first'; end if;
  if p_valid_until<(now() at time zone 'Europe/London')::date then raise exception 'Choose today or a future validity date'; end if;
  update public.driver_identities set
    company_id_path=null,company_id_name=null,company_id_mime=null,
    card_reference=coalesce(card_reference,'UKOW-ID-'||lpad(nextval('public.driver_company_id_seq')::text,6,'0')),
    card_name=coalesce(p.full_name,p.name),card_photo_path=photo_path,
    issued_at=now(),issued_by=auth.uid(),valid_until=p_valid_until,
    revoked_at=null,revoked_by=null,revoke_reason=null,version=version+1 where user_id=p_user_id;
  snapshot:=public.driver_identity_snapshot(p_user_id);
  if snapshot->'card'->>'state'<>'active' then raise exception 'Driver compliance must be current before issuing'; end if;
  return snapshot;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('driver-company-ids','driver-company-ids',false,10485760,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.company_id_file_permission(p_path text,p_write boolean)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if p_write then
    return public.hr_screening_access(true) and exists(select 1 from public.profiles p
      where p.role='driver' and p_path ~ ('^'||p.id::text||'/[a-f0-9-]{36}\.(jpg|png|webp|pdf)$'));
  end if;
  if public.hr_screening_access(false) then return true; end if;
  if not exists(select 1 from public.driver_identities d join public.profiles p on p.id=d.user_id
    where p.id=auth.uid() and p.role='driver' and lower(p.status)='active' and d.company_id_path=p_path) then
    return false;
  end if;
  return public.driver_identity_snapshot(auth.uid())->'card'->>'state'='active';
end $$;
revoke all on function public.company_id_file_permission(text,boolean) from public,anon;
grant execute on function public.company_id_file_permission(text,boolean) to authenticated;

drop policy if exists company_id_file_upload on storage.objects;
create policy company_id_file_upload on storage.objects for insert to authenticated
with check(bucket_id='driver-company-ids' and public.company_id_file_permission(name,true));
drop policy if exists company_id_file_read on storage.objects;
create policy company_id_file_read on storage.objects for select to authenticated
using(bucket_id='driver-company-ids' and public.company_id_file_permission(name,false));
drop policy if exists company_id_insert_guard on storage.objects;
create policy company_id_insert_guard on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'driver-company-ids' or public.company_id_file_permission(name,true));
drop policy if exists company_id_read_guard on storage.objects;
create policy company_id_read_guard on storage.objects as restrictive for select to authenticated
using(bucket_id<>'driver-company-ids' or public.company_id_file_permission(name,false));
drop policy if exists company_id_immutable_update on storage.objects;
create policy company_id_immutable_update on storage.objects as restrictive for update to authenticated
using(bucket_id<>'driver-company-ids') with check(bucket_id<>'driver-company-ids');
drop policy if exists company_id_immutable_delete on storage.objects;
create policy company_id_immutable_delete on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'driver-company-ids');

notify pgrst,'reload schema';
commit;
