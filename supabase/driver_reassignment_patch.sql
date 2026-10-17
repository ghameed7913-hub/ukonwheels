-- Run in the Supabase SQL Editor after the existing portal/photo patches.
-- Keeps booking progress, ownership, inspection records and all evidence intact.
begin;

create or replace function public.reassign_booking_driver(
  p_booking_id uuid,
  p_driver_id uuid,
  p_notes text default null,
  p_expected_driver_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_booking public.bookings;
  saved_booking public.bookings;
begin
  if not public.has_portal_permission('drivers:assign') then
    raise exception 'Driver assignment permission required';
  end if;

  select * into previous_booking
  from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if lower(trim(previous_booking.status)) = 'delivered'
     or previous_booking.delivered_at is not null then
    raise exception 'Delivered jobs are locked and cannot be reassigned';
  end if;
  if previous_booking.driver_id is distinct from p_expected_driver_id then
    raise exception 'The assigned driver has changed. Reload this booking before retrying';
  end if;
  if previous_booking.driver_id = p_driver_id then
    raise exception 'Choose a different driver';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_driver_id and lower(role) = 'driver' and lower(status) = 'active'
  ) then raise exception 'Active driver not found'; end if;

  update public.bookings
  set driver_id = p_driver_id,
      status = case when previous_booking.status = 'New Booked Vehicle'
                    then 'Driver Assigned' else previous_booking.status end,
      assigned_at = now(), updated_at = now()
  where id = p_booking_id
  returning * into saved_booking;

  insert into public.booking_events
    (booking_id, event_type, from_status, to_status, notes, created_by)
  values (
    p_booking_id,
    case when previous_booking.driver_id is null then 'driver_assigned' else 'driver_reassigned' end,
    previous_booking.status, saved_booking.status,
    'Previous driver: ' || coalesce(previous_booking.driver_id::text, 'Unassigned') ||
      '; New driver: ' || p_driver_id::text ||
      coalesce('; ' || nullif(trim(p_notes), ''), ''),
    auth.uid()
  );
  return saved_booking;
end;
$$;

-- Protect existing callers, including the legacy booking/photo import path.
create or replace function public.assign_booking_driver(
  p_booking_id uuid, p_driver_id uuid, p_notes text default null
)
returns public.bookings
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare previous_driver_id uuid;
begin
  select driver_id into previous_driver_id from public.bookings where id = p_booking_id;
  return public.reassign_booking_driver(p_booking_id, p_driver_id, p_notes, previous_driver_id);
end;
$$;

create or replace function public.driver_reassignment_ready()
returns boolean language sql stable
set search_path = pg_catalog, public
as $$ select true $$;

revoke execute on function public.reassign_booking_driver(uuid, uuid, text, uuid) from public, anon;
revoke execute on function public.assign_booking_driver(uuid, uuid, text) from public, anon;
revoke execute on function public.driver_reassignment_ready() from public, anon;
grant execute on function public.reassign_booking_driver(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.assign_booking_driver(uuid, uuid, text) to authenticated;
grant execute on function public.driver_reassignment_ready() to authenticated;
commit;
