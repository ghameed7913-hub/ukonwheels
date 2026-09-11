-- UK On Wheels production account, role, booking and driver architecture
-- Safe to run alongside the existing app_store prototype.
-- This script does not delete, truncate or migrate app_store data.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core user profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'client',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists account_type text default 'private';
alter table public.profiles add column if not exists staff_role text;
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists client_user_name text;
alter table public.profiles add column if not exists client_access text default 'Full Access';
alter table public.profiles add column if not exists driver_name text;
alter table public.profiles add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Businesses and client membership
-- ---------------------------------------------------------------------------

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  company_number text,
  vat_number text,
  business_type text,
  contact_name text,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  county text,
  postcode text,
  accounts_contact_name text,
  accounts_email text,
  accounts_phone text,
  invoice_cycle text not null default 'Monthly',
  tariff_type text not null default 'Standard',
  per_mile_rate numeric(12,2),
  minimum_charge numeric(12,2),
  status text not null default 'Active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists business_id uuid references public.businesses(id) on delete set null;

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'member',
  status text not null default 'Active',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- Staff, driver and permissions
-- ---------------------------------------------------------------------------

create table if not exists public.user_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, permission_key)
);

create table if not exists public.staff_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  designation text,
  employee_number text unique,
  employment_status text not null default 'Active',
  start_date date,
  current_address text,
  previous_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  passport_number text,
  visa_type text,
  visa_expiry date,
  right_to_work_share_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  driver_number text unique,
  driver_status text not null default 'Available',
  licence_number text,
  licence_type text,
  licence_country text,
  licence_expiry date,
  dvla_share_code text,
  dvla_check_expiry date,
  safety_certificate_path text,
  safety_certificate_expiry date,
  vehicle_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requested_role text not null,
  reason text,
  status text not null default 'Pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bookings and operational history
-- ---------------------------------------------------------------------------

create sequence if not exists public.booking_reference_seq start 1000;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_type text not null default 'Business',
  business_id uuid references public.businesses(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  driver_id uuid references public.profiles(id) on delete set null,
  vehicle_make text,
  vehicle_model text,
  vehicle_registration text not null,
  vehicle_type text,
  service_type text not null default 'Vehicle Delivery',
  pickup_address text not null,
  pickup_postcode text,
  destination_address text not null,
  destination_postcode text,
  receiver_name text,
  receiver_mobile text,
  booking_date date not null default current_date,
  requested_delivery_date date,
  collection_time_from time,
  collection_time_to time,
  delivery_time_from time,
  delivery_time_to time,
  miles numeric(12,2),
  amount numeric(12,2) not null default 0,
  status text not null default 'New Booked Vehicle',
  payment_status text not null default 'Pending',
  client_notes text,
  internal_notes text,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  journey_started_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_business_id_idx on public.bookings(business_id);
create index if not exists bookings_created_by_idx on public.bookings(created_by);
create index if not exists bookings_driver_id_idx on public.bookings(driver_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);

create table if not exists public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  notes text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_metres numeric(10,2),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_booking_id_idx on public.booking_events(booking_id, created_at desc);

create table if not exists public.booking_evidence (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  evidence_type text not null,
  storage_path text not null,
  label text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_metres numeric(10,2),
  captured_by uuid not null references public.profiles(id) on delete restrict,
  captured_at timestamptz not null default now(),
  unique (booking_id, storage_path)
);

create table if not exists public.holiday_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'Pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- Finance and communications
-- ---------------------------------------------------------------------------

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  business_id uuid not null references public.businesses(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'Draft',
  issue_date date,
  due_date date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  business_id uuid not null references public.businesses(id) on delete restrict,
  amount numeric(12,2) not null,
  payment_method text,
  reference text,
  status text not null default 'Pending',
  paid_at timestamptz,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null default 'general',
  is_read boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reusable authorization helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select lower(coalesce(role, ''))
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        lower(coalesce(role, '')) in ('admin', 'super admin', 'super_admin')
        or lower(coalesce(staff_role, '')) in ('admin', 'super admin', 'super_admin')
      )
      and lower(coalesce(status, 'active')) = 'active'
  )
$$;

create or replace function public.has_portal_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_portal_admin()
    or exists (
      select 1
      from public.user_permissions
      where profile_id = auth.uid()
        and permission_key = required_permission
    )
$$;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.business_memberships
    where profile_id = auth.uid()
      and business_id = target_business_id
      and lower(status) = 'active'
  )
$$;

create or replace function public.can_view_booking(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_portal_admin()
    or public.has_portal_permission('bookings:view')
    or exists (
      select 1
      from public.bookings b
      where b.id = target_booking_id
        and (
          b.created_by = auth.uid()
          or b.driver_id = auth.uid()
          or (b.business_id is not null and public.is_business_member(b.business_id))
        )
    )
$$;

-- ---------------------------------------------------------------------------
-- New-user profile trigger: every public signup starts as Client
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    full_name,
    phone,
    role,
    status,
    account_type,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    'client',
    'Disabled',
    coalesce(new.raw_user_meta_data ->> 'account_type', 'private'),
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ukow on auth.users;
create trigger on_auth_user_created_ukow
  after insert on auth.users
  for each row execute procedure public.handle_new_portal_user();

-- ---------------------------------------------------------------------------
-- Client onboarding and public booking creation
-- ---------------------------------------------------------------------------

create or replace function public.complete_client_onboarding(
  p_full_name text,
  p_phone text,
  p_account_type text,
  p_legal_name text default null,
  p_trading_name text default null,
  p_company_number text default null,
  p_vat_number text default null,
  p_business_type text default null,
  p_business_email text default null,
  p_business_phone text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_city text default null,
  p_county text default null,
  p_postcode text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if lower(coalesce(p_account_type, '')) not in ('private', 'business') then
    raise exception 'Account type must be private or business';
  end if;

  update public.profiles
  set full_name = nullif(trim(p_full_name), ''),
      name = nullif(trim(p_full_name), ''),
      phone = nullif(trim(p_phone), ''),
      account_type = lower(p_account_type),
      onboarding_completed = true,
      updated_at = now()
  where id = auth.uid()
    and lower(role) = 'client';

  if not found then
    raise exception 'Client profile not found';
  end if;

  if lower(p_account_type) = 'business' then
    if nullif(trim(p_legal_name), '') is null then
      raise exception 'Business legal name is required';
    end if;

    insert into public.businesses (
      legal_name,
      trading_name,
      company_number,
      vat_number,
      business_type,
      contact_name,
      email,
      phone,
      address_line_1,
      address_line_2,
      city,
      county,
      postcode,
      created_by
    )
    values (
      trim(p_legal_name),
      nullif(trim(p_trading_name), ''),
      nullif(trim(p_company_number), ''),
      nullif(trim(p_vat_number), ''),
      nullif(trim(p_business_type), ''),
      nullif(trim(p_full_name), ''),
      nullif(trim(p_business_email), ''),
      nullif(trim(p_business_phone), ''),
      nullif(trim(p_address_line_1), ''),
      nullif(trim(p_address_line_2), ''),
      nullif(trim(p_city), ''),
      nullif(trim(p_county), ''),
      nullif(trim(p_postcode), ''),
      auth.uid()
    )
    returning id into new_business_id;

    insert into public.business_memberships (
      business_id,
      profile_id,
      membership_role,
      status
    )
    values (new_business_id, auth.uid(), 'owner', 'Active');

    update public.profiles
    set business_id = new_business_id,
        updated_at = now()
    where id = auth.uid();
  end if;

  return new_business_id;
end;
$$;

create or replace function public.create_portal_booking(
  p_customer_type text,
  p_business_id uuid,
  p_vehicle_make text,
  p_vehicle_model text,
  p_vehicle_registration text,
  p_vehicle_type text,
  p_service_type text,
  p_pickup_address text,
  p_pickup_postcode text,
  p_destination_address text,
  p_destination_postcode text,
  p_receiver_name text,
  p_receiver_mobile text,
  p_requested_delivery_date date,
  p_client_notes text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_booking public.bookings;
  new_reference text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_business_id is not null
     and not public.is_business_member(p_business_id)
     and not public.has_portal_permission('booking:create') then
    raise exception 'You do not have access to this business';
  end if;

  new_reference :=
    'UKOW-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.booking_reference_seq')::text, 6, '0');

  insert into public.bookings (
    reference,
    customer_type,
    business_id,
    created_by,
    vehicle_make,
    vehicle_model,
    vehicle_registration,
    vehicle_type,
    service_type,
    pickup_address,
    pickup_postcode,
    destination_address,
    destination_postcode,
    receiver_name,
    receiver_mobile,
    requested_delivery_date,
    client_notes,
    status,
    payment_status
  )
  values (
    new_reference,
    coalesce(nullif(trim(p_customer_type), ''), 'Business'),
    p_business_id,
    auth.uid(),
    nullif(trim(p_vehicle_make), ''),
    nullif(trim(p_vehicle_model), ''),
    upper(trim(p_vehicle_registration)),
    nullif(trim(p_vehicle_type), ''),
    coalesce(nullif(trim(p_service_type), ''), 'Vehicle Delivery'),
    trim(p_pickup_address),
    nullif(trim(p_pickup_postcode), ''),
    trim(p_destination_address),
    nullif(trim(p_destination_postcode), ''),
    nullif(trim(p_receiver_name), ''),
    nullif(trim(p_receiver_mobile), ''),
    p_requested_delivery_date,
    nullif(trim(p_client_notes), ''),
    'New Booked Vehicle',
    'Pending'
  )
  returning * into new_booking;

  insert into public.booking_events (
    booking_id,
    event_type,
    to_status,
    notes,
    created_by
  )
  values (
    new_booking.id,
    'booking_created',
    new_booking.status,
    'Booking created',
    auth.uid()
  );

  return new_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin role upgrades and driver assignment
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text,
  p_staff_role text default null,
  p_permissions text[] default array[]::text[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_role text := lower(trim(p_role));
  permission_name text;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required';
  end if;

  if normalized_role not in ('client', 'staff', 'driver', 'admin') then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set role = normalized_role,
      staff_role = case when normalized_role in ('staff', 'admin') then p_staff_role else null end,
      driver_name = case when normalized_role = 'driver' then coalesce(full_name, name) else driver_name end,
      status = 'Active',
      updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  delete from public.user_permissions where profile_id = p_user_id;

  if normalized_role = 'staff' then
    foreach permission_name in array p_permissions loop
      insert into public.user_permissions (profile_id, permission_key, granted_by)
      values (p_user_id, permission_name, auth.uid())
      on conflict do nothing;
    end loop;
  end if;

  if normalized_role = 'driver' then
    insert into public.driver_profiles (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;
  elsif normalized_role in ('staff', 'admin') then
    insert into public.staff_profiles (user_id, designation)
    values (p_user_id, p_staff_role)
    on conflict (user_id) do update
      set designation = excluded.designation,
          updated_at = now();
  end if;
end;
$$;

create or replace function public.assign_booking_driver(
  p_booking_id uuid,
  p_driver_id uuid,
  p_notes text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_booking public.bookings;
begin
  if not public.has_portal_permission('drivers:assign') then
    raise exception 'Driver assignment permission required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_driver_id
      and lower(role) = 'driver'
      and lower(status) = 'active'
  ) then
    raise exception 'Active driver not found';
  end if;

  update public.bookings
  set driver_id = p_driver_id,
      status = 'Driver Assigned',
      assigned_at = now(),
      updated_at = now()
  where id = p_booking_id
  returning * into updated_booking;

  if updated_booking.id is null then
    raise exception 'Booking not found';
  end if;

  insert into public.booking_events (
    booking_id,
    event_type,
    from_status,
    to_status,
    notes,
    created_by
  )
  values (
    p_booking_id,
    'driver_assigned',
    null,
    'Driver Assigned',
    nullif(trim(p_notes), ''),
    auth.uid()
  );

  return updated_booking;
end;
$$;

create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_status text,
  p_notes text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_metres numeric default null
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_booking public.bookings;
  updated_booking public.bookings;
  normalized_status text := trim(p_status);
  caller_role text := public.current_profile_role();
begin
  select * into current_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if current_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if caller_role = 'driver' then
    if current_booking.driver_id <> auth.uid() then
      raise exception 'This booking is not assigned to you';
    end if;

    if normalized_status not in (
      'Picked Up',
      'On Route',
      'Delayed',
      'Fault On Route',
      'Accident',
      'Assigned AA on Route',
      'Delivered'
    ) then
      raise exception 'Drivers cannot set this status';
    end if;
  elsif not public.has_portal_permission('bookings:status') then
    raise exception 'Booking status permission required';
  end if;

  update public.bookings
  set status = normalized_status,
      picked_up_at = case when normalized_status = 'Picked Up' then coalesce(picked_up_at, now()) else picked_up_at end,
      journey_started_at = case when normalized_status = 'On Route' then coalesce(journey_started_at, now()) else journey_started_at end,
      delivered_at = case when normalized_status = 'Delivered' then coalesce(delivered_at, now()) else delivered_at end,
      updated_at = now()
  where id = p_booking_id
  returning * into updated_booking;

  insert into public.booking_events (
    booking_id,
    event_type,
    from_status,
    to_status,
    notes,
    latitude,
    longitude,
    accuracy_metres,
    created_by
  )
  values (
    p_booking_id,
    'status_changed',
    current_booking.status,
    normalized_status,
    nullif(trim(p_notes), ''),
    p_latitude,
    p_longitude,
    p_accuracy_metres,
    auth.uid()
  );

  return updated_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
  before update on public.staff_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists driver_profiles_set_updated_at on public.driver_profiles;
create trigger driver_profiles_set_updated_at
  before update on public.driver_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.user_permissions enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.role_upgrade_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.booking_evidence enable row level security;
alter table public.holiday_requests enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

create policy "ukow_profiles_select"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_portal_admin()
  or public.has_portal_permission('users:view')
);

create policy "ukow_profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "ukow_profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "ukow_businesses_select"
on public.businesses for select
to authenticated
using (
  public.is_portal_admin()
  or public.has_portal_permission('businesses:view')
  or public.is_business_member(id)
);

create policy "ukow_businesses_admin_write"
on public.businesses for all
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('businesses:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('businesses:manage'));

create policy "ukow_memberships_select"
on public.business_memberships for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_business_member(business_id)
  or public.is_portal_admin()
  or public.has_portal_permission('users:view')
);

create policy "ukow_memberships_admin_write"
on public.business_memberships for all
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('users:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('users:manage'));

create policy "ukow_permissions_select"
on public.user_permissions for select
to authenticated
using (profile_id = auth.uid() or public.is_portal_admin());

create policy "ukow_permissions_admin_write"
on public.user_permissions for all
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "ukow_staff_profiles_select"
on public.staff_profiles for select
to authenticated
using (user_id = auth.uid() or public.is_portal_admin() or public.has_portal_permission('hr:view'));

create policy "ukow_staff_profiles_admin_write"
on public.staff_profiles for all
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('hr:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('hr:manage'));

create policy "ukow_driver_profiles_select"
on public.driver_profiles for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_portal_admin()
  or public.has_portal_permission('drivers:view')
);

create policy "ukow_driver_profiles_admin_write"
on public.driver_profiles for all
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('drivers:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('drivers:manage'));

create policy "ukow_role_requests_own_select"
on public.role_upgrade_requests for select
to authenticated
using (requested_by = auth.uid() or public.is_portal_admin());

create policy "ukow_role_requests_own_insert"
on public.role_upgrade_requests for insert
to authenticated
with check (
  requested_by = auth.uid()
  and lower(requested_role) in ('staff', 'driver')
  and lower(status) = 'pending'
);

create policy "ukow_role_requests_admin_update"
on public.role_upgrade_requests for update
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "ukow_bookings_select"
on public.bookings for select
to authenticated
using (
  public.is_portal_admin()
  or public.has_portal_permission('bookings:view')
  or created_by = auth.uid()
  or driver_id = auth.uid()
  or (business_id is not null and public.is_business_member(business_id))
);

create policy "ukow_booking_events_select"
on public.booking_events for select
to authenticated
using (public.can_view_booking(booking_id));

create policy "ukow_booking_evidence_select"
on public.booking_evidence for select
to authenticated
using (public.can_view_booking(booking_id));

create policy "ukow_booking_evidence_insert"
on public.booking_evidence for insert
to authenticated
with check (
  captured_by = auth.uid()
  and public.can_view_booking(booking_id)
);

create policy "ukow_holidays_select"
on public.holiday_requests for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_portal_admin()
  or public.has_portal_permission('hr:view')
);

create policy "ukow_holidays_insert"
on public.holiday_requests for insert
to authenticated
with check (user_id = auth.uid() and lower(status) = 'pending');

create policy "ukow_holidays_admin_update"
on public.holiday_requests for update
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('hr:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('hr:manage'));

create policy "ukow_invoices_select"
on public.invoices for select
to authenticated
using (
  public.is_portal_admin()
  or public.has_portal_permission('accounts:view')
  or public.is_business_member(business_id)
);

create policy "ukow_invoices_admin_write"
on public.invoices for all
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('accounts:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('accounts:manage'));

create policy "ukow_payments_select"
on public.payments for select
to authenticated
using (
  public.is_portal_admin()
  or public.has_portal_permission('accounts:view')
  or public.is_business_member(business_id)
);

create policy "ukow_payments_admin_write"
on public.payments for all
to authenticated
using (public.is_portal_admin() or public.has_portal_permission('accounts:manage'))
with check (public.is_portal_admin() or public.has_portal_permission('accounts:manage'));

create policy "ukow_notifications_select"
on public.notifications for select
to authenticated
using (
  recipient_id = auth.uid()
  or (business_id is not null and public.is_business_member(business_id))
  or public.is_portal_admin()
);

create policy "ukow_notifications_write"
on public.notifications for insert
to authenticated
with check (
  public.is_portal_admin()
  or public.has_portal_permission('messaging:manage')
);

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('booking-evidence', 'booking-evidence', false),
  ('profile-documents', 'profile-documents', false)
on conflict (id) do update set public = false;

create policy "ukow_booking_evidence_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'booking-evidence'
  and public.can_view_booking(((storage.foldername(name))[1])::uuid)
);

create policy "ukow_booking_evidence_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'booking-evidence'
  and public.can_view_booking(((storage.foldername(name))[1])::uuid)
);

create policy "ukow_profile_documents_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-documents'
  and (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    or public.is_portal_admin()
    or public.has_portal_permission('hr:view')
  )
);

create policy "ukow_profile_documents_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-documents'
  and (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    or public.is_portal_admin()
    or public.has_portal_permission('hr:manage')
  )
);

-- ---------------------------------------------------------------------------
-- API access
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (name, full_name, phone, avatar_path, last_seen_at) on public.profiles to authenticated;
grant select on public.businesses, public.business_memberships to authenticated;
grant select on public.user_permissions to authenticated;
grant select on public.staff_profiles, public.driver_profiles to authenticated;
grant select, insert on public.role_upgrade_requests to authenticated;
grant select on public.bookings, public.booking_events to authenticated;
grant select, insert on public.booking_evidence to authenticated;
grant select, insert on public.holiday_requests to authenticated;
grant select on public.invoices, public.payments, public.notifications to authenticated;
grant usage, select on sequence public.booking_reference_seq to authenticated;

revoke execute on function public.current_profile_role() from public, anon;
revoke execute on function public.is_portal_admin() from public, anon;
revoke execute on function public.has_portal_permission(text) from public, anon;
revoke execute on function public.is_business_member(uuid) from public, anon;
revoke execute on function public.can_view_booking(uuid) from public, anon;
revoke execute on function public.complete_client_onboarding(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon;
revoke execute on function public.create_portal_booking(
  text, uuid, text, text, text, text, text, text, text, text, text, text, text, date, text
) from public, anon;
revoke execute on function public.admin_set_user_role(uuid, text, text, text[]) from public, anon;
revoke execute on function public.assign_booking_driver(uuid, uuid, text) from public, anon;
revoke execute on function public.update_booking_status(uuid, text, text, numeric, numeric, numeric) from public, anon;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_portal_admin() to authenticated;
grant execute on function public.has_portal_permission(text) to authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.can_view_booking(uuid) to authenticated;
grant execute on function public.complete_client_onboarding(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.create_portal_booking(
  text, uuid, text, text, text, text, text, text, text, text, text, text, text, date, text
) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text, text, text[]) to authenticated;
grant execute on function public.assign_booking_driver(uuid, uuid, text) to authenticated;
grant execute on function public.update_booking_status(uuid, text, text, numeric, numeric, numeric) to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- AFTER RUNNING
-- ---------------------------------------------------------------------------
-- 1. In Supabase Dashboard -> Authentication -> Providers -> Email:
--    enable Email provider and "Allow new users to sign up".
-- 2. Choose whether email confirmation is required.
-- 3. Keep both Storage buckets PRIVATE.
-- 4. Tell the developer the script completed successfully.
-- 5. Do not remove app_store yet. It remains the rollback source until migration.
