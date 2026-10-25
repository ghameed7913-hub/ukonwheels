-- Run AFTER pending-booking-approvals.sql. Keeps existing bookings and photos.
begin;
create schema if not exists ukow_approval_private;
revoke all on schema ukow_approval_private from public,anon,authenticated;
create table if not exists ukow_approval_private.writes (
 pid integer not null, xid bigint not null, primary key(pid,xid)
);
create table if not exists ukow_approval_private.initial_writes (
 booking_id uuid primary key references public.bookings(id) on delete cascade,
 xid bigint not null
);
revoke all on all tables in schema ukow_approval_private from public,anon,authenticated;

-- Only the approved RPC can open a write context. A caller-set flag cannot bypass it.
do $$
begin
 if to_regprocedure('ukow_approval_private.approve_booking_updates(text[])') is null then
  if to_regprocedure('public.approve_booking_updates(text[])') is null then
   raise exception 'Run pending-booking-approvals.sql first';
  end if;
  alter function public.approve_booking_updates(text[]) set schema ukow_approval_private;
 end if;
end $$;
revoke all on function ukow_approval_private.approve_booking_updates(text[]) from public,anon,authenticated;
create or replace function public.approve_booking_updates(p_request_ids text[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and lower(status)='active') then
  raise exception 'An active Admin account is required' using errcode='42501';
 end if;
 insert into ukow_approval_private.writes values(pg_backend_pid(),txid_current());
 result:=ukow_approval_private.approve_booking_updates(p_request_ids);
 delete from ukow_approval_private.writes where pid=pg_backend_pid() and xid=txid_current();
 return result;
end $$;
revoke all on function public.approve_booking_updates(text[]) from public,anon;
grant execute on function public.approve_booking_updates(text[]) to authenticated;

create or replace function ukow_approval_private.guard_booking()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' then
  insert into ukow_approval_private.initial_writes values(new.id,txid_current());
  return new;
 end if;
 -- SQL Editor/service maintenance is not an app user or a Super Admin sign-in.
 if (session_user in ('postgres','supabase_admin') and current_setting('role',true) in ('none','postgres','supabase_admin'))
  or current_setting('role',true)='service_role' then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 if tg_op='DELETE' then raise exception 'Bookings cannot be removed to bypass approval'; end if;
 if new.amount is distinct from old.amount or new.destination_address is distinct from old.destination_address then
  if not exists(select 1 from ukow_approval_private.writes where pid=pg_backend_pid() and xid=txid_current())
   and not exists(select 1 from ukow_approval_private.initial_writes where booking_id=old.id and xid=txid_current()) then
   raise exception 'Amount and destination changes require Admin approval first' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists ukow_record_initial_booking on public.bookings;
create trigger ukow_record_initial_booking after insert on public.bookings
 for each row execute function ukow_approval_private.guard_booking();
drop trigger if exists ukow_protect_booking_changes on public.bookings;
create trigger ukow_protect_booking_changes before update or delete on public.bookings
 for each row execute function ukow_approval_private.guard_booking();

create or replace function ukow_approval_private.guard_shared_bookings()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare old_b jsonb; new_b jsonb; canonical public.bookings; old_approved jsonb; new_approved jsonb;
begin
 if (session_user in ('postgres','supabase_admin') and current_setting('role',true) in ('none','postgres','supabase_admin'))
  or current_setting('role',true)='service_role'
  or exists(select 1 from ukow_approval_private.writes where pid=pg_backend_pid() and xid=txid_current()) then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 if tg_op='DELETE' then raise exception 'Shared booking data cannot be removed to bypass approval'; end if;
 if tg_op='UPDATE' and new.id is distinct from old.id then raise exception 'Shared data identity cannot change'; end if;
 if new.id<>'main' then return new; end if;
 if (select count(*) from jsonb_array_elements(coalesce(new.data->'bookings','[]'))) <>
  (select count(distinct b->>'ref') from jsonb_array_elements(coalesce(new.data->'bookings','[]')) b) then
  raise exception 'Each booking reference must be unique';
 end if;
 for old_b in select b from jsonb_array_elements(coalesce(old.data->'bookings','[]')) b loop
  select b into new_b from jsonb_array_elements(coalesce(new.data->'bookings','[]')) b where b->>'ref'=old_b->>'ref';
  if new_b is null then raise exception 'Saved bookings cannot be removed to bypass approval'; end if;
  if new_b->'lastApprovedBy' is distinct from old_b->'lastApprovedBy'
   or new_b->'lastApprovedAt' is distinct from old_b->'lastApprovedAt' then
   raise exception 'Approval details can only be saved by the approval process';
  end if;
  select coalesce(jsonb_agg(h),'[]') into old_approved from jsonb_array_elements(coalesce(old_b->'approvalHistory','[]')) h where h->>'action'='Update Approved';
  select coalesce(jsonb_agg(h),'[]') into new_approved from jsonb_array_elements(coalesce(new_b->'approvalHistory','[]')) h where h->>'action'='Update Approved';
  if old_approved is distinct from new_approved then raise exception 'Saved approval history cannot be changed'; end if;
 end loop;
 for new_b in select b from jsonb_array_elements(coalesce(new.data->'bookings','[]')) b loop
  select b into old_b from jsonb_array_elements(coalesce(old.data->'bookings','[]')) b where b->>'ref'=new_b->>'ref';
  if old_b is null and (new_b ? 'lastApprovedBy' or new_b ? 'lastApprovedAt'
   or exists(select 1 from jsonb_array_elements(coalesce(new_b->'approvalHistory','[]')) h where h->>'action'='Update Approved')) then
   raise exception 'Approval details can only be saved by the approval process';
  end if;
  select * into canonical from public.bookings where reference=new_b->>'ref';
  if canonical.id is not null then
   if coalesce((new_b->>'amount')::numeric,0) is distinct from coalesce(canonical.amount,0)
    or coalesce(new_b->>'destination','') is distinct from coalesce(canonical.destination_address,'') then
    raise exception 'Amount and destination must match the approved booking';
   end if;
  else
   select b into old_b from jsonb_array_elements(coalesce(old.data->'bookings','[]')) b where b->>'ref'=new_b->>'ref';
   if old_b is not null and (new_b->'amount' is distinct from old_b->'amount' or new_b->'destination' is distinct from old_b->'destination') then
    raise exception 'Amount and destination changes require Admin approval first';
   end if;
  end if;
 end loop;
 select coalesce(jsonb_agg(r order by r->>'id'),'[]') into old_approved from jsonb_array_elements(coalesce(old.data->'updateRequests','[]')) r where r->>'status'='Approved';
 select coalesce(jsonb_agg(r order by r->>'id'),'[]') into new_approved from jsonb_array_elements(coalesce(new.data->'updateRequests','[]')) r where r->>'status'='Approved';
 if old_approved is distinct from new_approved then raise exception 'Booking changes must use the approval process'; end if;
 return new;
end $$;
drop trigger if exists ukow_protect_shared_booking_changes on public.app_store;
create trigger ukow_protect_shared_booking_changes before insert or update or delete on public.app_store
 for each row execute function ukow_approval_private.guard_shared_bookings();

create or replace function public.request_booking_change(p_reference text,p_changes jsonb,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; source jsonb; cached jsonb; canonical public.bookings;
 previous jsonb; proposed jsonb; request jsonb; saved_at text; actor_name text;
begin
 select * into actor from public.profiles where id=auth.uid();
 if actor.id is null or lower(actor.status)<>'active' or actor.role not in ('admin','staff') then
  raise exception 'Active Operations or Admin account required' using errcode='42501';
 end if;
 if actor.role<>'admin' and not (public.has_portal_permission('bookings:manage') or public.has_portal_permission('bookings:status')) then
  raise exception 'Booking management permission required' using errcode='42501';
 end if;
 if p_changes is null or jsonb_typeof(p_changes)<>'object' or p_changes='{}'
  or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('amount','destination','miles','status')) then
  raise exception 'Choose valid booking changes';
 end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select b into cached from jsonb_array_elements(coalesce(source->'bookings','[]')) b where b->>'ref'=p_reference;
 select * into canonical from public.bookings where reference=p_reference for update;
 if cached is null and canonical.id is null then raise exception 'Booking not found'; end if;
 if canonical.id is not null then
  previous:=jsonb_build_object('status',canonical.status,'miles',coalesce(canonical.miles,0),'amount',coalesce(canonical.amount,0),'destination',canonical.destination_address);
 else
  previous:=jsonb_build_object('status',cached->>'status','miles',coalesce((cached->>'miles')::numeric,0),'amount',coalesce((cached->>'amount')::numeric,0),'destination',cached->>'destination');
 end if;
 proposed:=previous||p_changes;
 if proposed=previous then raise exception 'No booking changes entered'; end if;
 if actor.role<>'admin' and public.has_portal_permission('portal:configured') and exists(
  select 1 from jsonb_each(p_changes) e where e.value is distinct from previous->e.key
   and not public.has_portal_permission('portal:'||e.key)
 ) then raise exception 'Permission for this booking field is required' using errcode='42501'; end if;
 if actor.role<>'admin' and (proposed->'amount' is distinct from previous->'amount' or proposed->'destination' is distinct from previous->'destination')
  and not public.has_portal_permission('bookings:manage') then
  raise exception 'Booking management permission required' using errcode='42501';
 end if;
 if jsonb_typeof(proposed->'amount') is distinct from 'number' or jsonb_typeof(proposed->'miles') is distinct from 'number'
  or (proposed->>'amount')::numeric<0 or (proposed->>'miles')::numeric<0
  or jsonb_typeof(proposed->'destination') is distinct from 'string' or nullif(btrim(proposed->>'destination'),'') is null
  or proposed->>'status' is null or proposed->>'status' not in
   ('New Booked Vehicle','Driver Assigned','Picked Up','On Route','Delayed','Accident','Claims','Delivered','Fault On Route','Assigned AA on Route') then
  raise exception 'Enter a valid amount, miles, status and destination';
 end if;
 if cached is null then
  cached:=jsonb_build_object('ref',canonical.reference,'_normalizedId',canonical.id)||previous;
  source:=jsonb_set(source,'{bookings}',coalesce(source->'bookings','[]')||jsonb_build_array(cached));
 end if;
 -- Return an identical still-pending request on retry, rather than creating duplicates.
 select r into request from jsonb_array_elements(coalesce(source->'updateRequests','[]')) r
  where r->>'bookingRef'=p_reference and r->>'requestedById'=actor.id::text
   and r->>'status'='Pending Approval' and r->'changes'=proposed and r->'previous'=previous limit 1;
 if request is not null then return jsonb_build_object('request',request); end if;
 actor_name:=coalesce(nullif(actor.full_name,''),nullif(actor.name,''),'Operations');
 saved_at:=to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF');
 request:=jsonb_build_object('id','UPD-'||gen_random_uuid()::text,'bookingRef',p_reference,
  'requestedBy',actor_name,'requestedById',actor.id,'requestedRole',initcap(actor.role),
  'requestedAt',saved_at,'changes',proposed,'previous',previous,'reason',coalesce(p_reason,''),'status','Pending Approval');
 source:=jsonb_set(source,'{updateRequests}',coalesce(source->'updateRequests','[]')||jsonb_build_array(request));
 source:=jsonb_set(source,'{notifications}',jsonb_build_array(jsonb_build_object('title','Update Approval Required','text',p_reference||' update requested by '||actor_name))||coalesce(source->'notifications','[]'));
 update public.app_store set data=source,updated_at=now() where id='main';
 return jsonb_build_object('request',request);
end $$;
revoke all on function public.request_booking_change(text,jsonb,text) from public,anon;
grant execute on function public.request_booking_change(text,jsonb,text) to authenticated;
revoke all on all functions in schema ukow_approval_private from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
