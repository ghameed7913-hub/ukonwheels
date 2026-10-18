-- Run only in the disposable database created by run-pickup-checklist-test.sh.
do $$ begin
  if current_database()<>'ukow_pickup_checklist_test'
     or current_setting('ukow.isolated_test',true) is distinct from 'yes' then
    raise exception 'Refusing to create test fixtures outside the isolated test database';
  end if;
end $$;
create role anon;
create role authenticated;
create schema auth;
create schema storage;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create table public.profiles(id uuid primary key,role text,status text);
create table public.bookings(
 id uuid primary key,driver_id uuid,status text,picked_up_at timestamptz,
 journey_started_at timestamptz,delivered_at timestamptz,updated_at timestamptz
);
create table public.booking_evidence(
 booking_id uuid,evidence_type text,storage_path text,label text
);
create table storage.objects(bucket_id text,name text);
create table public.booking_events(
 booking_id uuid,event_type text,from_status text,to_status text,notes text,
 latitude numeric,longitude numeric,accuracy_metres numeric,created_by uuid
);
create table public.booking_inspections(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid unique references public.bookings(id),condition text,
 odometer_mileage numeric(12,2),fuel_level text,notes text,
 inspected_by uuid,inspected_at timestamptz
);
create function public.current_profile_role() returns text language sql stable as $$
 select role from public.profiles where id=auth.uid();
$$;
create function public.has_portal_permission(text) returns boolean language sql stable as $$
 select coalesce(public.current_profile_role()='admin',false);
$$;

insert into public.profiles values
 ('00000000-0000-4000-8000-000000000001','driver','Active'),
 ('00000000-0000-4000-8000-000000000002','driver','Active'),
 ('00000000-0000-4000-8000-000000000003','client','Active'),
 ('00000000-0000-4000-8000-000000000004','admin','Active');
insert into public.bookings(id,driver_id,status) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Driver Assigned');

create function public.test_expect_error(query text,expected text) returns void language plpgsql as $$
begin
 begin execute query;
 exception when others then
   if position(expected in sqlerrm)=0 then raise exception 'Unexpected error: % (expected %)',sqlerrm,expected; end if;
   return;
 end;
 raise exception 'Expected error missing: %',expected;
end;
$$;
