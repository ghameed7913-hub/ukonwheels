-- Compatible with the live function exported by the user.
-- CREATE OR REPLACE preserves the function's existing grants.
begin;
create or replace function public.admin_create_delivery_booking(
  p_customer_type text,
  p_business_id uuid,
  p_private_client_email text,
  p_vehicle_make text,
  p_vehicle_model text,
  p_vehicle_registration text,
  p_service_type text,
  p_pickup_address text,
  p_destination_address text,
  p_receiver_name text,
  p_receiver_mobile text,
  p_requested_delivery_date date,
  p_booking_date date,
  p_miles numeric,
  p_amount numeric,
  p_notes text,
  p_reference text default null,
  p_driver_id uuid default null,
  p_current_status text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  new_booking public.bookings;
  matched_client uuid;
  linked_business uuid;
begin
  if not (public.is_portal_admin() or public.has_portal_permission('booking:create')) then
    raise exception 'Booking creation permission required';
  end if;
  if p_customer_type not in ('Private', 'Business') then
    raise exception 'Choose a Private or Business customer';
  end if;
  if p_customer_type = 'Business' then
    if p_business_id is null then
      raise exception 'Choose a registered business with a Client account';
    end if;
    linked_business := p_business_id;
  elsif nullif(trim(p_private_client_email), '') is not null then
    select id into matched_client from public.profiles
    where lower(email) = lower(trim(p_private_client_email))
      and lower(role) = 'client' and lower(status) = 'active'
    limit 1;
    if matched_client is null then
      raise exception 'Private Client email must match an active Client portal account';
    end if;
  end if;
  new_booking := public.create_portal_booking(
    p_customer_type, linked_business, p_vehicle_make, p_vehicle_model,
    p_vehicle_registration, null, p_service_type, p_pickup_address, null,
    p_destination_address, null, p_receiver_name, p_receiver_mobile,
    p_requested_delivery_date, p_notes
  );
  update public.bookings
  set client_id = matched_client,
      reference = coalesce(nullif(trim(p_reference), ''), reference),
      booking_date = coalesce(p_booking_date, booking_date),
      miles = coalesce(p_miles, miles),
      amount = coalesce(p_amount, amount),
      updated_at = now()
  where id = new_booking.id returning * into new_booking;
  if p_driver_id is not null then
    new_booking := public.assign_booking_driver(new_booking.id, p_driver_id, null);
    if p_current_status in ('Picked Up','On Route','Delayed','Accident',
                            'Fault On Route','Assigned AA on Route') then
      new_booking := public.update_booking_status(
        new_booking.id, p_current_status, 'Linked older booking to secure photo evidence'
      );
    end if;
  end if;
  return new_booking;
end;
$function$;
commit;
