-- Run after pending-booking-approvals.sql and booking-change-security.sql.
-- Reviewing/resubmitting never changes the booking or approves a request.
begin;
create schema if not exists ukow_review_private;
revoke all on schema ukow_review_private from public,anon,authenticated;

create or replace function ukow_review_private.locked_review(p_request_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; source jsonb; req jsonb; cached jsonb;
 canonical public.bookings; latest jsonb;
begin
 select * into actor from public.profiles where id=auth.uid();
 if actor.id is null or actor.role is distinct from 'admin' or lower(actor.status) is distinct from 'active' then
  raise exception 'An active Admin account is required' using errcode='42501';
 end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select x into req from jsonb_array_elements(coalesce(source->'updateRequests','[]')) x
  where x->>'id'=p_request_id;
 if req is null or req->>'status' is distinct from 'Pending Approval' then
  raise exception 'This request is no longer pending. Refresh the list.';
 end if;
 select x into cached from jsonb_array_elements(coalesce(source->'bookings','[]')) x
  where x->>'ref'=req->>'bookingRef';
 select * into canonical from public.bookings where reference=req->>'bookingRef' for update;
 if canonical.id is null and (cached is null or nullif(cached->>'_normalizedId','') is not null) then
  raise exception 'Booking is unavailable. Contact Admin before changing this request.';
 end if;
 if canonical.id is not null then
  latest:=jsonb_build_object('status',canonical.status,'miles',coalesce(canonical.miles,0),
   'amount',coalesce(canonical.amount,0),'destination',canonical.destination_address);
 else
  latest:=jsonb_build_object('status',cached->>'status','miles',coalesce((cached->>'miles')::numeric,0),
   'amount',coalesce((cached->>'amount')::numeric,0),'destination',cached->>'destination');
 end if;
 if latest->>'status'='Cancelled' then
  raise exception 'This booking was deleted. It cannot be resubmitted or restored.';
 end if;
 return jsonb_build_object('request',req,'current',latest,
  'expected',jsonb_build_object('request',req,'current',latest));
end $$;
revoke all on function ukow_review_private.locked_review(text) from public,anon,authenticated;

create or replace function public.review_booking_update(p_request_id text)
returns jsonb language sql security definer set search_path=pg_catalog,public as $$
 select ukow_review_private.locked_review(p_request_id)
$$;
revoke all on function public.review_booking_update(text) from public,anon;
grant execute on function public.review_booking_update(text) to authenticated;

create or replace function public.resubmit_booking_update(
 p_request_id text,p_expected jsonb,p_changes jsonb
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare reviewed jsonb; req jsonb; latest jsonb; source jsonb; field text; value jsonb;
 replacement jsonb; stamp text;
begin
 reviewed:=ukow_review_private.locked_review(p_request_id);
 if p_expected is null or reviewed->'expected' is distinct from p_expected then
  raise exception 'The booking or request changed while you were reviewing. Click Review latest booking again.';
 end if;
 req:=reviewed->'request';latest:=reviewed->'current';
 if p_changes is null or jsonb_typeof(p_changes)<>'object' or p_changes='{}' then
  raise exception 'Select at least one requested change that is different from the latest booking.';
 end if;
 for field,value in select e.key,e.value from jsonb_each(p_changes) e loop
  if field not in ('amount','destination','miles','status')
   or not(coalesce(req->'changes','{}') ? field)
   or value is distinct from req->'changes'->field
   or value is not distinct from req->'previous'->field
   or value is not distinct from latest->field then
   raise exception 'Only the reviewed, outstanding requested changes can be resubmitted.';
  end if;
 end loop;
 if latest->>'status'='Delivered' and p_changes ? 'status'
  and p_changes->>'status'<>'Delivered' then
  raise exception 'A delivered booking cannot be moved back to an earlier status.';
 end if;
 stamp:=to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF');
 select data into source from public.app_store where id='main';
 -- Retain the old request and its original author. Do not approve or reject it.
 source:=jsonb_set(source,'{updateRequests}',(
  select jsonb_agg(case when x->>'id'=p_request_id then
   x||jsonb_build_object('status','Superseded','supersededById',auth.uid(),'supersededAt',stamp)
   else x end order by ord)
  from jsonb_array_elements(source->'updateRequests') with ordinality items(x,ord)
 ));
 update public.app_store set data=source,updated_at=now() where id='main';
 replacement:=public.request_booking_change(req->>'bookingRef',p_changes,
  coalesce(req->>'reason','')||' [Reviewed against latest booking]');
 replacement:=replacement->'request';
 replacement:=replacement||jsonb_build_object('reviewOfRequestIds',
  coalesce(replacement->'reviewOfRequestIds','[]'::jsonb)||jsonb_build_array(p_request_id));
 select data into source from public.app_store where id='main';
 source:=jsonb_set(source,'{updateRequests}',(
  select jsonb_agg(case
   when x->>'id'=p_request_id then x||jsonb_build_object('replacementRequestId',replacement->>'id')
   when x->>'id'=replacement->>'id' then replacement else x end order by ord)
  from jsonb_array_elements(source->'updateRequests') with ordinality items(x,ord)
 ));
 update public.app_store set data=source,updated_at=now() where id='main';
 return jsonb_build_object('request',replacement,'superseded_request_id',p_request_id);
end $$;
revoke all on function public.resubmit_booking_update(text,jsonb,jsonb) from public,anon;
grant execute on function public.resubmit_booking_update(text,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
