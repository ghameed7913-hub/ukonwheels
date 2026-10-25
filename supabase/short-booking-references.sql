-- New bookings: UKOW00001 through UKOW99999. Existing references are unchanged.
-- Run in the portal Supabase SQL Editor before deploying the matching UI update.
begin;
lock table public.bookings in share row exclusive mode;
alter table public.bookings add column if not exists booking_request_reference text;
create unique index if not exists bookings_request_reference_unique
  on public.bookings (booking_request_reference);
create sequence if not exists public.short_booking_reference_seq
  minvalue 1 maxvalue 99999 start 1 no cycle;
revoke all on sequence public.short_booking_reference_seq from public, anon, authenticated;

do $$
declare highest bigint; current_value bigint;
begin
  select coalesce(max(substring(reference from 5)::bigint),0) into highest
  from public.bookings where reference ~ '^UKOW[0-9]{1,5}$';
  select last_value into current_value from public.short_booking_reference_seq;
  if highest >= current_value and highest > 0 then
    perform setval('public.short_booking_reference_seq',highest,true);
  end if;
end;
$$;

create or replace function public.assign_short_booking_reference()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare candidate text;
begin
  if tg_op = 'INSERT' then
    -- Keep the draft UUID only as an internal retry key, not the displayed ref.
    if new.reference ~ '^UKOW-[0-9]{4}-[A-F0-9]{32}$' then
      new.booking_request_reference := new.reference;
    end if;
    loop
      begin
        candidate := 'UKOW' || lpad(nextval('public.short_booking_reference_seq')::text,5,'0');
      exception when sequence_generator_limit_exceeded then
        raise exception 'All five-digit booking references have been used. Contact Admin; no booking was saved.';
      end;
      exit when not exists(select 1 from public.bookings where reference = candidate);
    end loop;
    new.reference := candidate;
  else
    -- Existing RPCs assign the stable draft key after inserting the booking.
    if new.reference ~ '^UKOW-[0-9]{4}-[A-F0-9]{32}$'
       and new.reference is distinct from old.reference then
      new.booking_request_reference := new.reference;
      new.reference := old.reference;
    end if;
    if old.booking_request_reference is not null
       and new.booking_request_reference is distinct from old.booking_request_reference then
      raise exception 'A saved booking retry key cannot be changed';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.assign_short_booking_reference() from public, anon, authenticated;
drop trigger if exists assign_short_booking_reference on public.bookings;
create trigger assign_short_booking_reference
before insert or update of reference, booking_request_reference on public.bookings
for each row execute function public.assign_short_booking_reference();

-- Preserve the existing Client ownership checks and stable-request retry logic.
-- Only broaden its reference lookup to include the internal draft key.
do $$
declare definition text;
begin
  if to_regprocedure('public.client_create_bulk_booking(text,jsonb)') is null then
    raise exception 'Run client-bulk-booking-patch.sql first, then rerun this setup';
  end if;
  definition := pg_get_functiondef('public.client_create_bulk_booking(text,jsonb)'::regprocedure);
  if position('where reference = p_reference or booking_request_reference = p_reference;' in definition) > 0 then
    null; -- Already installed.
  elsif position('where reference = p_reference;' in definition) > 0 then
    execute replace(definition,
      'where reference = p_reference;',
      'where reference = p_reference or booking_request_reference = p_reference;');
  elsif position('where reference=p_reference;' in definition) > 0 then
    -- The portal safety setup uses the same lookup without spaces.
    execute replace(definition,
      'where reference=p_reference;',
      'where reference = p_reference or booking_request_reference = p_reference;');
  else
    raise exception 'Client booking function differs from the expected setup. No changes applied; ask Admin to check it.';
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
