begin;

-- Additive: historical inspections and all existing photos are preserved.
alter table public.booking_inspections add column if not exists checklist jsonb;

create or replace function public.save_pickup_checklist(
  p_booking_id uuid,
  p_checklist jsonb,
  p_complete boolean default false
)
returns public.booking_inspections
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  booking public.bookings;
  saved public.booking_inspections;
  field_name text;
  photo_label text;
  mileage numeric;
  required_labels text[] := array[
    'Front of car','Driver side','Driver side front wheel','Driver side rear wheel',
    'Back side','Passenger side','Passenger side front wheel','Passenger side rear wheel',
    'Mileage','Exterior','Back seats','Keys'
  ];
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role='driver' and p.status='Active'
  ) then raise exception 'An active Driver sign-in is required' using errcode='42501'; end if;
  select * into booking from public.bookings where id=p_booking_id for update;
  if booking.id is null or booking.driver_id is distinct from auth.uid() then
    raise exception 'This booking is not assigned to you' using errcode='42501';
  end if;
  if booking.status <> 'Driver Assigned' then
    raise exception 'Pickup can only be saved before pickup on a Driver Assigned booking';
  end if;
  if jsonb_typeof(p_checklist) is distinct from 'object'
     or p_checklist->'version' is distinct from '1'::jsonb
     or p_checklist->'ready' is distinct from 'true'::jsonb
     or p_checklist->'declaration' is distinct from 'true'::jsonb then
    raise exception 'A version 1 pickup checklist, Ready to Pickup and declaration are required';
  end if;
  foreach field_name in array array['electricVehicle','spareTyre','logBook','serviceHistory','damagePresent'] loop
    if coalesce(p_checklist->>field_name,'') not in ('yes','no') then
      raise exception 'Answer Yes or No for %', field_name;
    end if;
  end loop;
  if coalesce(p_checklist->>'condition','') not in ('Good','Fair','Damage Present','Not Roadworthy')
     or coalesce(p_checklist->>'fuelLevel','') not in ('Empty','Quarter','Half','Three Quarters','Full')
     or jsonb_typeof(p_checklist->'mileage') is distinct from 'number' then
    raise exception 'Complete vehicle condition, valid odometer mileage and fuel / charge level';
  end if;
  mileage := (p_checklist->>'mileage')::numeric;
  if mileage<0 or mileage>9999999999.99 then raise exception 'Invalid odometer mileage'; end if;
  if p_checklist->>'electricVehicle'='yes' then
    if coalesce(p_checklist->>'chargingCable','') not in ('yes','no') then
      raise exception 'Answer Yes or No for charging cable';
    end if;
    if p_checklist->>'chargingCable'='yes' then
      required_labels:=array_append(required_labels,'Charging cable');
    elsif coalesce(trim(p_checklist->>'chargingCableReason'),'')='' then
      raise exception 'Explain why there is no charging cable';
    end if;
  end if;
  if p_checklist->>'spareTyre'='yes' then required_labels:=array_append(required_labels,'Spare tyre'); end if;
  if p_checklist->>'logBook'='yes' then required_labels:=array_append(required_labels,'Log book'); end if;
  if p_checklist->>'serviceHistory'='yes' then required_labels:=array_append(required_labels,'Service history'); end if;
  if p_checklist->>'condition'='Damage Present' and p_checklist->>'damagePresent'<>'yes' then
    raise exception 'Describe and photograph the damage recorded in the vehicle condition';
  end if;
  foreach photo_label in array required_labels loop
    if not exists (
      select 1 from public.booking_evidence e
      join storage.objects o on o.bucket_id='booking-evidence' and o.name=e.storage_path
      where e.booking_id=p_booking_id and e.evidence_type='pickup' and e.label=photo_label
        and split_part(e.storage_path,'/',1)=p_booking_id::text
    ) then raise exception 'Take and save the required photo: %', photo_label; end if;
  end loop;
  if p_checklist->>'damagePresent'='yes' then
    if coalesce(trim(p_checklist->>'damageComments'),'')='' then raise exception 'Describe the damage present'; end if;
    if not exists (
      select 1 from public.booking_evidence e
      join storage.objects o on o.bucket_id='booking-evidence' and o.name=e.storage_path
      where e.booking_id=p_booking_id and e.evidence_type='pickup'
        and e.label ~ '^Damage photo [1-9][0-9]*$'
        and split_part(e.storage_path,'/',1)=p_booking_id::text
    ) then raise exception 'Take and save at least one damage photo'; end if;
  end if;
  if p_complete then
    select * into saved from public.booking_inspections where booking_id=p_booking_id;
    if saved.id is null or saved.checklist is distinct from p_checklist then
      raise exception 'Save pickup evidence before clicking Picked Up. Save again after any changes.';
    end if;
    -- Status and event are in this transaction. A failure cannot mark an unsaved pickup.
    perform set_config('ukow.validated_pickup',p_booking_id::text,true);
    perform public.update_booking_status(p_booking_id,'Picked Up','Pickup checklist, live photos and declaration saved',null,null,null);
    perform set_config('ukow.validated_pickup','',true);
    return saved;
  end if;
  insert into public.booking_inspections
    (booking_id,condition,odometer_mileage,fuel_level,notes,inspected_by,inspected_at,checklist)
  values
    (p_booking_id,p_checklist->>'condition',mileage,p_checklist->>'fuelLevel',
     nullif(trim(p_checklist->>'notes'),''),auth.uid(),now(),p_checklist)
  on conflict (booking_id) do update set
    condition=excluded.condition,odometer_mileage=excluded.odometer_mileage,
    fuel_level=excluded.fuel_level,notes=excluded.notes,inspected_by=excluded.inspected_by,
    inspected_at=excluded.inspected_at,checklist=excluded.checklist
  returning * into saved;
  return saved;
end;
$$;

revoke all on function public.save_pickup_checklist(uuid,jsonb,boolean) from public,anon;
grant execute on function public.save_pickup_checklist(uuid,jsonb,boolean) to authenticated;

-- Drivers must use the validated Save -> Picked Up flow, not the older status RPC.
create or replace function public.require_saved_driver_pickup()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.status='Picked Up' and old.status is distinct from new.status
     and exists(select 1 from public.profiles where id=auth.uid() and role='driver')
     and current_setting('ukow.validated_pickup',true) is distinct from new.id::text then
    raise exception 'Save the pickup checklist and use Picked Up in the Driver portal first';
  end if;
  return new;
end;
$$;
revoke all on function public.require_saved_driver_pickup() from public,anon,authenticated;
drop trigger if exists require_saved_driver_pickup on public.bookings;
create trigger require_saved_driver_pickup before update of status on public.bookings
for each row execute function public.require_saved_driver_pickup();

notify pgrst, 'reload schema';
commit;
