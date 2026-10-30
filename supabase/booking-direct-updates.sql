-- Replace booking-change approvals with immediate, permission-checked saves.
-- Existing requests/history remain untouched and are never automatically applied.
begin;

create or replace function ukow_approval_private.direct_booking_values(b public.bookings)
returns jsonb language sql immutable strict set search_path=pg_catalog,public as $$
 select jsonb_build_object(
  'status',b.status,'miles',coalesce(b.miles,0),'amount',coalesce(b.amount,0),
  'destination',coalesce(b.destination_address,''),'vehicle',coalesce(nullif(concat_ws(' ',b.vehicle_make,b.vehicle_model),''),'Vehicle'),
  'reg',coalesce(b.vehicle_registration,''),'pickup',coalesce(b.pickup_address,''),
  'service',coalesce(b.service_type,'Vehicle Delivery'),'bookingDate',coalesce(b.booking_date::text,''),
  'deliveryDate',coalesce(b.requested_delivery_date::text,''),'receiver',coalesce(b.receiver_name,''),
  'receiverMobile',coalesce(b.receiver_mobile,''),'paymentStatus',coalesce(b.payment_status,'Pending'))
$$;
revoke all on function ukow_approval_private.direct_booking_values(public.bookings) from public,anon,authenticated;

create or replace function public.save_booking_changes(
 p_reference text,p_changes jsonb,p_expected jsonb,p_reason text default ''
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; source jsonb; cached jsonb; canonical public.bookings;
 previous jsonb; saved jsonb; k text; v jsonb; stamp text; actor_name text; event jsonb;
begin
 select * into actor from public.profiles where id=auth.uid();
 if actor.id is null or (actor.role is distinct from 'admin' and actor.role is distinct from 'staff') or lower(actor.status) is distinct from 'active' then
  raise exception 'An active Admin or authorized Operations account is required' using errcode='42501';
 end if;
 if p_changes is null or jsonb_typeof(p_changes)<>'object' or p_changes='{}'
  or exists(select 1 from jsonb_object_keys(p_changes) x where x not in
   ('status','miles','amount','destination','vehicle','reg','pickup','service','bookingDate','deliveryDate','receiver','receiverMobile','paymentStatus')) then
  raise exception 'Choose valid booking changes';
 end if;
 for k,v in select e.key,e.value from jsonb_each(p_changes) e loop
  if actor.role='staff' and (
   not public.has_portal_permission(case when k='status' then 'bookings:status' else 'bookings:manage' end)
   or (k in ('status','miles','amount','destination') and public.has_portal_permission('portal:configured')
    and not public.has_portal_permission('portal:'||k))) then
   raise exception 'You do not have permission to change this booking field' using errcode='42501';
  end if;
  if k in ('amount','miles') then
   if jsonb_typeof(v) is distinct from 'number' or (v::text)::numeric<0 then raise exception 'Enter a valid non-negative amount and mileage'; end if;
  elsif jsonb_typeof(v) is distinct from 'string' then
   raise exception 'Enter valid booking details';
  end if;
  if k in ('destination','vehicle','reg','pickup') and nullif(btrim(v#>>'{}'),'') is null then
   raise exception 'Vehicle, registration, collection and delivery address cannot be blank';
  end if;
 end loop;
 if p_changes ? 'status' and p_changes->>'status' not in
  ('New Booked Vehicle','Driver Assigned','Picked Up','On Route','Delayed','Accident','Claims','Delivered','Fault On Route','Assigned AA on Route') then
  raise exception 'Choose a valid vehicle status';
 end if;
 if p_changes ? 'paymentStatus' and p_changes->>'paymentStatus' not in ('Pending','Paid') then raise exception 'Choose a valid payment status'; end if;
 if p_expected is null or jsonb_typeof(p_expected)<>'object' then raise exception 'Refresh the booking before saving'; end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select x into cached from jsonb_array_elements(coalesce(source->'bookings','[]')) x where x->>'ref'=p_reference;
 select * into canonical from public.bookings where reference=p_reference for update;
 if canonical.id is null and (cached is null or nullif(cached->>'_normalizedId','') is not null) then raise exception 'Booking is unavailable. Refresh the portal.'; end if;
 if canonical.id is not null then previous:=ukow_approval_private.direct_booking_values(canonical);
 else
  previous:=cached||jsonb_build_object('miles',coalesce((cached->>'miles')::numeric,0),'amount',coalesce((cached->>'amount')::numeric,0));
 end if;
 if previous->>'status'='Cancelled' then raise exception 'A deleted booking cannot be changed or restored'; end if;
 for k in select jsonb_object_keys(p_changes) loop
  if not(p_expected ? k) or coalesce(previous->k,'""'::jsonb) is distinct from p_expected->k then
   raise exception 'This booking field changed while you were editing. Refresh it before saving.';
  end if;
 end loop;
 saved:=previous||p_changes;
 if saved=previous then raise exception 'No booking changes entered'; end if;
 if (previous->>'status'='Delivered' or canonical.delivered_at is not null
  or nullif(cached->>'_deliveredAt','') is not null) and saved->>'status'<>'Delivered' then
  raise exception 'A delivered booking cannot be moved back to an earlier status';
 end if;
 -- Only this validated server function may open the protected write context.
 insert into ukow_approval_private.writes values(pg_backend_pid(),txid_current());
 if canonical.id is not null then
  if exists(select 1 from jsonb_object_keys(p_changes) x where x<>'status') then
   canonical:=public.admin_update_booking_details(
    p_booking_id=>canonical.id,p_miles=>(p_changes->>'miles')::numeric,p_amount=>(p_changes->>'amount')::numeric,
    p_destination_address=>p_changes->>'destination',p_vehicle_make=>p_changes->>'vehicle',
    p_vehicle_registration=>p_changes->>'reg',p_pickup_address=>p_changes->>'pickup',p_service_type=>p_changes->>'service',
    p_booking_date=>nullif(p_changes->>'bookingDate','')::date,p_requested_delivery_date=>nullif(p_changes->>'deliveryDate','')::date,
    p_receiver_name=>p_changes->>'receiver',p_receiver_mobile=>p_changes->>'receiverMobile',p_payment_status=>p_changes->>'paymentStatus');
   if p_changes ? 'vehicle' then
    update public.bookings set vehicle_model=null where id=canonical.id returning * into canonical;
   end if;
  end if;
  if canonical.status is distinct from saved->>'status' then
   canonical:=public.update_booking_status(canonical.id,saved->>'status',nullif(p_reason,''),null,null,null);
  end if;
  saved:=ukow_approval_private.direct_booking_values(canonical)||jsonb_build_object(
   '_normalizedId',canonical.id,'_journeyStartedAt',canonical.journey_started_at,'_deliveredAt',canonical.delivered_at);
 end if;
 stamp:=to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF');
 actor_name:=coalesce(nullif(actor.full_name,''),nullif(actor.name,''),'Portal user');
 event:=jsonb_build_object('title','Booking Updated','text',actor_name||' · '||coalesce(nullif(p_reason,''),'Booking details saved')||' · '||stamp,
  'changedById',actor.id,'changedAt',stamp,'before',previous,'changes',p_changes);
 select data into source from public.app_store where id='main';
 select x into cached from jsonb_array_elements(coalesce(source->'bookings','[]')) x where x->>'ref'=p_reference;
 cached:=coalesce(cached,'{}'::jsonb)||saved||jsonb_build_object('ref',p_reference,
  'lastUpdatedBy',actor_name,'lastUpdatedAt',stamp,'timeline',jsonb_build_array(event)||coalesce(cached->'timeline','[]'::jsonb));
 source:=jsonb_set(source,'{bookings}',case when exists(
  select 1 from jsonb_array_elements(coalesce(source->'bookings','[]')) x where x->>'ref'=p_reference)
  then (select jsonb_agg(case when x->>'ref'=p_reference then cached else x end order by ord)
   from jsonb_array_elements(source->'bookings') with ordinality items(x,ord))
  else coalesce(source->'bookings','[]'::jsonb)||jsonb_build_array(cached) end);
 update public.app_store set data=source,updated_at=now() where id='main';
 delete from ukow_approval_private.writes where pid=pg_backend_pid() and xid=txid_current();
 return jsonb_build_object('booking',cached,'saved',true);
end $$;
revoke all on function public.save_booking_changes(text,jsonb,jsonb,text) from public,anon;
grant execute on function public.save_booking_changes(text,jsonb,jsonb,text) to authenticated;

-- Old screens cannot submit or apply any outstanding proposal after removal.
revoke all on function public.request_booking_change(text,jsonb,text) from public,anon,authenticated;
revoke all on function public.approve_booking_updates(text[]) from public,anon,authenticated;
do $$ declare f text; begin
 foreach f in array array['public.review_booking_update(text)','public.resubmit_booking_update(text,jsonb,jsonb)'] loop
  if to_regprocedure(f) is not null then execute 'revoke all on function '||f||' from public,anon,authenticated'; end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
