-- Run in the Supabase SQL Editor after ukow_production_architecture.sql
-- and portal_workflow_patch.sql. No existing booking or photo is deleted.
begin;

alter table public.bookings
  add column if not exists client_id uuid references public.profiles(id) on delete set null;
create index if not exists bookings_client_id_idx on public.bookings(client_id);

-- A private booking created by Admin belongs to its named Client, not to every
-- Client. Business bookings continue to use business membership.
create or replace function public.can_view_booking(target_booking_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select public.is_portal_admin()
    or public.has_portal_permission('bookings:view')
    or exists (
      select 1 from public.bookings b
      where b.id = target_booking_id
        and (
          b.created_by = auth.uid()
          or b.client_id = auth.uid()
          or b.driver_id = auth.uid()
          or (b.business_id is not null and public.is_business_member(b.business_id))
        )
    )
$$;

drop policy if exists "ukow_bookings_select" on public.bookings;
create policy "ukow_bookings_select" on public.bookings
for select to authenticated
using (
  public.is_portal_admin()
  or public.has_portal_permission('bookings:view')
  or created_by = auth.uid()
  or client_id = auth.uid()
  or driver_id = auth.uid()
  or (business_id is not null and public.is_business_member(business_id))
);

insert into storage.buckets (id, name, public)
values ('booking-evidence', 'booking-evidence', false)
on conflict (id) do update set public = false;

alter table public.booking_evidence enable row level security;
drop policy if exists "ukow_booking_evidence_select" on public.booking_evidence;
create policy "ukow_booking_evidence_select" on public.booking_evidence
for select to authenticated using (public.can_view_booking(booking_id));
drop policy if exists "ukow_booking_evidence_insert" on public.booking_evidence;
create policy "ukow_booking_evidence_insert" on public.booking_evidence
for insert to authenticated with check (
  captured_by = auth.uid()
  and exists (
    select 1 from public.bookings b where b.id = booking_id
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  )
);
grant select, insert on public.booking_evidence to authenticated;

drop policy if exists "ukow_booking_evidence_storage_select" on storage.objects;
create policy "ukow_booking_evidence_storage_select" on storage.objects
for select to authenticated using (
  bucket_id = 'booking-evidence'
  and public.can_view_booking(((storage.foldername(name))[1])::uuid)
);
drop policy if exists "ukow_booking_evidence_storage_insert" on storage.objects;
create policy "ukow_booking_evidence_storage_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'booking-evidence'
  and exists (
    select 1 from public.bookings b
    where b.id = ((storage.foldername(name))[1])::uuid
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  )
);
drop policy if exists "ukow_booking_evidence_storage_delete" on storage.objects;
create policy "ukow_booking_evidence_storage_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'booking-evidence'
  and exists (
    select 1 from public.bookings b
    where b.id = ((storage.foldername(name))[1])::uuid
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  )
);

-- Admin/authorised Staff can create a linked booking, or import an older
-- app_store-only booking at assignment time while preserving its reference.
-- Reuses create_portal_booking so it also creates the booking event.
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
returns public.bookings language plpgsql security definer
set search_path = pg_catalog, public
as $$
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
  else
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
$$;

revoke execute on function public.admin_create_delivery_booking(
  text,uuid,text,text,text,text,text,text,text,text,text,date,date,numeric,numeric,text,text,uuid,text
) from public, anon;
grant execute on function public.admin_create_delivery_booking(
  text,uuid,text,text,text,text,text,text,text,text,text,date,date,numeric,numeric,text,text,uuid,text
) to authenticated;
commit;