-- Run once in the existing Supabase SQL Editor after ukow_production_architecture.sql.
-- Additive only: does not alter bookings, existing evidence or portal accounts.
begin;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id),
  booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists incident_reports_driver_created_idx
  on public.incident_reports(driver_id,created_at desc);
create table if not exists public.incident_report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.incident_reports(id),
  storage_path text not null unique,
  category text not null check(category in ('incident','licence','insurance')),
  file_name text not null,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
  file_bytes integer not null check(file_bytes between 1 and 10485760),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists incident_report_photos_report_idx on public.incident_report_photos(report_id);

create or replace function public.is_active_incident_driver()
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
  select exists(select 1 from public.profiles where id=auth.uid()
    and lower(role)='driver' and lower(coalesce(status,'active'))='active')
$$;

alter table public.incident_reports enable row level security;
alter table public.incident_report_photos enable row level security;
drop policy if exists incident_reports_read on public.incident_reports;
create policy incident_reports_read on public.incident_reports for select to authenticated
using(public.is_portal_admin() or (driver_id=auth.uid() and public.is_active_incident_driver()));
drop policy if exists incident_photos_read on public.incident_report_photos;
create policy incident_photos_read on public.incident_report_photos for select to authenticated
using(exists(select 1 from public.incident_reports r where r.id=report_id
  and (public.is_portal_admin() or (r.driver_id=auth.uid() and public.is_active_incident_driver()))));
revoke all on public.incident_reports,public.incident_report_photos from anon,authenticated;
grant select on public.incident_reports,public.incident_report_photos to authenticated;

create or replace function public.save_incident_report(
  p_id uuid,p_details jsonb,p_booking_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare r public.incident_reports; cleaned jsonb;
begin
  if not public.is_active_incident_driver() then raise exception 'Only an active Driver can save an incident report'; end if;
  if p_id is null or jsonb_typeof(p_details)<>'object' or p_details is null
    or length(p_details::text)>100000 then raise exception 'Invalid incident report details'; end if;
  if exists(select 1 from jsonb_each(p_details) e where jsonb_typeof(e.value)<>'string'
    or length(e.value #>> '{}')>10000) then raise exception 'Each report field must be text of at most 10000 characters'; end if;
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into cleaned
    from jsonb_each(p_details) where key=any(array[
      'fullName','driverNumber','registration','make','model','type','occurredAt','location',
      'description','fault','policeReference','recoveryCompany','recoveryReference','weather',
      'roadConditions','injuries','damage','witnesses','actionsTaken','otherName','otherPhone',
      'otherAddress','otherInsurance','otherRegistration','otherMake','otherModel','otherColour']);
  select * into r from public.incident_reports where id=p_id for update;
  if found then
    if r.driver_id<>auth.uid() then raise exception 'This report is not your editable draft'; end if;
    if r.status='submitted' then
      if r.details=cleaned and r.booking_id is not distinct from p_booking_id then
        return to_jsonb(r);
      end if;
      raise exception 'Submitted incident reports cannot be edited';
    end if;
    if p_booking_id is not null and p_booking_id is distinct from r.booking_id
      and not exists(select 1 from public.bookings where id=p_booking_id and driver_id=auth.uid())
      then raise exception 'You may only link your own assigned booking'; end if;
    update public.incident_reports set details=cleaned,booking_id=p_booking_id,updated_at=now()
      where id=p_id returning * into r;
  else
    if p_booking_id is not null and not exists(select 1 from public.bookings
      where id=p_booking_id and driver_id=auth.uid())
      then raise exception 'You may only link your own assigned booking'; end if;
    insert into public.incident_reports(id,driver_id,booking_id,details)
      values(p_id,auth.uid(),p_booking_id,cleaned) returning * into r;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.register_incident_photo(
  p_report_id uuid,p_storage_path text,p_category text,p_file_name text,p_mime_type text,p_bytes integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare r public.incident_reports; photo public.incident_report_photos;
begin
  select * into r from public.incident_reports where id=p_report_id for update;
  if not found or not public.is_active_incident_driver() or r.driver_id<>auth.uid() or r.status<>'draft'
    then raise exception 'Photos can only be added to your own draft'; end if;
  if p_storage_path is null or split_part(p_storage_path,'/',1)<>r.id::text
    or not exists(select 1 from storage.objects where bucket_id='incident-evidence' and name=p_storage_path)
    then raise exception 'The incident image has not been uploaded'; end if;
  if p_file_name is null or length(p_file_name) not between 1 and 255
    then raise exception 'Invalid photo filename'; end if;
  insert into public.incident_report_photos(report_id,storage_path,category,file_name,mime_type,file_bytes,uploaded_by)
    values(r.id,p_storage_path,p_category,p_file_name,p_mime_type,p_bytes,auth.uid())
    on conflict(storage_path) do nothing returning * into photo;
  if photo.id is null then
    select * into photo from public.incident_report_photos where storage_path=p_storage_path and report_id=r.id;
  end if;
  return to_jsonb(photo);
end $$;

create or replace function public.submit_incident_report(p_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare r public.incident_reports; field_name text;
begin
  select * into r from public.incident_reports where id=p_id for update;
  if not found or not public.is_active_incident_driver() or r.driver_id<>auth.uid()
    then raise exception 'This is not your incident report'; end if;
  -- Idempotent retry after a successful submission whose response was interrupted.
  if r.status='submitted' then return to_jsonb(r); end if;
  foreach field_name in array array['fullName','driverNumber','registration','make','model',
    'type','occurredAt','location','description','fault'] loop
    if nullif(btrim(r.details->>field_name),'') is null
      then raise exception 'Required incident field missing: %',field_name; end if;
  end loop;
  if r.details->>'type' not in ('Accident','Incident','Delay','Recovery')
    or r.details->>'fault' not in ('driver','other','shared','unknown')
    then raise exception 'Invalid incident type or fault assessment'; end if;
  perform (r.details->>'occurredAt')::timestamp;
  update public.incident_reports set status='submitted',submitted_at=now(),updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('incident-evidence','incident-evidence',false,10485760,
    array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists incident_storage_read on storage.objects;
create policy incident_storage_read on storage.objects for select to authenticated using(
  bucket_id='incident-evidence' and exists(
    select 1 from public.incident_report_photos p join public.incident_reports r on r.id=p.report_id
    where p.storage_path=name and (public.is_portal_admin()
      or (r.driver_id=auth.uid() and public.is_active_incident_driver()))));
drop policy if exists incident_storage_insert on storage.objects;
create policy incident_storage_insert on storage.objects for insert to authenticated with check(
  bucket_id='incident-evidence' and public.is_active_incident_driver()
  and exists(select 1 from public.incident_reports r
    where r.id::text=(storage.foldername(name))[1] and r.driver_id=auth.uid() and r.status='draft'));
-- Only remove unregistered uploads after a failed metadata write. Submitted
-- evidence and registered draft evidence cannot be deleted through the client.
drop policy if exists incident_storage_cleanup on storage.objects;
create policy incident_storage_cleanup on storage.objects for delete to authenticated using(
  bucket_id='incident-evidence' and public.is_active_incident_driver()
  and exists(select 1 from public.incident_reports r where r.id::text=(storage.foldername(name))[1]
    and r.driver_id=auth.uid() and r.status='draft')
  and not exists(select 1 from public.incident_report_photos p where p.storage_path=name));

revoke all on function public.is_active_incident_driver() from public,anon;
revoke all on function public.save_incident_report(uuid,jsonb,uuid) from public,anon;
revoke all on function public.register_incident_photo(uuid,text,text,text,text,integer) from public,anon;
revoke all on function public.submit_incident_report(uuid) from public,anon;
grant execute on function public.is_active_incident_driver() to authenticated;
grant execute on function public.save_incident_report(uuid,jsonb,uuid) to authenticated;
grant execute on function public.register_incident_photo(uuid,text,text,text,text,integer) to authenticated;
grant execute on function public.submit_incident_report(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
