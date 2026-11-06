-- Image-only retention. Installation is non-destructive and DISABLED by default.
-- Requires the existing bookings, booking_evidence and HR screening setup.
begin;
create schema if not exists ukow_retention_private;
revoke all on schema ukow_retention_private from public,anon,authenticated;
create table if not exists ukow_retention_private.settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 preview_by uuid, preview_at timestamptz, last_run_at timestamptz,
 last_error boolean not null default false
);
insert into ukow_retention_private.settings(id) values(true) on conflict do nothing;
create table if not exists ukow_retention_private.rules (
 kind text not null check(kind in ('delivery','employee')), owner_id uuid not null,
 left_on date, held boolean not null default false, updated_by uuid, updated_at timestamptz default now(),
 primary key(kind,owner_id)
);
create table if not exists ukow_retention_private.jobs (
 kind text not null, source_id uuid not null, owner_id uuid not null,
 bucket text not null, path text not null, object_id uuid not null,
 token uuid not null default gen_random_uuid(), lease_until timestamptz not null,
 retry_after timestamptz not null default now(),
 primary key(kind,source_id)
);
create table if not exists ukow_retention_private.audit (
 id bigint generated always as identity primary key, at timestamptz not null default now(),
 action text not null, kind text, actor uuid, image_count integer not null default 0
);
alter table ukow_retention_private.settings enable row level security;
alter table ukow_retention_private.rules enable row level security;
alter table ukow_retention_private.jobs enable row level security;
alter table ukow_retention_private.audit enable row level security;
revoke all on all tables in schema ukow_retention_private from public,anon,authenticated;

create or replace view ukow_retention_private.candidates as
 select 'delivery'::text kind,e.id source_id,b.id owner_id,'booking-evidence'::text bucket,
 e.storage_path path,o.id object_id,b.reference label,
 b.delivered_at+interval '90 days' due_at,coalesce(r.held,false) held
 from public.booking_evidence e join public.bookings b on b.id=e.booking_id
 join storage.objects o on o.bucket_id='booking-evidence' and o.name=e.storage_path
 left join ukow_retention_private.rules r on r.kind='delivery' and r.owner_id=b.id
 where b.status='Delivered' and b.delivered_at is not null
 and e.evidence_type in ('pickup','delivery')
 and coalesce(e.label,'') !~* '(signature|receipt|invoice|payment|payroll)'
 and lower(coalesce(o.metadata->>'mimetype','')) in ('image/jpeg','image/png','image/webp')
 and e.storage_path like b.id::text||'/%'
 and not exists(select 1 from public.booking_evidence other
   where other.storage_path=e.storage_path and other.id<>e.id)
 union all
 select 'employee',d.id,h.id,'hr-screening',d.path,o.id,h.reference,
 ((r.left_on+interval '5 years') at time zone 'Europe/London'),r.held
 from public.hr_employee_documents d join public.hr_employee_records h on h.id=d.employee_id
 join ukow_retention_private.rules r on r.kind='employee' and r.owner_id=h.id
 join storage.objects o on o.bucket_id='hr-screening' and o.name=d.path
 where r.left_on is not null and r.left_on<=(now() at time zone 'Europe/London')::date
 and lower(coalesce(o.metadata->>'mimetype','')) in ('image/jpeg','image/png','image/webp')
 and d.category in ('Identity','Right to work','Address','Reference','DVLA','Qualification','DBS')
 and d.name !~* '(signature|receipt|invoice|payment|payroll|payslip)'
 and d.path like h.id::text||'/%'
 union all
 select 'employee',o.id,h.id,o.bucket_id,o.name,o.id,h.reference,
 ((r.left_on+interval '5 years') at time zone 'Europe/London'),r.held
 from public.hr_employee_records h
 join ukow_retention_private.rules r on r.kind='employee' and r.owner_id=h.id
 join public.driver_identities di on di.user_id::text=h.data->>'portalUserId'
 join storage.objects o on
   (o.bucket_id='driver-portraits' and o.name in (di.photo_path,di.card_photo_path))
   or (o.bucket_id='driver-company-ids' and o.name=di.company_id_path)
 where r.left_on is not null and r.left_on<=(now() at time zone 'Europe/London')::date
 and not exists(select 1 from public.hr_employee_records other
   where other.id<>h.id and other.data->>'portalUserId'=h.data->>'portalUserId')
 and lower(coalesce(o.metadata->>'mimetype','')) in ('image/jpeg','image/png','image/webp')
 and o.name like di.user_id::text||'/%';
revoke all on ukow_retention_private.candidates from public,anon,authenticated;

create or replace function public.manage_image_retention(p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare cfg ukow_retention_private.settings; k text; owner uuid; departure date; result jsonb;
begin
 if not public.is_portal_admin() or not exists(select 1 from public.profiles
   where id=auth.uid() and lower(status)='active') then
   raise exception 'Active Admin access required' using errcode='42501';
 end if;
 select * into cfg from ukow_retention_private.settings where id for update;
 if p_action in ('rule','enable','pause') and exists(select 1 from ukow_retention_private.jobs where lease_until>now()) then
   raise exception 'Cleanup is processing an image. Wait two minutes and retry.';
 end if;
 if p_action='rule' then
   k:=p_data->>'kind'; owner:=(p_data->>'owner_id')::uuid;
   if k='employee' then
     if not exists(select 1 from public.hr_employee_records where id=owner) then raise exception 'Employee not found'; end if;
     departure:=nullif(p_data->>'left_on','')::date;
     if departure>(now() at time zone 'Europe/London')::date then raise exception 'Leaving date cannot be in the future'; end if;
   elsif k='delivery' then
     if (select count(*) from public.bookings where reference=p_data->>'reference')<>1 then
       raise exception 'Enter a unique, exact booking reference';
     end if;
     select id into owner from public.bookings where reference=p_data->>'reference';
     if owner is null then raise exception 'Booking reference not found'; end if;
   else raise exception 'Invalid record type'; end if;
   insert into ukow_retention_private.rules(kind,owner_id,left_on,held,updated_by)
    values(k,owner,departure,coalesce((p_data->>'held')::boolean,false),auth.uid())
    on conflict(kind,owner_id) do update set left_on=excluded.left_on,held=excluded.held,
      updated_by=excluded.updated_by,updated_at=now();
   update ukow_retention_private.settings set preview_at=null where id;
   insert into ukow_retention_private.audit(action,kind,actor) values('rule changed',k,auth.uid());
 elsif p_action='preview' then
   update ukow_retention_private.settings set preview_by=auth.uid(),preview_at=now() where id;
 elsif p_action='enable' then
   if cfg.preview_by is distinct from auth.uid() or cfg.preview_at is null or cfg.preview_at<now()-interval '10 minutes'
     or p_data->>'confirmation' is distinct from 'DELETE ELIGIBLE IMAGES' then
     raise exception 'Preview first, then confirm permanent image deletion within ten minutes';
   end if;
   update ukow_retention_private.settings set enabled=true where id;
   insert into ukow_retention_private.audit(action,actor) values('enabled',auth.uid());
 elsif p_action='pause' then
   update ukow_retention_private.settings set enabled=false where id;
   insert into ukow_retention_private.audit(action,actor) values('paused',auth.uid());
 elsif p_action<>'status' then raise exception 'Unknown retention action';
 end if;
 select jsonb_build_object(
   'enabled',s.enabled,'last_run_at',s.last_run_at,'last_error',s.last_error,
   'eligible',(select count(*) from ukow_retention_private.candidates where due_at<=now() and not held),
   'held',(select count(*) from ukow_retention_private.candidates where due_at<=now() and held),
   'preview',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
     (select kind,label,due_at,held,count(*) images from ukow_retention_private.candidates
       where due_at<=now() group by kind,label,due_at,held order by due_at limit 100) x),
   'employees',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
     (select h.id,h.reference,concat_ws(' ',h.data->>'firstName',h.data->>'lastName') name,
       r.left_on,coalesce(r.held,false) held from public.hr_employee_records h
       left join ukow_retention_private.rules r on r.kind='employee' and r.owner_id=h.id order by h.reference) x),
   'deleted_images',(select coalesce(sum(image_count),0) from ukow_retention_private.audit where action='image deleted')
 ) into result from ukow_retention_private.settings s where s.id;
 return result;
end $$;

-- Service worker only: every claim rechecks the current cutoff, hold and MIME.
create or replace function public.image_retention_worker(p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare c record; j ukow_retention_private.jobs; cfg ukow_retention_private.settings;
begin
 select * into cfg from ukow_retention_private.settings where id for update;
 if p_action='claim' then
   update ukow_retention_private.settings set last_run_at=now() where id;
   if not cfg.enabled then return jsonb_build_object('disabled',true); end if;
   -- Recover a timeout even if Storage succeeded before the worker lost contact.
   select * into j from ukow_retention_private.jobs where lease_until<=now() and retry_after<=now()
     order by lease_until for update skip locked limit 1;
   if found then
     if exists(select 1 from ukow_retention_private.rules r
       where r.kind=j.kind and r.owner_id=j.owner_id and r.held)
       or (j.kind='delivery' and not exists(select 1 from public.bookings b
         join public.booking_evidence e on e.booking_id=b.id
         where b.id=j.owner_id and e.id=j.source_id and e.storage_path=j.path
           and b.status='Delivered' and b.delivered_at<=now()-interval '90 days'))
       or (j.kind='employee' and not exists(select 1 from ukow_retention_private.rules r
         where r.kind='employee' and r.owner_id=j.owner_id
           and (r.left_on+interval '5 years') at time zone 'Europe/London'<=now()))
       or (j.bucket='hr-screening' and not exists(select 1 from public.hr_employee_documents d
         where d.id=j.source_id and d.employee_id=j.owner_id and d.path=j.path))
       or exists(select 1 from storage.objects o where o.bucket_id=j.bucket and o.name=j.path
         and (o.id<>j.object_id or lower(coalesce(o.metadata->>'mimetype','')) not in ('image/jpeg','image/png','image/webp')))
     then
       delete from ukow_retention_private.jobs where token=j.token;
       return jsonb_build_object('skipped',true);
     end if;
     update ukow_retention_private.jobs set token=gen_random_uuid(),lease_until=now()+interval '2 minutes'
       where kind=j.kind and source_id=j.source_id returning * into j;
     return to_jsonb(j);
   end if;
   select x.* into c from ukow_retention_private.candidates x
    where x.due_at<=now() and not x.held and not exists(
      select 1 from ukow_retention_private.jobs q where q.kind=x.kind
       and q.source_id=x.source_id)
    order by x.due_at,x.source_id limit 1;
   if not found then return '{}'::jsonb; end if;
   insert into ukow_retention_private.jobs(kind,source_id,owner_id,bucket,path,object_id,lease_until)
    values(c.kind,c.source_id,c.owner_id,c.bucket,c.path,c.object_id,now()+interval '2 minutes')
    on conflict(kind,source_id) do update set token=gen_random_uuid(),lease_until=excluded.lease_until,
      object_id=excluded.object_id,path=excluded.path,bucket=excluded.bucket
    returning * into j;
   return to_jsonb(j);
 elsif p_action in ('complete','failed') then
   select * into j from ukow_retention_private.jobs where token=(p_data->>'token')::uuid for update;
   if not found then raise exception 'Unknown image claim'; end if;
   if p_action='complete' then
     if j.lease_until<=now() then raise exception 'Image claim expired'; end if;
     -- Storage API must have deleted the bytes first; never delete storage.objects using SQL.
     if exists(select 1 from storage.objects where bucket_id=j.bucket and name=j.path) then
       raise exception 'Image still exists in Storage; metadata was not deleted';
     end if;
     delete from ukow_retention_private.jobs where token=j.token;
     if j.kind='delivery' then
       delete from public.booking_evidence where id=j.source_id and storage_path=j.path;
     elsif j.bucket='hr-screening' then
       delete from public.hr_employee_documents where id=j.source_id and path=j.path;
     else
       update public.driver_identities set
         photo_path=case when j.bucket='driver-portraits' and photo_path=j.path then null else photo_path end,
         card_photo_path=case when j.bucket='driver-portraits' and card_photo_path=j.path then null else card_photo_path end,
         company_id_path=case when j.bucket='driver-company-ids' and company_id_path=j.path then null else company_id_path end,
         version=version+1
       where (j.bucket='driver-portraits' and (photo_path=j.path or card_photo_path=j.path))
         or (j.bucket='driver-company-ids' and company_id_path=j.path);
     end if;
     insert into ukow_retention_private.audit(action,kind,image_count) values('image deleted',j.kind,1);
   else
     update ukow_retention_private.settings set last_error=true where id;
     -- Back off this image; the next run retries it.
     update ukow_retention_private.jobs set lease_until=now(),retry_after=now()+interval '1 hour' where token=j.token;
   end if;
   return jsonb_build_object('ok',true);
 else raise exception 'Unknown worker action'; end if;
end $$;
-- Keep eligibility and file identity stable while a bounded Storage request runs.
create or replace function ukow_retention_private.guard_parent()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from ukow_retention_private.jobs j where j.lease_until>now() and
   ((tg_table_name='bookings' and j.kind='delivery' and j.owner_id=old.id)
    or (tg_table_name='hr_employee_records' and j.kind='employee' and j.owner_id=old.id)
    or (tg_table_name='booking_evidence' and j.kind='delivery' and j.source_id=old.id)
    or (tg_table_name='hr_employee_documents' and j.kind='employee' and j.source_id=old.id))) then
   raise exception 'An image is being removed. Wait two minutes and retry.';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists ukow_retention_lock on public.bookings;
create trigger ukow_retention_lock before update or delete on public.bookings
for each row execute function ukow_retention_private.guard_parent();
drop trigger if exists ukow_retention_lock on public.hr_employee_records;
create trigger ukow_retention_lock before update or delete on public.hr_employee_records
for each row execute function ukow_retention_private.guard_parent();
drop trigger if exists ukow_retention_lock on public.booking_evidence;
create trigger ukow_retention_lock before update or delete on public.booking_evidence
for each row execute function ukow_retention_private.guard_parent();
drop trigger if exists ukow_retention_lock on public.hr_employee_documents;
create trigger ukow_retention_lock before update or delete on public.hr_employee_documents
for each row execute function ukow_retention_private.guard_parent();
create or replace function ukow_retention_private.guard_storage()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from ukow_retention_private.jobs j where j.lease_until>now()
   and j.bucket=new.bucket_id and j.path=new.name) then
   raise exception 'This image is being removed; it cannot be replaced now.';
 end if;
 return new;
end $$;
drop trigger if exists ukow_retention_lock on storage.objects;
create trigger ukow_retention_lock before insert or update on storage.objects
for each row execute function ukow_retention_private.guard_storage();
revoke all on all functions in schema ukow_retention_private from public,anon,authenticated;
revoke all on function public.manage_image_retention(text,jsonb),public.image_retention_worker(text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_image_retention(text,jsonb) to authenticated;
grant execute on function public.image_retention_worker(text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
