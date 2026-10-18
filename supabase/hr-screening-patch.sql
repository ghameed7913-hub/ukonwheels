-- NON-DESTRUCTIVE. Separate private HR records; no portal sign-ins are created.
begin;
create sequence if not exists public.hr_employee_reference_seq;
create table if not exists public.hr_employee_records (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('HR-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.hr_employee_reference_seq')::text,6,'0')),
  data jsonb not null default '{}',
  checks jsonb not null default '{}',
  decision text not null default 'Draft' check(decision in ('Draft','Approved','Rejected')),
  decision_note text not null default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  version integer not null default 1,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.hr_employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employee_records(id),
  path text not null unique,
  name text not null,
  category text not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create or replace function public.hr_screening_access(p_write boolean default false)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid()
    and lower(p.status)='active' and p.role in ('admin','staff')
    and (public.is_portal_admin() or public.has_portal_permission('hr:manage')
      or (not p_write and public.has_portal_permission('hr:view'))))
$$;
alter table public.hr_employee_records enable row level security;
alter table public.hr_employee_documents enable row level security;
revoke all on public.hr_employee_records,public.hr_employee_documents from public,anon,authenticated;
grant select on public.hr_employee_records,public.hr_employee_documents to authenticated;
drop policy if exists hr_employee_read on public.hr_employee_records;
create policy hr_employee_read on public.hr_employee_records for select to authenticated
  using(public.hr_screening_access(false));
drop policy if exists hr_document_read on public.hr_employee_documents;
create policy hr_document_read on public.hr_employee_documents for select to authenticated
  using(public.hr_screening_access(false));

create or replace function public.save_hr_employee(p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  oldrow public.hr_employee_records; saved public.hr_employee_records;
  employee uuid; details jsonb; checklist jsonb:='{}'; item jsonb; k text;
  decision text; final_note text; oldversion integer; applicable boolean;
begin
  if not public.hr_screening_access(true) then raise exception 'Active HR management access required'; end if;
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>300000 then
    raise exception 'Invalid employee form'; end if;
  employee:=coalesce(nullif(p_input->>'id','')::uuid,gen_random_uuid());
  -- Serialize creates/retries as well as edits. A stale save never overwrites another reviewer.
  perform pg_advisory_xact_lock(hashtextextended(employee::text,0));
  select * into oldrow from public.hr_employee_records where id=employee for update;
  oldversion:=coalesce((p_input->>'version')::integer,0);
  if (oldrow.id is null and oldversion<>0) or
     (oldrow.id is not null and oldversion<>oldrow.version) then
    raise exception 'This employee record changed. Reload it before saving; your unsaved form has been kept.';
  end if;
  details:=p_input->'data';
  if jsonb_typeof(details) is distinct from 'object'
    or nullif(trim(details->>'firstName'),'') is null
    or nullif(trim(details->>'lastName'),'') is null
    or coalesce(details->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'First name, last name and a valid email are required'; end if;
  -- Whitelist fields; never store credentials or binary file data in the record.
  select coalesce(jsonb_object_agg(key,value),'{}') into details from jsonb_each(details)
    where key=any(array['firstName','middleName','lastName','email','phone','dateOfBirth',
      'currentAddress','postcode','addressHistory','emergencyName','emergencyPhone','emergencyAddress',
      'employmentHistory','employmentGaps','references','identityType','identityReference',
      'rightToWorkStatus','rightToWorkShareCode','rightToWorkExpiry','drivingLicenceNo',
      'licenceCategories','licenceExpiry','dvlaShareCode','dvlaCheckedOn','endorsements',
      'qualifications','dbsLevel','dbsReference','dbsCheckedOn','notes','portalUserId',
      'passportExpiry','visaExpiry','identityExpiry','dvlaExpiry','qualificationExpiry','safetyExpiry','dbsExpiry']);
  if exists(select 1 from jsonb_each(details) where jsonb_typeof(value) not in ('string','null')) then
    raise exception 'Employee fields must be text'; end if;
  if nullif(details->>'portalUserId','') is not null and not exists(
    select 1 from public.profiles where id=(details->>'portalUserId')::uuid and role in ('admin','staff','driver')) then
    raise exception 'Choose an existing internal portal user'; end if;
  decision:=coalesce(p_input->>'decision','Draft');
  for k in select unnest(array['identity','rightToWork','addressHistory','employmentHistory','references','dvla','qualifications','dbs']) loop
    item:=coalesce(p_input->'checks'->k,'{}');
    if jsonb_typeof(item)<>'object' then raise exception 'Invalid screening checklist'; end if;
    applicable:=coalesce((item->>'required')::boolean,k not in ('qualifications','dbs'));
    if coalesce(item->>'status','Pending') not in ('Pending','Passed','Failed') then
      raise exception 'Invalid screening check status'; end if;
    if ((not applicable and decision<>'Draft') or coalesce(item->>'status','Pending')<>'Pending') and nullif(trim(item->>'notes'),'') is null then
      raise exception 'Add review notes for completed or non-applicable checks'; end if;
    item:=jsonb_build_object('status',coalesce(item->>'status','Pending'),'required',applicable,'notes',coalesce(item->>'notes',''));
    if oldrow.checks->k is not null and item=(oldrow.checks->k)-'reviewedBy'-'reviewedAt' then
      item:=oldrow.checks->k;
    elsif item->>'status'<>'Pending' or (not applicable and nullif(trim(item->>'notes'),'') is not null) then
      item:=item||jsonb_build_object('reviewedBy',auth.uid(),'reviewedAt',now());
    end if;
    checklist:=jsonb_set(checklist,array[k],item);
  end loop;
  decision:=coalesce(p_input->>'decision','Draft');
  final_note:=coalesce(p_input->>'decisionNote','');
  if decision not in ('Draft','Approved','Rejected') then raise exception 'Invalid decision'; end if;
  if decision<>'Draft' and nullif(trim(final_note),'') is null then raise exception 'Final review notes are required'; end if;
  if decision='Approved' and exists(select 1 from jsonb_each(checklist)
    where (value->>'required')::boolean and value->>'status'<>'Passed') then
    raise exception 'Pass every applicable screening check before approval'; end if;
  insert into public.hr_employee_records(id,data,checks,decision,decision_note,reviewed_by,reviewed_at,created_by)
    values(employee,details,checklist,decision,final_note,
      case when decision<>'Draft' then auth.uid() end,case when decision<>'Draft' then now() end,auth.uid())
  on conflict(id) do update set data=excluded.data,checks=excluded.checks,decision=excluded.decision,
    decision_note=excluded.decision_note,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,
    version=hr_employee_records.version+1,updated_at=now()
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hr-screening','hr-screening',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists hr_screening_upload on storage.objects;
create policy hr_screening_upload on storage.objects for insert to authenticated
with check(bucket_id='hr-screening' and public.hr_screening_access(true)
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(png|jpg|webp|pdf)$'
  and exists(select 1 from public.hr_employee_records where id::text=split_part(name,'/',1) and decision='Draft'));
drop policy if exists hr_screening_download on storage.objects;
create policy hr_screening_download on storage.objects for select to authenticated
using(bucket_id='hr-screening' and public.hr_screening_access(false));

create or replace function public.register_hr_employee_document(p_employee_id uuid,p_path text,p_name text,p_category text,p_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare doc public.hr_employee_documents; doc_version integer;
begin
  if not public.hr_screening_access(true) then raise exception 'Active HR management access required'; end if;
  perform 1 from public.hr_employee_records where id=p_employee_id and decision='Draft' for update;
  if not found then raise exception 'Save a draft employee record before uploading documents'; end if;
  if not exists(select 1 from public.hr_employee_records where id=p_employee_id and version=p_version) then
    raise exception 'This employee record changed. Reload before adding documents. Your file has been kept.';
  end if;
  if p_path !~ ('^'||p_employee_id::text||'/[a-f0-9-]{36}\.(png|jpg|webp|pdf)$')
    or not exists(select 1 from storage.objects where bucket_id='hr-screening' and name=p_path)
    or nullif(trim(p_name),'') is null or length(p_name)>255
    or p_category not in ('Identity','Right to work','Address','Employment','Reference','DVLA','Qualification','DBS','Other') then
    raise exception 'Invalid uploaded HR document'; end if;
  insert into public.hr_employee_documents(employee_id,path,name,category,created_by)
    values(p_employee_id,p_path,p_name,p_category,auth.uid())
    on conflict(path) do update set path=excluded.path returning * into doc;
  -- Document changes invalidate a form already loaded for final review.
  update public.hr_employee_records set version=version+1,updated_at=now() where id=p_employee_id
    returning version into doc_version;
  return to_jsonb(doc)||jsonb_build_object('recordVersion',doc_version);
end;
$$;
revoke all on function public.hr_screening_access(boolean),public.save_hr_employee(jsonb),
  public.register_hr_employee_document(uuid,text,text,text,integer) from public,anon;
grant execute on function public.hr_screening_access(boolean),public.save_hr_employee(jsonb),
  public.register_hr_employee_document(uuid,text,text,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
