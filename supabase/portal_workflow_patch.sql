begin;

-- Finalize an Auth signup created by an authenticated portal Admin.
create or replace function public.admin_finalize_created_profile(
  p_user_id uuid,
  p_name text,
  p_role text,
  p_staff_role text default null,
  p_permissions text[] default array[]::text[],
  p_status text default 'Active',
  p_account_type text default null,
  p_business_name text default null,
  p_business_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_portal_admin() then raise exception 'Admin access required'; end if;

  update public.profiles
  set name = trim(p_name),
      full_name = trim(p_name),
      status = case when lower(p_status) = 'inactive' then 'Inactive' else 'Active' end,
      account_type = coalesce(nullif(lower(p_account_type), ''), account_type),
      business_name = nullif(trim(p_business_name), ''),
      business_id = p_business_id,
      updated_at = now()
  where id = p_user_id;

  if not found then raise exception 'Profile trigger has not created this user'; end if;

  perform public.admin_set_user_role(p_user_id, p_role, p_staff_role, p_permissions);

  if p_business_id is not null and lower(p_role) = 'client' then
    insert into public.business_memberships (business_id, profile_id, membership_role, status)
    values (p_business_id, p_user_id, 'Client', 'Active')
    on conflict (business_id, profile_id) do update set status = 'Active';
  end if;

  if lower(p_status) = 'inactive' then
    update public.profiles set status = 'Inactive' where id = p_user_id;
  end if;
end;
$$;

create or replace function public.admin_set_profile_status(
  p_status text,
  p_user_id uuid default null,
  p_email text default null,
  p_business_id uuid default null
)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if not public.is_portal_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Active','Inactive','Deleted','Pending') then raise exception 'Invalid status'; end if;
  update public.profiles set status=p_status, updated_at=now()
  where (p_user_id is not null and id=p_user_id)
     or (p_email is not null and lower(email)=lower(p_email))
     or (p_business_id is not null and business_id=p_business_id);
end;
$$;

create or replace function public.admin_update_booking_details(
  p_booking_id uuid,
  p_miles numeric default null,
  p_amount numeric default null,
  p_destination_address text default null,
  p_vehicle_make text default null,
  p_vehicle_registration text default null,
  p_pickup_address text default null,
  p_service_type text default null,
  p_booking_date date default null,
  p_requested_delivery_date date default null,
  p_receiver_name text default null,
  p_receiver_mobile text default null,
  p_payment_status text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare updated_booking public.bookings;
begin
  if not (public.is_portal_admin() or public.has_portal_permission('bookings:manage')) then
    raise exception 'Booking management permission required';
  end if;

  update public.bookings
  set miles = coalesce(p_miles, miles),
      amount = coalesce(p_amount, amount),
      destination_address = coalesce(nullif(trim(p_destination_address), ''), destination_address),
      vehicle_make = coalesce(nullif(trim(p_vehicle_make), ''), vehicle_make),
      vehicle_registration = coalesce(nullif(upper(trim(p_vehicle_registration)), ''), vehicle_registration),
      pickup_address = coalesce(nullif(trim(p_pickup_address), ''), pickup_address),
      service_type = coalesce(nullif(trim(p_service_type), ''), service_type),
      booking_date = coalesce(p_booking_date, booking_date),
      requested_delivery_date = coalesce(p_requested_delivery_date, requested_delivery_date),
      receiver_name = coalesce(p_receiver_name, receiver_name),
      receiver_mobile = coalesce(p_receiver_mobile, receiver_mobile),
      payment_status = coalesce(nullif(trim(p_payment_status), ''), payment_status),
      updated_at = now()
  where id = p_booking_id
  returning * into updated_booking;

  if updated_booking.id is null then raise exception 'Booking not found'; end if;
  return updated_booking;
end;
$$;

create table if not exists public.booking_inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  condition text not null,
  odometer_mileage numeric(12,2) not null,
  fuel_level text not null,
  notes text,
  inspected_by uuid not null references public.profiles(id) on delete restrict,
  inspected_at timestamptz not null default now()
);

alter table public.booking_inspections enable row level security;

drop policy if exists "ukow_booking_inspections_select" on public.booking_inspections;
create policy "ukow_booking_inspections_select"
on public.booking_inspections for select to authenticated
using (public.can_view_booking(booking_id));

create or replace function public.save_pickup_inspection(
  p_booking_id uuid,
  p_condition text,
  p_odometer_mileage numeric,
  p_fuel_level text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  ) then raise exception 'Only the assigned Driver or Admin can save this inspection'; end if;

  insert into public.booking_inspections
    (booking_id, condition, odometer_mileage, fuel_level, notes, inspected_by)
  values
    (p_booking_id, trim(p_condition), p_odometer_mileage, trim(p_fuel_level), nullif(trim(p_notes), ''), auth.uid())
  on conflict (booking_id) do update
  set condition = excluded.condition,
      odometer_mileage = excluded.odometer_mileage,
      fuel_level = excluded.fuel_level,
      notes = excluded.notes,
      inspected_by = excluded.inspected_by,
      inspected_at = now();
end;
$$;

drop policy if exists "ukow_booking_evidence_insert" on public.booking_evidence;
create policy "ukow_booking_evidence_insert"
on public.booking_evidence for insert to authenticated
with check (
  captured_by = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  )
);

drop policy if exists "ukow_booking_evidence_storage_insert" on storage.objects;
create policy "ukow_booking_evidence_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'booking-evidence'
  and exists (
    select 1 from public.bookings b
    where b.id = ((storage.foldername(name))[1])::uuid
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  )
);

drop policy if exists "ukow_booking_evidence_storage_delete" on storage.objects;
create policy "ukow_booking_evidence_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'booking-evidence'
  and exists (
    select 1 from public.bookings b
    where b.id = ((storage.foldername(name))[1])::uuid
      and (b.driver_id = auth.uid() or public.is_portal_admin())
  )
);

grant insert, update, delete on public.businesses to authenticated;
grant select on public.booking_inspections to authenticated;
revoke execute on function public.admin_finalize_created_profile(uuid,text,text,text,text[],text,text,text,uuid) from public, anon;
revoke execute on function public.admin_set_profile_status(text,uuid,text,uuid) from public, anon;
revoke execute on function public.admin_update_booking_details(uuid,numeric,numeric,text,text,text,text,text,date,date,text,text,text) from public, anon;
revoke execute on function public.save_pickup_inspection(uuid,text,numeric,text,text) from public, anon;
grant execute on function public.admin_finalize_created_profile(uuid,text,text,text,text[],text,text,text,uuid) to authenticated;
grant execute on function public.admin_set_profile_status(text,uuid,text,uuid) to authenticated;
grant execute on function public.admin_update_booking_details(uuid,numeric,numeric,text,text,text,text,text,date,date,text,text,text) to authenticated;
grant execute on function public.save_pickup_inspection(uuid,text,numeric,text,text) to authenticated;

commit;