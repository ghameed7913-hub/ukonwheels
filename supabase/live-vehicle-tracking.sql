-- Additive setup for the existing UK On Wheels Supabase project.
-- Run the WHOLE file. No bookings, users or evidence are deleted.
begin;
create schema if not exists ukow_tracking_private;
revoke all on schema ukow_tracking_private from public,anon,authenticated;
create table if not exists ukow_tracking_private.sessions (
  token_hash text primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours',
  revoked_at timestamptz
);
create unique index if not exists ukow_one_tracking_job_per_driver
  on ukow_tracking_private.sessions(driver_id) where revoked_at is null;
create index if not exists ukow_tracking_booking_idx on ukow_tracking_private.sessions(booking_id);
create table if not exists ukow_tracking_private.locations (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  driver_id uuid not null,
  token_hash text not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision not null,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);
alter table ukow_tracking_private.sessions enable row level security;
alter table ukow_tracking_private.locations enable row level security;
revoke all on all tables in schema ukow_tracking_private from public,anon,authenticated;

create or replace function ukow_tracking_private.driver_allowed(p_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.profiles p
    where p.id=p_id and p.role='driver' and lower(p.status)='active'
    and not exists(
      select 1 from public.hr_employee_records h
      cross join (values ('licenceExpiry'),('passportExpiry'),('visaExpiry')) f(key)
      where (h.data->>'portalUserId'=p.id::text
        or (nullif(h.data->>'portalUserId','') is null and nullif(trim(p.email),'') is not null
          and lower(trim(h.data->>'email'))=lower(trim(p.email))))
      and h.data->>f.key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and h.data->>f.key < to_char((now() at time zone 'Europe/London')::date,'YYYY-MM-DD')))
$$;
create or replace function ukow_tracking_private.eligible(p_status text)
returns boolean language sql immutable as $$
  select p_status in ('Picked Up','On Route','Delayed','Accident','Claims','Fault On Route','Assigned AA on Route')
$$;

create or replace function public.start_vehicle_tracking(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare b public.bookings; token text; digest text; expiry timestamptz;
begin
  if not ukow_tracking_private.driver_allowed(auth.uid()) then
    raise exception 'An active Driver with valid required documents must sign in' using errcode='42501';
  end if;
  -- One physical Driver location cannot represent two simultaneous delivery jobs.
  perform 1 from public.profiles where id=auth.uid() for update;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.driver_id is distinct from auth.uid()
    or b.delivered_at is not null or not ukow_tracking_private.eligible(b.status) then
    raise exception 'Only your picked-up, undelivered assigned vehicle can share location' using errcode='42501';
  end if;
  update ukow_tracking_private.sessions set revoked_at=now()
    where revoked_at is null and (driver_id=auth.uid() or booking_id=b.id);
  delete from ukow_tracking_private.sessions where coalesce(revoked_at,expires_at)<now()-interval '7 days';
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  digest:=encode(sha256(convert_to(token,'UTF8')),'hex');
  expiry:=now()+interval '24 hours';
  insert into ukow_tracking_private.sessions(token_hash,booking_id,driver_id,expires_at)
    values(digest,b.id,auth.uid(),expiry);
  delete from ukow_tracking_private.locations where booking_id=b.id;
  return jsonb_build_object('token',token,'booking_id',b.id,'reference',b.reference,
    'owner_id',auth.uid(),'expires_at',expiry);
end $$;

-- A narrowly scoped, expiring write-only capability lets the native location
-- task report without copying portal sign-in/access/refresh tokens to the phone.
create or replace function public.publish_vehicle_location(
  p_token text,p_latitude double precision,p_longitude double precision,
  p_accuracy double precision,p_recorded_at timestamptz)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare s ukow_tracking_private.sessions; b public.bookings; last_point ukow_tracking_private.locations;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('active',false,'accepted',false);
  end if;
  select * into s from ukow_tracking_private.sessions
    where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then return jsonb_build_object('active',false,'accepted',false); end if;
  -- Match booking writers' lock order; reassignment/delivery wins atomically.
  select * into b from public.bookings where id=s.booking_id for update;
  select * into s from ukow_tracking_private.sessions where token_hash=s.token_hash for update;
  if s.revoked_at is not null or s.expires_at<=now()
    or b.id is null or b.driver_id is distinct from s.driver_id or b.delivered_at is not null
    or not ukow_tracking_private.eligible(b.status)
    or not ukow_tracking_private.driver_allowed(s.driver_id) then
    update ukow_tracking_private.sessions set revoked_at=coalesce(revoked_at,now()) where token_hash=s.token_hash;
    return jsonb_build_object('active',false,'accepted',false);
  end if;
  if p_latitude is null or not (p_latitude between -90 and 90)
    or p_longitude is null or not (p_longitude between -180 and 180)
    or p_accuracy is null or not (p_accuracy between 0 and 10000)
    or p_recorded_at is null or not isfinite(p_recorded_at)
    or p_recorded_at>now()+interval '1 minute' or p_recorded_at<now()-interval '10 minutes' then
    raise exception 'Invalid or outdated GPS reading';
  end if;
  select * into last_point from ukow_tracking_private.locations where booking_id=b.id;
  if last_point.token_hash=s.token_hash and
    (last_point.recorded_at>=p_recorded_at or last_point.received_at>now()-interval '5 seconds') then
    return jsonb_build_object('active',true,'accepted',false);
  end if;
  insert into ukow_tracking_private.locations
    (booking_id,driver_id,token_hash,latitude,longitude,accuracy,recorded_at)
    values(b.id,s.driver_id,s.token_hash,p_latitude,p_longitude,p_accuracy,p_recorded_at)
  on conflict(booking_id) do update set driver_id=excluded.driver_id,token_hash=excluded.token_hash,
    latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,
    recorded_at=excluded.recorded_at,received_at=now();
  return jsonb_build_object('active',true,'accepted',true);
end $$;

create or replace function public.close_vehicle_tracking(p_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if p_token ~ '^[a-f0-9]{64}$' then
    update ukow_tracking_private.sessions set revoked_at=coalesce(revoked_at,now())
      where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  end if;
  return true;
end $$;

create or replace function public.stop_vehicle_tracking(p_booking_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or not exists(select 1 from public.profiles p where p.id=auth.uid()
    and lower(p.status)='active' and (public.is_portal_admin() or (p.role='driver' and b.driver_id=p.id))) then
    raise exception 'This is not your assigned vehicle' using errcode='42501';
  end if;
  update ukow_tracking_private.sessions set revoked_at=coalesce(revoked_at,now()) where booking_id=b.id;
  return true;
end $$;

create or replace function public.vehicle_tracking_driver_status()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='driver' and lower(status)='active') then
    raise exception 'An active Driver must sign in' using errcode='42501';
  end if;
  return coalesce((select jsonb_build_object('booking_id',s.booking_id,'reference',b.reference,
    'expires_at',s.expires_at,'sharing',true)
    from ukow_tracking_private.sessions s join public.bookings b on b.id=s.booking_id
    where s.driver_id=auth.uid() and b.driver_id=auth.uid() and s.revoked_at is null and s.expires_at>now()
      and b.delivered_at is null and ukow_tracking_private.eligible(b.status)
      and ukow_tracking_private.driver_allowed(auth.uid()) limit 1),jsonb_build_object('sharing',false));
end $$;

create or replace function public.track_vehicle(p_query text default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; q text; result jsonb;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or lower(actor.status)<>'active'
    or not (public.is_portal_admin() or actor.role='client') then
    raise exception 'An active Admin or Client must sign in' using errcode='42501';
  end if;
  if length(coalesce(p_query,''))>80 then raise exception 'Search is too long'; end if;
  q:=upper(regexp_replace(coalesce(p_query,''),'[^a-zA-Z0-9]','','g'));
  select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb) into result from (
    select b.created_at,jsonb_build_object('id',b.id,'reference',b.reference,
      'registration',b.vehicle_registration,'make',b.vehicle_make,'model',b.vehicle_model,
      'status',b.status,'pickup',b.pickup_address,'destination',b.destination_address,
      'driver_name',coalesce(nullif(p.full_name,''),p.name,'Not assigned'),
      'events',coalesce((select jsonb_agg(jsonb_build_object('status',e.to_status,'at',e.created_at)
        order by e.created_at desc) from (select to_status,created_at from public.booking_events
        where booking_id=b.id and to_status is not null order by created_at desc limit 20) e),'[]'::jsonb),
      'sharing',s.token_hash is not null,
      'location',case when l.booking_id is not null then jsonb_build_object(
        'latitude',l.latitude,'longitude',l.longitude,'accuracy',l.accuracy,
        'recorded_at',l.recorded_at,'received_at',l.received_at) else null end) item
    from public.bookings b left join public.profiles p on p.id=b.driver_id
    left join lateral (select t.token_hash from ukow_tracking_private.sessions t
      where t.booking_id=b.id and t.driver_id=b.driver_id and t.revoked_at is null and t.expires_at>now()
        and b.delivered_at is null and ukow_tracking_private.eligible(b.status)
        and ukow_tracking_private.driver_allowed(t.driver_id) limit 1) s on true
    left join ukow_tracking_private.locations l on l.booking_id=b.id and l.driver_id=b.driver_id and l.token_hash=s.token_hash
    where (public.is_portal_admin() or (b.status<>'Cancelled' and
      ((b.business_id is not null and public.is_business_member(b.business_id))
       or b.client_id=actor.id
       or (b.business_id is null and b.created_by=actor.id))))
      and (q='' or upper(regexp_replace(b.reference,'[^a-zA-Z0-9]','','g'))=q
        or upper(regexp_replace(b.vehicle_registration,'[^a-zA-Z0-9]','','g'))=q)
    order by b.created_at desc limit 50
  ) rows;
  return jsonb_build_object('server_time',now(),'bookings',result);
end $$;

create or replace function ukow_tracking_private.booking_changed()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.driver_id is distinct from old.driver_id or new.delivered_at is not null
    or not ukow_tracking_private.eligible(new.status) then
    update ukow_tracking_private.sessions set revoked_at=coalesce(revoked_at,now()) where booking_id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists ukow_stop_vehicle_tracking on public.bookings;
create trigger ukow_stop_vehicle_tracking after update of driver_id,status,delivered_at on public.bookings
  for each row execute function ukow_tracking_private.booking_changed();

revoke all on all functions in schema ukow_tracking_private from public,anon,authenticated;
revoke all on function public.start_vehicle_tracking(uuid),public.stop_vehicle_tracking(uuid),
  public.vehicle_tracking_driver_status(),public.track_vehicle(text),
  public.publish_vehicle_location(text,double precision,double precision,double precision,timestamptz),
  public.close_vehicle_tracking(text) from public,anon,authenticated;
grant execute on function public.start_vehicle_tracking(uuid),public.stop_vehicle_tracking(uuid),
  public.vehicle_tracking_driver_status(),public.track_vehicle(text) to authenticated;
grant execute on function public.publish_vehicle_location(text,double precision,double precision,double precision,timestamptz),
  public.close_vehicle_tracking(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
