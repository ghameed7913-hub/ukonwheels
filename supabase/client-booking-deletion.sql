-- Client Delete booking: retains evidence and Admin audit history, never hard-deletes.
-- Run in the existing portal Supabase SQL Editor after the booking security setup.
begin;
create schema if not exists ukow_cancellation_private;
revoke all on schema ukow_cancellation_private from public,anon,authenticated;
create table if not exists ukow_cancellation_private.writes(
 pid integer not null,xid bigint not null,booking_id uuid not null,
 primary key(pid,xid,booking_id)
);
revoke all on all tables in schema ukow_cancellation_private from public,anon,authenticated;

create or replace function ukow_cancellation_private.guard_booking()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if old.status='Cancelled' and new is distinct from old then
  raise exception 'Deleted bookings cannot be changed or reassigned' using errcode='42501';
 end if;
 if new.status='Cancelled' and old.status is distinct from new.status then
  if not exists(select 1 from ukow_cancellation_private.writes
   where pid=pg_backend_pid() and xid=txid_current() and booking_id=old.id) then
   raise exception 'Use the secure Client booking deletion process' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists ukow_guard_client_cancellation on public.bookings;
create trigger ukow_guard_client_cancellation before update on public.bookings
 for each row execute function ukow_cancellation_private.guard_booking();

-- Prevent stale shared snapshots from reviving a cancelled vehicle.
create or replace function ukow_cancellation_private.guard_shared()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare b jsonb;
begin
 if new.id='main' then
  for b in select x from jsonb_array_elements(coalesce(new.data->'bookings','[]')) x loop
   if exists(select 1 from public.bookings where reference=b->>'ref' and status='Cancelled')
    and (b->>'status' is distinct from 'Cancelled' or coalesce(b->>'driver','')<>''
     or nullif(b->>'_driverId','') is not null) then
    raise exception 'A deleted booking cannot be restored by an old screen. Refresh the portal.';
   end if;
  end loop;
 end if;
 return new;
end $$;
drop trigger if exists ukow_guard_shared_cancellation on public.app_store;
create trigger ukow_guard_shared_cancellation before insert or update on public.app_store
 for each row execute function ukow_cancellation_private.guard_shared();

create or replace function public.client_delete_booking(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; b public.bookings; source jsonb; stamp text; event jsonb;
begin
 select * into actor from public.profiles where id=auth.uid();
 if actor.id is null or actor.role<>'client' or lower(actor.status)<>'active' then
  raise exception 'An active Client account is required' using errcode='42501';
 end if;
 -- Match the approval process lock order. The row lock serializes against journey start.
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if b.id is null or not(coalesce(b.client_id=actor.id,false)
  or coalesce(b.created_by=actor.id,false)
  or (b.business_id is not null and public.is_business_member(b.business_id))) then
  raise exception 'This booking does not belong to your account' using errcode='42501';
 end if;
 if b.status='Cancelled' then
  return jsonb_build_object('reference',b.reference,'status','Cancelled');
 end if;
 if b.status not in ('New Booked Vehicle','Driver Assigned','Picked Up')
  or b.journey_started_at is not null or b.delivered_at is not null then
  raise exception 'This booking cannot be deleted after the vehicle is out for delivery or on route' using errcode='42501';
 end if;
 stamp:=to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF');
 event:=jsonb_build_object('title','Deleted by Client','text',
  coalesce(nullif(actor.full_name,''),nullif(actor.name,''),'Client')||' deleted this booking · '||stamp);
 insert into ukow_cancellation_private.writes values(pg_backend_pid(),txid_current(),b.id);
 update public.bookings set status='Cancelled',driver_id=null,updated_at=now() where id=b.id;
 insert into public.booking_events(booking_id,event_type,from_status,to_status,notes,created_by)
  values(b.id,'Client Deleted Booking',b.status,'Cancelled',event->>'text',actor.id);
 source:=jsonb_set(source,'{bookings}',coalesce((
  select jsonb_agg(case when x->>'ref'=b.reference then
   x||jsonb_build_object('status','Cancelled','driver','','_driverId',null,
    'deletedBy',actor.id,'deletedAt',stamp,'timeline',
    jsonb_build_array(event)||coalesce(x->'timeline','[]'::jsonb))
   else x end order by ord)
  from jsonb_array_elements(coalesce(source->'bookings','[]')) with ordinality rows(x,ord)
 ),'[]'::jsonb));
 update public.app_store set data=source,updated_at=now() where id='main';
 delete from ukow_cancellation_private.writes where pid=pg_backend_pid() and xid=txid_current() and booking_id=b.id;
 return jsonb_build_object('reference',b.reference,'status','Cancelled');
end $$;
revoke all on function ukow_cancellation_private.guard_booking() from public,anon,authenticated;
revoke all on function ukow_cancellation_private.guard_shared() from public,anon,authenticated;
revoke all on function public.client_delete_booking(uuid) from public,anon;
grant execute on function public.client_delete_booking(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
