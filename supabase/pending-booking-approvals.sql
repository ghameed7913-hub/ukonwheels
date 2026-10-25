-- Admin bulk approval. Run once in the existing portal's Supabase SQL Editor.
-- Safe to rerun; no saved bookings, photos or approval requests are deleted.
begin;
create or replace function public.approve_booking_updates(p_request_ids text[])
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public as $$
declare
 actor public.profiles; source jsonb; req jsonb; cached jsonb; proposed jsonb;
 saved public.bookings; canonical public.bookings; previous jsonb;
 request_id text; refs text[]:=array[]::text[];
 result_requests jsonb:='[]'; result_bookings jsonb:='[]'; notices jsonb:='[]';
 approved integer:=0; already integer:=0; approved_at text;
 approver text; history jsonb; final_request jsonb; event jsonb;
begin
 select * into actor from public.profiles where id=auth.uid();
 if actor.id is null or actor.role<>'admin' or lower(actor.status)<>'active' then
  raise exception 'An active Admin account is required' using errcode='42501';
 end if;
 if p_request_ids is null or cardinality(p_request_ids)<1
  or exists(select 1 from unnest(p_request_ids) id where id is null or btrim(id)='') then
  raise exception 'Select at least one pending approval request' using errcode='22023';
 end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 approver:=coalesce(nullif(actor.full_name,''),nullif(actor.name,''),'Admin');
 approved_at:=to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF');
 for request_id in select distinct id from unnest(p_request_ids) id order by id loop
  select x into req from jsonb_array_elements(coalesce(source->'updateRequests','[]')) x where x->>'id'=request_id;
  if req is null then raise exception 'Approval request % was not found. Refresh the list.',request_id; end if;
  select x into cached from jsonb_array_elements(coalesce(source->'bookings','[]')) x where x->>'ref'=req->>'bookingRef';
  if cached is null then raise exception 'Booking % was not found',req->>'bookingRef'; end if;
  if req->>'status'='Approved' then
   already:=already+1;
   result_requests:=result_requests||jsonb_build_array(req);
   result_bookings:=result_bookings||jsonb_build_array(cached);
   continue;
  end if;
  if req->>'status' is distinct from 'Pending Approval' then
   raise exception 'Request % is no longer pending. Refresh the list.',request_id;
  end if;
  if (req->>'bookingRef')=any(refs) then
   raise exception 'Select only one update per booking (%). Review the other request separately.',req->>'bookingRef';
  end if;
  refs:=array_append(refs,req->>'bookingRef');
  proposed:=req->'changes'; previous:=req->'previous';
  if proposed->>'status' is null or proposed->>'status' not in
   ('New Booked Vehicle','Driver Assigned','Picked Up','On Route','Delayed','Accident','Claims','Delivered','Fault On Route','Assigned AA on Route')
   or jsonb_typeof(proposed->'miles') is distinct from 'number'
   or jsonb_typeof(proposed->'amount') is distinct from 'number'
   or (proposed->>'miles')::numeric<0 or (proposed->>'amount')::numeric<0
   or nullif(btrim(proposed->>'destination'),'') is null then
   raise exception 'Request % has invalid status, miles, amount or destination',request_id using errcode='22023';
  end if;
  select * into canonical from public.bookings where reference=req->>'bookingRef' for update;
  if canonical.id is null and nullif(cached->>'_normalizedId','') is not null then
   raise exception 'Saved booking % is unavailable. Refresh the list.',req->>'bookingRef';
  end if;
  -- Reject stale proposals, including a Driver progressing the job after a request.
  if canonical.id is not null then
   if canonical.status is distinct from previous->>'status'
    or coalesce(canonical.miles,0) is distinct from coalesce((previous->>'miles')::numeric,0)
    or coalesce(canonical.amount,0) is distinct from coalesce((previous->>'amount')::numeric,0)
    or coalesce(canonical.destination_address,'') is distinct from coalesce(previous->>'destination','') then
    raise exception 'Booking % changed after this request. Review it again before approving.',req->>'bookingRef';
   end if;
   if canonical.delivered_at is not null and proposed->>'status'<>'Delivered' then
    raise exception 'Delivered booking % cannot be moved back to an earlier status',req->>'bookingRef';
   end if;
   saved:=public.admin_update_booking_details(canonical.id,(proposed->>'miles')::numeric,
    (proposed->>'amount')::numeric,proposed->>'destination');
   if saved.status is distinct from proposed->>'status' then
    saved:=public.update_booking_status(canonical.id,proposed->>'status',
      'Approved update: '||coalesce(req->>'reason','Admin approval'),null,null,null);
   end if;
  else
   if cached->>'status' is distinct from previous->>'status'
    or coalesce((cached->>'miles')::numeric,0) is distinct from coalesce((previous->>'miles')::numeric,0)
    or coalesce((cached->>'amount')::numeric,0) is distinct from coalesce((previous->>'amount')::numeric,0)
    or coalesce(cached->>'destination','') is distinct from coalesce(previous->>'destination','') then
    raise exception 'Booking % changed after this request. Review it again before approving.',req->>'bookingRef';
   end if;
   if (cached->>'status'='Delivered' or nullif(cached->>'_deliveredAt','') is not null or nullif(cached->>'deliveredAt','') is not null)
    and proposed->>'status'<>'Delivered' then
    raise exception 'Delivered booking % cannot be moved back to an earlier status',req->>'bookingRef';
   end if;
  end if;
  cached:=cached||jsonb_build_object('status',proposed->>'status','miles',(proposed->>'miles')::numeric,
   'amount',(proposed->>'amount')::numeric,'destination',proposed->>'destination',
   'lastApprovedBy',approver,'lastApprovedAt',approved_at);
  if canonical.id is not null then
   cached:=cached||jsonb_build_object('_normalizedId',saved.id,'_deliveredAt',saved.delivered_at);
  end if;
  event:=jsonb_build_object('title','Approved Booking Update','text','Approved by '||approver||' at '||approved_at);
  cached:=jsonb_set(cached,'{timeline}',jsonb_build_array(event)||coalesce(cached->'timeline','[]'));
  select coalesce(jsonb_agg(case when h->>'action'='Update Requested' and h->>'requestedAt'=req->>'requestedAt'
   then h||jsonb_build_object('action','Update Approved','approvedBy',approver,'approvedAt',approved_at) else h end),'[]')
   into history from jsonb_array_elements(coalesce(cached->'approvalHistory','[]')) h;
  cached:=jsonb_set(cached,'{approvalHistory}',history);
  final_request:=req||jsonb_build_object('status','Approved','approvedBy',approver,'approvedAt',approved_at);
  select jsonb_set(source,'{bookings}',coalesce(jsonb_agg(case when b->>'ref'=req->>'bookingRef' then cached else b end),'[]'))
   into source from jsonb_array_elements(source->'bookings') b;
  select jsonb_set(source,'{updateRequests}',coalesce(jsonb_agg(case when r->>'id'=request_id then final_request else r end),'[]'))
   into source from jsonb_array_elements(source->'updateRequests') r;
  result_requests:=result_requests||jsonb_build_array(final_request);
  result_bookings:=result_bookings||jsonb_build_array(cached);
  notices:=notices||jsonb_build_array(jsonb_build_object('title','Booking Update Approved',
   'text',(req->>'bookingRef')||' update approved by '||approver||'.'));
  approved:=approved+1;
 end loop;
 if approved>0 then
  source:=jsonb_set(source,'{notifications}',notices||coalesce(source->'notifications','[]'));
  update public.app_store set data=source,updated_at=now() where id='main';
 end if;
 return jsonb_build_object('approved_count',approved,'already_approved_count',already,
  'requests',result_requests,'bookings',result_bookings,'notifications',notices);
end $$;
revoke all on function public.approve_booking_updates(text[]) from public,anon;
grant execute on function public.approve_booking_updates(text[]) to authenticated;
notify pgrst,'reload schema';
commit;
