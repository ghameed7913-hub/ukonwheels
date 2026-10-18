-- Enables Excel bulk booking for signed-in Clients without granting Admin access.
-- Run once in the same Supabase project as the portal. Safe to run again.
begin;

create or replace function public.client_create_bulk_booking(
  p_reference text,
  p_booking jsonb
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.profiles;
  existing public.bookings;
  saved public.bookings;
  business uuid;
  customer_type text;
  registration text;
  vehicle text;
  make text;
  model text;
  miles_value numeric;
  service_value text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or lower(actor.role) <> 'client' or lower(actor.status) <> 'active' then
    raise exception 'An active Client account is required';
  end if;
  if p_reference is null or p_reference !~ '^UKOW-[0-9]{4}-[A-F0-9]{32}$' then
    raise exception 'A valid bulk booking reference is required';
  end if;
  if p_booking is null or jsonb_typeof(p_booking) <> 'object' then
    raise exception 'Booking details are required';
  end if;
  -- A Client can book only against a business they actually belong to.
  if lower(actor.account_type) = 'business' then
    business := nullif(p_booking->>'_businessId','')::uuid;
    if business is null or not public.is_business_member(business) then
      raise exception 'Your account is not linked to this business';
    end if;
    if not exists(select 1 from public.businesses where id = business and lower(status) = 'active') then
      raise exception 'An active linked business is required';
    end if;
    customer_type := 'Business';
  else
    if nullif(p_booking->>'_businessId','') is not null then
      raise exception 'A Private Client cannot book for a business';
    end if;
    customer_type := 'Private';
  end if;
  if coalesce(nullif(p_booking->>'customerType',''),customer_type) <> customer_type then
    raise exception 'Use your own Client account type';
  end if;
  if coalesce(nullif(p_booking->>'amount','')::numeric,0) <> 0 then
    raise exception 'Only Operations can set customer charges';
  end if;
  miles_value := coalesce(nullif(p_booking->>'miles','')::numeric,0);
  if miles_value < 0 or miles_value::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Estimated miles must be zero or more';
  end if;
  vehicle := trim(coalesce(p_booking->>'vehicle',''));
  registration := upper(regexp_replace(coalesce(p_booking->>'reg',''),'[\s-]','','g'));
  if vehicle = '' or registration = '' or trim(coalesce(p_booking->>'pickup','')) = ''
     or trim(coalesce(p_booking->>'destination','')) = ''
     or trim(coalesce(p_booking->>'receiver','')) = '' or trim(coalesce(p_booking->>'receiverMobile','')) = '' then
    raise exception 'Complete vehicle, registration, collection, delivery and receiver details';
  end if;
  service_value := coalesce(nullif(p_booking->>'service',''),'Vehicle Delivery');
  if service_value not in ('Vehicle Delivery','Vehicle Collection & Delivery','Recovery / AA') then
    raise exception 'Choose a valid service type';
  end if;
  -- Serialise duplicate requests for the stable reference, including lost-response retries.
  perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
  select * into existing from public.bookings where reference = p_reference;
  if existing.id is not null then
    if existing.created_by is distinct from auth.uid()
       or existing.client_id is distinct from auth.uid()
       or existing.business_id is distinct from business
       or upper(regexp_replace(existing.vehicle_registration,'[\s-]','','g')) <> registration then
      raise exception 'This reference cannot be used for this booking';
    end if;
    return existing;
  end if;
  make := split_part(vehicle,' ',1);
  model := nullif(trim(substr(vehicle,length(make)+1)),'');
  saved := public.create_portal_booking(
    customer_type,business,make,model,registration,null,service_value,
    trim(p_booking->>'pickup'),null,trim(p_booking->>'destination'),null,
    trim(p_booking->>'receiver'),trim(p_booking->>'receiverMobile'),
    nullif(p_booking->>'deliveryDate','')::date,nullif(p_booking->>'notes','')
  );
  update public.bookings
  set reference = p_reference,
      client_id = auth.uid(),
      booking_date = coalesce(nullif(p_booking->>'bookingDate','')::date,current_date),
      miles = miles_value,
      status = 'New Booked Vehicle',
      payment_status = 'Pending',
      updated_at = now()
  where id = saved.id returning * into saved;
  return saved;
end;
$$;

revoke all on function public.client_create_bulk_booking(text,jsonb) from public, anon;
grant execute on function public.client_create_bulk_booking(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
