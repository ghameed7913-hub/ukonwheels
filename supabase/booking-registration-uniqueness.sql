-- Each saved business represents a customer/branch. All historical statuses count.
-- Run in Supabase SQL Editor. Does not delete or rewrite existing bookings.
begin;
create or replace function public.enforce_booking_registration_customer()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  b public.bookings;
  reg text;
  customer_key text;
  conflict_reference text;
begin
  if tg_op = 'UPDATE' then
    if new.customer_type is not distinct from old.customer_type
       and new.business_id is not distinct from old.business_id
       and new.client_id is not distinct from old.client_id
       and upper(regexp_replace(new.vehicle_registration,'[\s-]','','g'))
           is not distinct from upper(regexp_replace(old.vehicle_registration,'[\s-]','','g')) then
      return null;
    end if;
  end if;
  -- Creation RPCs insert first and attach the private Client before committing.
  -- Inspect the final row, never the temporary unlinked INSERT event.
  select * into b from public.bookings where id = new.id;
  if not found then return null; end if;
  reg := upper(regexp_replace(coalesce(b.vehicle_registration,''),'[\s-]','','g'));
  if reg = '' then raise exception 'Enter a vehicle registration'; end if;
  if b.customer_type = 'Business' then
    if b.business_id is null then raise exception 'Select a saved customer/business branch'; end if;
    customer_key := 'business:' || b.business_id::text;
  elsif b.customer_type = 'Private' then
    if b.client_id is null then raise exception 'Link this booking to a saved Private Client'; end if;
    customer_key := 'client:' || b.client_id::text;
  else
    raise exception 'Choose a Business or Private customer';
  end if;
  -- Serialise concurrent submissions for the same customer and registration.
  perform pg_advisory_xact_lock(hashtextextended(customer_key || ':' || reg,0));
  select x.reference into conflict_reference
  from public.bookings x
  where x.id <> b.id
    and upper(regexp_replace(x.vehicle_registration,'[\s-]','','g')) = reg
    and x.customer_type = b.customer_type
    and ((b.customer_type = 'Business' and x.business_id = b.business_id)
      or (b.customer_type = 'Private' and x.client_id = b.client_id))
  order by x.reference
  limit 1;
  if found then
    raise exception 'Registration % was already booked for this customer/branch (%). Select a different registration or a different saved customer/branch.',
      reg, conflict_reference using errcode = '23505';
  end if;
  return null;
end;
$$;
revoke all on function public.enforce_booking_registration_customer() from public, anon, authenticated;
create index if not exists bookings_customer_registration_lookup
  on public.bookings (upper(regexp_replace(vehicle_registration,'[\s-]','','g')), customer_type, business_id, client_id);
drop trigger if exists booking_registration_customer_guard on public.bookings;
create constraint trigger booking_registration_customer_guard
after insert or update of customer_type, business_id, client_id, vehicle_registration
on public.bookings deferrable initially deferred
for each row execute function public.enforce_booking_registration_customer();
notify pgrst, 'reload schema';
commit;
