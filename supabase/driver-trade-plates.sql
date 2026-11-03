-- Non-destructive. Requires existing HR screening permissions and portal profiles.
-- Run this whole file in the Supabase SQL editor.
begin;

create sequence if not exists public.driver_trade_plate_version_seq;
create table if not exists public.driver_trade_plates (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  plate_number text not null unique check (plate_number ~ '^[A-Z0-9]{2,20}$'),
  expires_on date not null,
  version bigint not null default nextval('public.driver_trade_plate_version_seq'),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.driver_trade_plates enable row level security;
revoke all on public.driver_trade_plates from public,anon,authenticated;
revoke all on sequence public.driver_trade_plate_version_seq from public,anon,authenticated;

create or replace function public.list_driver_trade_plates()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if not public.hr_screening_access(true) then
    raise exception 'Active Admin or HR management access required' using errcode='42501';
  end if;
  return jsonb_build_object(
    'canManage',true,
    'drivers',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',coalesce(nullif(p.full_name,''),nullif(p.name,''),'Driver'))
      order by coalesce(p.full_name,p.name),p.id)
      from public.profiles p where p.role='driver' and lower(p.status)='active'),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object(
      'driver_id',t.driver_id,'driver_name',coalesce(nullif(p.full_name,''),nullif(p.name,''),'Driver'),
      'plate_number',t.plate_number,'expires_on',t.expires_on,'version',t.version)
      order by coalesce(p.full_name,p.name),p.id)
      from public.driver_trade_plates t join public.profiles p on p.id=t.driver_id),'[]'::jsonb));
end $$;

create or replace function public.my_driver_trade_plate()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid()
    and p.role='driver' and lower(p.status)='active') then
    raise exception 'An active Driver sign-in is required' using errcode='42501';
  end if;
  return jsonb_build_object('assignment',(
    select jsonb_build_object('driver_id',t.driver_id,
      'driver_name',coalesce(nullif(p.full_name,''),nullif(p.name,''),'Driver'),
      'plate_number',t.plate_number,'expires_on',t.expires_on,'version',t.version)
    from public.driver_trade_plates t join public.profiles p on p.id=t.driver_id
    where t.driver_id=auth.uid()));
end $$;

create or replace function public.save_driver_trade_plate(
  p_driver_id uuid,p_plate_number text,p_expires_on date,p_expected_version bigint default 0)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare plate text; current_plate public.driver_trade_plates; saved public.driver_trade_plates; driver_name text;
begin
  if not public.hr_screening_access(true) then
    raise exception 'Active Admin or HR management access required' using errcode='42501';
  end if;
  plate:=upper(regexp_replace(coalesce(p_plate_number,''),'[[:space:]-]','','g'));
  if plate !~ '^[A-Z0-9]{2,20}$' then
    raise exception 'Enter a trade plate number with 2 to 20 letters or digits';
  end if;
  if p_expires_on is null or not isfinite(p_expires_on)
    or p_expires_on<(now() at time zone 'Europe/London')::date then
    raise exception 'Choose today or a future trade plate expiry date';
  end if;
  -- Serialise plate allocation to prevent two HR users assigning the same plate.
  perform pg_advisory_xact_lock(hashtextextended('ukow-driver-trade-plates',0));
  select coalesce(nullif(p.full_name,''),nullif(p.name,''),'Driver') into driver_name
    from public.profiles p where p.id=p_driver_id and p.role='driver' and lower(p.status)='active' for update;
  if not found then raise exception 'Choose an active saved Driver'; end if;
  select * into current_plate from public.driver_trade_plates where driver_id=p_driver_id for update;
  if coalesce(current_plate.version,0) is distinct from p_expected_version then
    raise exception 'This assignment changed. Refresh the list and review it before saving';
  end if;
  if exists(select 1 from public.driver_trade_plates where plate_number=plate and driver_id<>p_driver_id) then
    raise exception 'This trade plate is assigned to another Driver. Remove that assignment first';
  end if;
  insert into public.driver_trade_plates(driver_id,plate_number,expires_on,updated_by)
    values(p_driver_id,plate,p_expires_on,auth.uid())
  on conflict(driver_id) do update set plate_number=excluded.plate_number,
    expires_on=excluded.expires_on,updated_by=excluded.updated_by,updated_at=now(),
    version=nextval('public.driver_trade_plate_version_seq')
  returning * into saved;
  return jsonb_build_object('driver_id',saved.driver_id,'driver_name',driver_name,
    'plate_number',saved.plate_number,'expires_on',saved.expires_on,'version',saved.version);
end $$;

create or replace function public.remove_driver_trade_plate(p_driver_id uuid,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_plate public.driver_trade_plates;
begin
  if not public.hr_screening_access(true) then
    raise exception 'Active Admin or HR management access required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ukow-driver-trade-plates',0));
  select * into current_plate from public.driver_trade_plates where driver_id=p_driver_id for update;
  if not found then raise exception 'This assignment was already removed. Refresh the list'; end if;
  if current_plate.version is distinct from p_expected_version then
    raise exception 'This assignment changed. Refresh the list before removing it';
  end if;
  delete from public.driver_trade_plates where driver_id=p_driver_id;
  return jsonb_build_object('removed',true);
end $$;

revoke all on function public.list_driver_trade_plates(),public.my_driver_trade_plate(),
  public.save_driver_trade_plate(uuid,text,date,bigint),public.remove_driver_trade_plate(uuid,bigint)
  from public,anon;
grant execute on function public.list_driver_trade_plates(),public.my_driver_trade_plate(),
  public.save_driver_trade_plate(uuid,text,date,bigint),public.remove_driver_trade_plate(uuid,bigint)
  to authenticated;
notify pgrst, 'reload schema';
commit;
