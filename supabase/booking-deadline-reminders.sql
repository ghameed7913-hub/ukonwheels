-- Run the WHOLE file in the existing portal Supabase project.
-- Requires driver-push-notifications.sql. No booking journey status is changed.
begin;
do $$
begin
 if to_regprocedure('public.dispatch_driver_push_notifications()') is null then
  raise exception 'Run supabase/driver-push-notifications.sql first, then run this whole file again.';
 end if;
end $$;

create schema if not exists ukow_deadlines_private;
revoke all on schema ukow_deadlines_private from public,anon,authenticated;
create table if not exists ukow_deadlines_private.reminders (
 booking_id uuid not null references public.bookings(id) on delete cascade,
 kind text not null check(kind in ('pickup','delivery')),
 due_date date not null,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 notification_id uuid unique references public.notifications(id) on delete set null,
 primary key(booking_id,kind,due_date,recipient_id)
);
revoke all on all tables in schema ukow_deadlines_private from public,anon,authenticated;
alter table ukow_deadlines_private.reminders enable row level security;

create or replace function ukow_deadlines_private.stage(b public.bookings)
returns text language sql immutable set search_path=pg_catalog,public as $$
 select case
 when b.delivered_at is not null or lower(b.status) in ('delivered','cancelled','canceled','deleted') then null
 when b.picked_up_at is not null or b.journey_started_at is not null
  or lower(b.status) in ('picked up','on route','out for delivery','delayed','accident','claims','fault on route','assigned aa on route')
 then 'delivery'
 when lower(b.status) in ('new booked vehicle','driver assigned') then 'pickup'
 end
$$;

create or replace function public.booking_deadline_notification_current(p_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce((
 select ukow_deadlines_private.stage(b)=r.kind
  and r.due_date=case when r.kind='pickup' then b.booking_date else b.requested_delivery_date end
  and r.due_date=(now() at time zone 'Europe/London')::date+1
  and (lower(p.role)='admin' or (lower(p.role)='driver' and b.driver_id=p.id))
  and lower(p.status)='active'
 from ukow_deadlines_private.reminders r
 join public.bookings b on b.id=r.booking_id
 join public.profiles p on p.id=r.recipient_id
 where r.notification_id=p_id
 ),false)
$$;

create or replace function public.generate_booking_deadline_reminders(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare today date:=(p_at at time zone 'Europe/London')::date; item record; nid uuid; total integer:=0;
begin
 if not pg_try_advisory_xact_lock(87229142) then return 0; end if;
 -- Date-only bookings: first reminder at/after 08:00 UK time the day before.
 if (p_at at time zone 'Europe/London')::time < time '08:00' then return 0; end if;
 for item in
  select b.id,b.reference,b.vehicle_registration,s.kind,d.due_date,p.id recipient_id
  from public.bookings b
  cross join lateral (select ukow_deadlines_private.stage(b) kind) s
  cross join lateral (select case when s.kind='pickup' then b.booking_date else b.requested_delivery_date end due_date) d
  join public.profiles p on lower(p.status)='active'
   and (lower(p.role)='admin' or (lower(p.role)='driver' and p.id=b.driver_id))
  where s.kind is not null and d.due_date=today+1
 loop
  insert into ukow_deadlines_private.reminders(booking_id,kind,due_date,recipient_id)
   values(item.id,item.kind,item.due_date,item.recipient_id) on conflict do nothing;
  if not found then continue; end if;
  nid:=gen_random_uuid();
  -- Reserve this recipient/date before inserting its notification.
  insert into public.notifications(id,recipient_id,booking_id,title,message,notification_type)
   values(nid,item.recipient_id,item.id,
    case when item.kind='pickup' then 'Pickup due tomorrow' else 'Delivery due tomorrow — action required' end,
    format('%s (%s): %s is due on %s.%s',item.reference,coalesce(item.vehicle_registration,''),
     item.kind,to_char(item.due_date,'DD Mon YYYY'),
     case when item.kind='delivery' then ' Delayed alert: prioritise delivery. Actual journey status is unchanged.' else '' end),
    'booking_'||item.kind||'_reminder');
  update ukow_deadlines_private.reminders set notification_id=nid
   where booking_id=item.id and kind=item.kind and due_date=item.due_date and recipient_id=item.recipient_id;
  total:=total+1;
 end loop;
 return total;
end $$;

-- Existing assignment/instruction pushes are preserved. Reminder pushes use the
-- same private device queue, receipt checks and retry rules.
create or replace function public.queue_driver_notification()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.notification_type not in ('job_assignment','driver_instruction','booking_pickup_reminder','booking_delivery_reminder') then return new; end if;
 insert into public.driver_push_deliveries(notification_id,device_id)
  select new.id,d.id from public.driver_push_devices d
  join public.profiles p on p.id=d.user_id
  join auth.sessions s on s.id=d.session_id and s.user_id=d.user_id
  where d.user_id=new.recipient_id and d.active and lower(p.role)='driver'
   and lower(p.status)='active' and (s.not_after is null or s.not_after>now())
  on conflict do nothing;
 return new;
end $$;

-- Guard against applying this patch to an incompatible push sender.
do $$
declare source text; old_guard text:='n.booking_id is null or (b.driver_id=dev.user_id and lower(b.status)<>''delivered'' and b.delivered_at is null)';
 old_title text:='case when d.notification_type=''job_assignment'' then ''New job assigned'' else ''New Driver instructions'' end';
begin
 select pg_get_functiondef('public.dispatch_driver_push_notifications()'::regprocedure) into source;
 if position('booking_deadline_notification_current' in source)=0 then
  if position(old_guard in source)=0 then raise exception 'Push sender differs from expected setup. No changes applied.'; end if;
  source:=replace(source,old_guard,old_guard||' and (n.notification_type not in (''booking_pickup_reminder'',''booking_delivery_reminder'') or public.booking_deadline_notification_current(n.id))');
 end if;
 if position('Pickup due tomorrow' in source)=0 then
  if position(old_title in source)=0 then raise exception 'Push sender title differs from expected setup. No changes applied.'; end if;
  source:=replace(source,old_title,'case d.notification_type when ''job_assignment'' then ''New job assigned'' when ''booking_pickup_reminder'' then ''Pickup due tomorrow'' when ''booking_delivery_reminder'' then ''Delivery due tomorrow — action required'' else ''New Driver instructions'' end');
 end if;
 execute source;
end $$;

create or replace function public.read_booking_deadline_reminders()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare who uuid:=auth.uid(); account_role text; today date:=(now() at time zone 'Europe/London')::date; result jsonb;
begin
 select lower(role) into account_role from public.profiles where id=who and lower(status)='active';
 if account_role is null or account_role not in ('admin','driver') then
  raise exception 'Active Admin or Driver access required' using errcode='42501';
 end if;
 select jsonb_build_object(
  'today',today,
  'notifications',coalesce((select jsonb_agg(x order by x.created_at desc) from (
   select n.id,n.title,n.message,n.created_at,b.reference
   from public.notifications n
   join ukow_deadlines_private.reminders r on r.notification_id=n.id
   join public.bookings b on b.id=r.booking_id
   where n.recipient_id=who and ukow_deadlines_private.stage(b)=r.kind
    and r.due_date=case when r.kind='pickup' then b.booking_date else b.requested_delivery_date end
    and r.due_date>=today and r.due_date<=today+1
    and (account_role='admin' or b.driver_id=who)
   order by n.created_at desc limit 100
  ) x),'[]'::jsonb),
  'urgent',coalesce((select jsonb_agg(x) from (
   select b.id,b.reference,b.vehicle_registration,b.requested_delivery_date
   from public.bookings b where ukow_deadlines_private.stage(b)='delivery'
    and b.requested_delivery_date<=today+1
    and (account_role='admin' or b.driver_id=who)
  ) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;

revoke all on function ukow_deadlines_private.stage(public.bookings),
 public.generate_booking_deadline_reminders(timestamptz),public.booking_deadline_notification_current(uuid),
 public.queue_driver_notification() from public,anon,authenticated;
revoke all on function public.read_booking_deadline_reminders() from public,anon;
grant execute on function public.read_booking_deadline_reminders() to authenticated;
-- BEGIN DEADLINE SCHEDULER (omitted only by isolated local tests)
select cron.schedule('ukow-booking-deadlines','*/15 * * * *','select public.generate_booking_deadline_reminders()');
-- END DEADLINE SCHEDULER
select public.generate_booking_deadline_reminders();
notify pgrst,'reload schema';
commit;
