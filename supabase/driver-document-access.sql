-- NON-DESTRUCTIVE: requires the existing HR screening setup.
-- Run the ENTIRE file in Supabase SQL Editor as the project owner.
begin;

-- Do not silently replace another application's API security hook.
do $$
declare hook text;
begin
  select split_part(setting,'=',2) into hook
  from pg_roles r cross join lateral unnest(r.rolconfig) setting
  where r.rolname='authenticator' and setting like 'pgrst.db_pre_request=%';
  if coalesce(hook,'') not in ('','public.enforce_driver_document_access') then
    raise exception 'An API pre-request hook already exists (%). Stop and combine the guards before installing this patch.',hook;
  end if;
  if to_regclass('public.hr_employee_records') is null then
    raise exception 'Run the HR screening setup first';
  end if;
end $$;

-- HR is the only writer. Validate actual calendar dates, not just YYYY-MM-DD.
-- Stable account IDs prevent matching two employees by display name.
create or replace function public.validate_hr_driver_expiries()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare k text; v text; matched uuid;
begin
  foreach k in array array['licenceExpiry','passportExpiry','visaExpiry','rightToWorkExpiry',
    'identityExpiry','dvlaExpiry','qualificationExpiry','safetyExpiry','dbsExpiry'] loop
    v:=nullif(new.data->>k,'');
    if v is not null then
      if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(v::date,'YYYY-MM-DD')<>v then
        raise exception 'Invalid date for %; use YYYY-MM-DD',k;
      end if;
    end if;
  end loop;
  if nullif(new.data->>'portalUserId','') is null then
    select p.id into matched from public.profiles p
    where lower(trim(p.email))=lower(trim(new.data->>'email'))
      and p.role in ('driver','staff','admin');
    if matched is not null then
      new.data:=jsonb_set(new.data,'{portalUserId}',to_jsonb(matched::text));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists hr_driver_expiry_validation on public.hr_employee_records;
create trigger hr_driver_expiry_validation before insert or update on public.hr_employee_records
for each row execute function public.validate_hr_driver_expiries();

-- Link existing matching records now. No logins are created or activated.
update public.hr_employee_records h
set data=jsonb_set(h.data,'{portalUserId}',to_jsonb(p.id::text))
from public.profiles p
where nullif(h.data->>'portalUserId','') is null
  and lower(trim(h.data->>'email'))=lower(trim(p.email))
  and p.role in ('driver','staff','admin');

-- Preserve the established HR validation, version checks and manual review logic.
-- The wrapper supports installations whose original HR whitelist predates these fields.
do $$
begin
  if to_regprocedure('public.save_hr_employee_core(jsonb)') is null then
    alter function public.save_hr_employee(jsonb) rename to save_hr_employee_core;
  end if;
end $$;
revoke all on function public.save_hr_employee_core(jsonb) from public,anon,authenticated;
create or replace function public.save_hr_employee(p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare saved jsonb; extra jsonb; previous jsonb; final_row public.hr_employee_records;
begin
  if not public.hr_screening_access(true) then raise exception 'Active HR management access required'; end if;
  -- Older HR screens may omit the newer fields. Omission is not an HR renewal.
  -- The core save still enforces the submitted record version.
  select data into previous from public.hr_employee_records
    where id=nullif(p_input->>'id','')::uuid;
  select coalesce(jsonb_object_agg(key,value),'{}') into extra
    from jsonb_each(coalesce(previous,'{}')) where key=any(array[
      'passportExpiry','visaExpiry','identityExpiry','dvlaExpiry','qualificationExpiry','safetyExpiry','dbsExpiry']);
  p_input:=jsonb_set(p_input,'{data}',extra||coalesce(p_input->'data','{}'));
  saved:=public.save_hr_employee_core(p_input);
  select coalesce(jsonb_object_agg(key,value),'{}') into extra
  from jsonb_each(p_input->'data') where key=any(array[
    'passportExpiry','visaExpiry','identityExpiry','dvlaExpiry','qualificationExpiry','safetyExpiry','dbsExpiry']);
  if exists(select 1 from jsonb_each(extra) where jsonb_typeof(value) not in ('string','null')) then
    raise exception 'Expiry fields must be dates or empty';
  end if;
  update public.hr_employee_records set data=data||extra where id=(saved->>'id')::uuid
    returning * into final_row;
  return to_jsonb(final_row);
end $$;
revoke all on function public.save_hr_employee(jsonb) from public,anon;
grant execute on function public.save_hr_employee(jsonb) to authenticated;

-- No input ID: a Driver cannot inspect another employee's notices or HR data.
-- Multiple matched HR records are checked conservatively, not "latest wins".
create or replace function public.driver_document_status()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare p public.profiles; expired jsonb; today date:=(now() at time zone 'Europe/London')::date;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p.role<>'driver' then
    return jsonb_build_object('driver',false,'blocked',false,'expired','[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('key',x.key,'label',x.label,'date',x.expiry)
    order by x.expiry,x.key),'[]'::jsonb) into expired from (
    select distinct f.key,f.label,h.data->>f.key as expiry
    from public.hr_employee_records h cross join (values
      ('licenceExpiry','Driving licence'),('passportExpiry','Passport'),('visaExpiry','Visa'),
      ('rightToWorkExpiry','Right to work'),('identityExpiry','Identity document'),
      ('dvlaExpiry','DVLA check'),('qualificationExpiry','Qualification'),
      ('safetyExpiry','Safety certificate'),('dbsExpiry','DBS renewal')
    ) f(key,label)
    where (h.data->>'portalUserId'=p.id::text or
      (nullif(h.data->>'portalUserId','') is null and lower(trim(h.data->>'email'))=lower(trim(p.email))))
      and nullif(h.data->>f.key,'') is not null
      and (h.data->>f.key)::date<today
  ) x;
  return jsonb_build_object('driver',true,
    'blocked',exists(select 1 from jsonb_array_elements(expired) e
      where e->>'key' in ('licenceExpiry','passportExpiry','visaExpiry')),
    'expired',expired);
end $$;
revoke all on function public.driver_document_status() from public,anon;
grant execute on function public.driver_document_status() to authenticated;

-- This runs BEFORE every Data API call, including security-definer RPCs.
-- Expired Drivers cannot bypass the UI with a previously issued session token.
create or replace function public.enforce_driver_document_access()
returns void language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if auth.uid() is null then return; end if;
  if current_setting('request.path',true)='/rpc/driver_document_status' then return; end if;
  if (public.driver_document_status()->>'blocked')::boolean then
    raise exception 'Driver access blocked: provide renewed licence, passport or visa to HR. HR must update your employee record.'
      using errcode='42501';
  end if;
end $$;
revoke all on function public.enforce_driver_document_access() from public;
grant execute on function public.enforce_driver_document_access() to anon,authenticated;
alter role authenticator set pgrst.db_pre_request='public.enforce_driver_document_access';

-- Storage is a separate API: also deny new Driver storage access while blocked.
create or replace function public.driver_documents_allow_storage()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select case when auth.uid() is null then true
    else not (public.driver_document_status()->>'blocked')::boolean end
$$;
revoke all on function public.driver_documents_allow_storage() from public;
grant execute on function public.driver_documents_allow_storage() to anon,authenticated;
drop policy if exists driver_expiry_storage_guard on storage.objects;
create policy driver_expiry_storage_guard on storage.objects as restrictive
  for all to authenticated
  using(public.driver_documents_allow_storage())
  with check(public.driver_documents_allow_storage());
revoke all on function public.validate_hr_driver_expiries() from public,anon,authenticated;
notify pgrst,'reload schema';
notify pgrst,'reload config';
commit;
