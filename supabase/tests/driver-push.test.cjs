// Actual SQL runs ONLY in a disposable local cluster. No remote URL or keys.
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {mkdtempSync,readFileSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
let dir;
const admin='00000000-0000-4000-8000-000000000001',driver='00000000-0000-4000-8000-000000000002',
 other='00000000-0000-4000-8000-000000000003',session='10000000-0000-4000-8000-000000000002',
 booking='20000000-0000-4000-8000-000000000001',project='e2493dec-778d-4129-9a50-2c6849bc1499';
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout.trim();}
function sql(query,ok=true){
 const r=spawnSync('psql',['-h',dir,'-p','25486','-U','push_test','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1','-c',query],{encoding:'utf8'});
 if(ok&&r.status!==0)throw new Error(r.stderr);
 if(!ok){assert.notEqual(r.status,0,'Expected SQL rejection');return r.stderr;}
 return r.stdout.trim();
}
function asDriver(query,who=driver){return sql(`set test.uid='${who}';set test.session='${session}';set role authenticated;${query}`);}
function register(){asDriver(`select public.register_driver_push('ExpoPushToken[test_phone]','android','${project}');`);}
before(()=>{
 dir=mkdtempSync(join(tmpdir(),'ukow-push-'));
 run('initdb',['-D',join(dir,'data'),'-U','push_test','-A','trust','--no-locale']);
 run('pg_ctl',['-D',join(dir,'data'),'-l',join(dir,'server.log'),'-o',`-k ${dir} -h '' -p 25486`,'-w','start']);
 sql(`create role anon;create role authenticated;
 create schema auth;create schema net;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.session',true))$$;
 grant usage on schema auth to authenticated;
 create table public.profiles(id uuid primary key,role text,status text);
 create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create table public.bookings(id uuid primary key,reference text,driver_id uuid,status text,delivered_at timestamptz,assigned_at timestamptz,updated_at timestamptz,
 booking_date date,requested_delivery_date date,picked_up_at timestamptz,journey_started_at timestamptz,vehicle_registration text);
 create table public.booking_events(booking_id uuid,event_type text,from_status text,to_status text,notes text,created_by uuid);
 create table public.notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid,booking_id uuid,title text,message text,notification_type text,created_by uuid,is_read boolean default false,created_at timestamptz default now());
 create function public.has_portal_permission(k text) returns boolean language sql security definer as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
 create table net._http_response(id bigint primary key,status_code integer,content text,timed_out boolean);
 create table net.http_request_queue(id bigint generated always as identity primary key,url text,body jsonb);
 create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language sql as $$insert into net.http_request_queue(url,body) values(url,body) returning id$$;`);
 const source=readFileSync(join(__dirname,'../driver-push-notifications.sql'),'utf8')
  .replace(/-- BEGIN SUPABASE EXTENSIONS[\s\S]*?-- END SUPABASE EXTENSIONS/,'')
  .replace(/-- BEGIN SUPABASE SCHEDULER[\s\S]*?-- END SUPABASE SCHEDULER/,'');
 sql(source);
 const reminders=readFileSync(join(__dirname,'../booking-deadline-reminders.sql'),'utf8')
  .replace(/-- BEGIN DEADLINE SCHEDULER[\s\S]*?-- END DEADLINE SCHEDULER/,'');
 sql(reminders);
});
beforeEach(()=>{
 sql(`truncate public.driver_push_deliveries,public.driver_push_devices,public.notifications,public.bookings,public.booking_events,public.profiles,auth.sessions,net.http_request_queue,net._http_response cascade;
 insert into public.profiles values('${admin}','admin','Active'),('${driver}','driver','Active'),('${other}','driver','Active');
 insert into auth.sessions values('${session}','${driver}',null);
 insert into public.bookings(id,reference,status) values('${booking}','UKOW-TEST','New Booked Vehicle');`);
});
after(()=>{if(dir){spawnSync('pg_ctl',['-D',join(dir,'data'),'-m','immediate','-w','stop']);rmSync(dir,{recursive:true,force:true});}});
test('Assignment queues only the assigned Driver, with no duplicate on a status-only update',()=>{
 register();sql(`update public.bookings set driver_id='${driver}',status='Driver Assigned' where id='${booking}';
 update public.bookings set status='Picked Up' where id='${booking}';`);
 assert.equal(sql('select count(*) from public.driver_push_deliveries'),'1');
 assert.equal(sql('select recipient_id from public.notifications'),driver);
});
test('Instructions save without reassigning and queue another notification',()=>{
 register();sql(`update public.bookings set driver_id='${driver}' where id='${booking}';`);
 sql(`set test.uid='${admin}';set role authenticated;select public.send_driver_instructions('${booking}','Use gate 2');`);
 assert.equal(sql(`select driver_instructions from public.bookings`),'Use gate 2');
 assert.equal(sql('select count(*) from public.driver_push_deliveries'),'2');
 assert.equal(sql('select driver_id from public.bookings'),driver);
});
test('Assignment RPC saves instructions atomically and retains Delivered/reassignment protections',()=>{
 register();
 sql(`set test.uid='${admin}';set role authenticated;select public.reassign_booking_driver('${booking}','${driver}','Collect at gate 3',null);`);
 assert.equal(sql('select driver_instructions from public.bookings'),'Collect at gate 3');
 assert.equal(sql('select count(*) from public.driver_push_deliveries'),'1');
 assert.match(sql(`set test.uid='${admin}';set role authenticated;select public.reassign_booking_driver('${booking}','${other}',null,null);`,false),/assigned driver has changed/);
 sql(`update public.bookings set status='Delivered' where id='${booking}';`);
 assert.match(sql(`set test.uid='${admin}';set role authenticated;select public.reassign_booking_driver('${booking}','${other}',null,'${driver}');`,false),/Delivered jobs are locked/);
});
test('Driver cannot send Admin instructions or read another Driver notification',()=>{
 register();sql(`update public.bookings set driver_id='${driver}' where id='${booking}';`);
 assert.match(sql(`set test.uid='${driver}';set role authenticated;select public.send_driver_instructions('${booking}','Bad');`,false),/Admin or Staff/);
 const id=sql('select id from public.notifications limit 1');
 assert.match(sql(`set test.uid='${other}';set role authenticated;select public.read_driver_push_notification('${id}');`,false),/not for/);
 assert.match(sql(`set test.uid='${driver}';set role authenticated;select token from public.driver_push_devices;`,false),/permission denied/);
 assert.match(sql(`set role authenticated;select public.dispatch_driver_push_notifications();`,false),/permission denied/);
});
test('Dispatcher sends a privacy-safe notification while no phone or browser is running',()=>{
 register();sql(`update public.bookings set driver_id='${driver}' where id='${booking}';select public.dispatch_driver_push_notifications();`);
 const body=JSON.parse(sql('select body from net.http_request_queue limit 1'));
 assert.equal(body.to,'ExpoPushToken[test_phone]');
 assert.equal(body.data.kind,'ukow-driver');
 assert.equal(body.channelId,'driver-jobs');
 assert.equal(body.title,'New job assigned');
 assert.equal(body.body.includes('UKOW-TEST'),false);
 assert.equal(sql('select stage from public.driver_push_deliveries'),'waiting_ticket');
});
test('Expo acceptance is not delivery; receipt confirms delivery later',()=>{
 register();sql(`update public.bookings set driver_id='${driver}' where id='${booking}';select public.dispatch_driver_push_notifications();`);
 const request=sql('select request_id from public.driver_push_deliveries');
 sql(`insert into net._http_response values(${request},200,'{"data":{"status":"ok","id":"ticket-1"}}',false);select public.dispatch_driver_push_notifications();`);
 assert.equal(sql('select stage from public.driver_push_deliveries'),'receipt');
 sql(`update public.driver_push_deliveries set next_at=now();select public.dispatch_driver_push_notifications();`);
 const receipt=sql('select request_id from public.driver_push_deliveries');
 sql(`insert into net._http_response values(${receipt},200,'{"data":{"ticket-1":{"status":"ok"}}}',false);select public.dispatch_driver_push_notifications();`);
 assert.equal(sql('select stage from public.driver_push_deliveries'),'delivered');
});
test('Reassignment cancels the old Driver delivery; sign-out deletes the device registration',()=>{
 register();sql(`update public.bookings set driver_id='${driver}' where id='${booking}';update public.bookings set driver_id='${other}' where id='${booking}';select public.dispatch_driver_push_notifications();`);
 assert.equal(sql('select stage from public.driver_push_deliveries'),'cancelled');
 assert.equal(sql('select count(*) from net.http_request_queue'),'0');
 sql(`delete from auth.sessions where id='${session}';`);
 assert.equal(sql('select count(*) from public.driver_push_devices'),'0');
});
test('Invalid tokens or wrong Expo projects cannot be registered',()=>{
 assert.match(sql(`set test.uid='${driver}';set test.session='${session}';set role authenticated;select public.register_driver_push('bad','android','${project}');`,false),/Invalid notification/);
 assert.match(sql(`set test.uid='${driver}';set test.session='${session}';set role authenticated;select public.register_driver_push('ExpoPushToken[test_phone]','android','${booking}');`,false),/Incorrect Expo/);
});
test('DeviceNotRegistered disables the token and does not pretend delivery succeeded',()=>{
 register();sql(`update public.bookings set driver_id='${driver}' where id='${booking}';select public.dispatch_driver_push_notifications();`);
 const request=sql('select request_id from public.driver_push_deliveries');
 sql(`insert into net._http_response values(${request},200,'{"data":{"status":"error","details":{"error":"DeviceNotRegistered"}}}',false);select public.dispatch_driver_push_notifications();`);
 assert.equal(sql('select stage from public.driver_push_deliveries'),'failed');
 assert.equal(sql('select active from public.driver_push_devices'),'f');
});
const tomorrow="(now() at time zone 'Europe/London')::date+1";
const lunchtime="(((now() at time zone 'Europe/London')::date+time '12:00') at time zone 'Europe/London')";
function due(kind='pickup'){
 sql(`update public.bookings set driver_id='${driver}',status='${kind==='pickup'?'Driver Assigned':'Picked Up'}',
 booking_date=${tomorrow},requested_delivery_date=${tomorrow},
 picked_up_at=${kind==='pickup'?'null':'now()'} where id='${booking}';
 truncate public.notifications cascade;`);
}
function remind(){return sql(`select public.generate_booking_deadline_reminders(${lunchtime});`);}
function readReminders(who=driver){return JSON.parse(asDriver('select public.read_booking_deadline_reminders();',who).split('\n').at(-1));}
test('Pickup reminders go once to active Admin and assigned Driver, and enqueue the Driver push',()=>{
 register();due();
 sql(`insert into public.profiles values('00000000-0000-4000-8000-000000000004','admin','Inactive');`);
 assert.equal(remind(),'2');
 assert.equal(remind(),'0');
 assert.equal(sql("select count(*) from public.notifications where notification_type='booking_pickup_reminder'"),'2');
 assert.equal(sql(`select count(*) from public.notifications where recipient_id='${other}'`),'0');
 assert.equal(sql('select count(*) from public.driver_push_deliveries'),'1');
 assert.equal(readReminders().notifications.length,1);
 assert.equal(readReminders(admin).notifications.length,1);
 assert.equal(readReminders().urgent.length,0);
 sql('select public.dispatch_driver_push_notifications();');
 const body=JSON.parse(sql('select body from net.http_request_queue order by id desc limit 1'));
 assert.equal(body.title,'Pickup due tomorrow');
 assert.equal(body.body.includes('UKOW-TEST'),false,'lock-screen body must not contain booking details');
});
test('Delivery reminders require pickup; due picked-up jobs are urgent without overwriting status',()=>{
 due('delivery');assert.equal(remind(),'2');
 assert.equal(sql("select count(*) from public.notifications where notification_type='booking_delivery_reminder'"),'2');
 assert.equal(readReminders().urgent[0].reference,'UKOW-TEST');
 assert.equal(readReminders(other).urgent.length,0);
 assert.equal(readReminders(other).notifications.length,0);
 assert.equal(sql('select status from public.bookings'),'Picked Up');
 sql(`update public.bookings set requested_delivery_date=${tomorrow}+5;`);
 assert.equal(readReminders().urgent.length,0);
 assert.equal(readReminders().notifications.length,0);
});
test('Before 08:00 UK the scheduler waits; UK day before includes a month boundary',()=>{
 due();
 const early="(((now() at time zone 'Europe/London')::date+time '07:45') at time zone 'Europe/London')";
 assert.equal(sql(`select public.generate_booking_deadline_reminders(${early});`),'0');
 sql("update public.bookings set booking_date='2026-11-01';");
 assert.equal(sql("select public.generate_booking_deadline_reminders('2026-10-31 08:00 Europe/London');"),'2');
});
test('Overdue delivery remains urgent; completed and cancelled jobs have neither reminders nor urgent rows',()=>{
 due('delivery');
 sql(`update public.bookings set requested_delivery_date=${tomorrow}-3;`);
 assert.equal(remind(),'0');assert.equal(readReminders().urgent.length,1);
 for(const status of ['Delivered','Cancelled']){
  sql(`update public.bookings set status='${status}',requested_delivery_date=${tomorrow};`);
  assert.equal(remind(),'0');assert.equal(readReminders().urgent.length,0);
 }
});
test('Rescheduled or reassigned reminders are cancelled before push send; new Driver receives their own notice',()=>{
 register();due('delivery');remind();
 sql(`update public.bookings set requested_delivery_date=${tomorrow}+4;
 select public.dispatch_driver_push_notifications();`);
 assert.equal(sql("select count(*) from public.driver_push_deliveries where stage='cancelled'"),'1');
 assert.equal(sql('select count(*) from net.http_request_queue'),'0');
 sql(`update public.bookings set driver_id='${other}',requested_delivery_date=${tomorrow};`);
 assert.equal(remind(),'1','only the newly assigned Driver needs another notice');
 assert.equal(readReminders().notifications.length,0);
 assert.equal(readReminders().urgent.length,0);
 assert.equal(readReminders(other).notifications.length,1);
});
test('Pickup notices expire when collected; delivery reminder can follow independently',()=>{
 register();due();assert.equal(remind(),'2');
 sql(`update public.bookings set picked_up_at=now(),status='Picked Up';
 select public.dispatch_driver_push_notifications();`);
 assert.equal(sql("select stage from public.driver_push_deliveries"),'cancelled');
 assert.equal(readReminders().notifications.length,0);
 assert.equal(remind(),'2');
 assert.equal(readReminders().notifications[0].title,'Delivery due tomorrow — action required');
});
test('Reminder generation is server-only; Client/inactive accounts cannot read Admin/Driver reminders',()=>{
 due();
 assert.match(sql(`set test.uid='${driver}';set role authenticated;select public.generate_booking_deadline_reminders();`,false),/permission denied/);
 sql(`update public.profiles set role='client' where id='${other}';`);
 assert.match(sql(`set test.uid='${other}';set role authenticated;select public.read_booking_deadline_reminders();`,false),/Active Admin or Driver/);
 sql(`update public.profiles set status='Inactive' where id='${driver}';`);
 assert.match(sql(`set test.uid='${driver}';set role authenticated;select public.read_booking_deadline_reminders();`,false),/Active Admin or Driver/);
 assert.match(sql(`set role authenticated;select * from ukow_deadlines_private.reminders;`,false),/permission denied/);
});
test('Reminder SQL can be rerun without duplicating records or changing push guards',()=>{
 due();remind();
 const source=readFileSync(join(__dirname,'../booking-deadline-reminders.sql'),'utf8')
  .replace(/-- BEGIN DEADLINE SCHEDULER[\s\S]*?-- END DEADLINE SCHEDULER/,'');
 sql(source);
 assert.equal(sql("select count(*) from public.notifications"),'2');
 assert.equal(remind(),'0');
});
