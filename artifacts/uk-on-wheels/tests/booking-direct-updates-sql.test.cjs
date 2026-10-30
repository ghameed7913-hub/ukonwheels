const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {spawnSync}=require("node:child_process");
test("direct booking saves retain permissions, history, evidence and holiday approval",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-direct-")),data=path.join(dir,"data"),port="55451";
 const uid="00000000-0000-0000-0000-000000000001",bid="00000000-0000-0000-0000-000000000011";
 const root=path.resolve(__dirname,"../../../supabase");let started=false;
 function run(bin,args,input){const r=spawnSync(bin,args,{encoding:"utf8",input});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
 const args=["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"];
 const actor=`set test.actor='${uid}';set role authenticated;`;
 function sql(q){return run("psql",args,q);}
 function denied(q,re,who=actor){const r=spawnSync("psql",args,{encoding:"utf8",input:who+q});assert.notEqual(r.status,0);assert.match(r.stderr,re);}
 const lit=x=>"'"+JSON.stringify(x).replace(/'/g,"''")+"'::jsonb";
 const save=(changes,expected,ref="B1")=>JSON.parse(sql(actor+`select save_booking_changes('${ref}',${lit(changes)},${lit(expected)},'Test direct edit');`));
 try{
  run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale"]);
  run("pg_ctl",["-D",data,"-o",`-k ${dir} -p ${port} -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
  sql(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
   create table profiles(id uuid primary key,role text,status text,full_name text,name text);
   insert into profiles values('${uid}','staff','Active','Operations User','Operations User');
   create function public.has_portal_permission(p text) returns boolean language sql stable as $$
    select p=any(string_to_array(coalesce(nullif(current_setting('test.permissions',true),''),'bookings:manage,bookings:status'),','))$$;
   create function public.is_portal_admin() returns boolean language sql stable as $$select exists(select 1 from profiles where id=auth.uid() and role='admin' and status='Active')$$;
   create function public.is_business_member(uuid) returns boolean language sql stable as $$select false$$;
   create table bookings(id uuid primary key,reference text unique,status text,miles numeric,amount numeric,destination_address text,
    delivered_at timestamptz,journey_started_at timestamptz,driver_id uuid,client_id uuid,created_by uuid,business_id uuid,updated_at timestamptz,
    vehicle_make text,vehicle_model text,vehicle_registration text,pickup_address text,service_type text,booking_date date,
    requested_delivery_date date,receiver_name text,receiver_mobile text,payment_status text);
   create table booking_events(booking_id uuid,event_type text,from_status text,to_status text,notes text,created_by uuid);
   create table app_store(id text primary key,data jsonb,updated_at timestamptz);
   create function public.update_booking_status(p_booking_id uuid,p_status text,p_notes text,p_latitude numeric,p_longitude numeric,p_accuracy_metres numeric)
    returns public.bookings language plpgsql security definer as $$declare b public.bookings;begin
    update public.bookings set status=p_status,journey_started_at=case when p_status='On Route' then now() else journey_started_at end
     where id=p_booking_id returning * into b;return b;end$$;
   insert into bookings(id,reference,status,miles,amount,destination_address,vehicle_make,vehicle_model,vehicle_registration,pickup_address)
    values('${bid}','B1','Picked Up',10,100,'London','Ford','Fiesta','AB12 CDE','Glasgow');
   insert into app_store values('main','{"bookings":[{"ref":"B1","_normalizedId":"${bid}","status":"Picked Up","miles":10,"amount":100,"destination":"London","pickupPhotos":{"front":"keep"},"approvalHistory":[{"action":"Update Approved","approvedBy":"Past Admin"}]},{"ref":"LEGACY","status":"Driver Assigned","miles":5,"amount":30,"destination":"Leeds","reg":"CD34 EFG"}],"updateRequests":[{"id":"OLD","status":"Pending Approval","changes":{"amount":999}}],"holidays":[{"id":"H1","status":"Pending"}],"notifications":[]}',now());
   grant select,insert,update,delete on bookings,app_store to authenticated;`);
  const workflow=fs.readFileSync(path.join(root,"portal_workflow_patch.sql"),"utf8");
  const start=workflow.indexOf("create or replace function public.admin_update_booking_details(");
  sql(workflow.slice(start,workflow.indexOf("$$;",workflow.indexOf("as $$",start))+3));
  for(const file of ["pending-booking-approvals.sql","booking-change-security.sql","client-booking-deletion.sql","review-booking-approvals.sql","booking-direct-updates.sql","booking-direct-updates.sql"])
   sql(fs.readFileSync(path.join(root,file),"utf8"));
  const original=JSON.parse(sql("select data from app_store;"));
  const first=save({amount:150,destination:"Manchester",status:"On Route"},{amount:100,destination:"London",status:"Picked Up"});
  assert.equal(first.saved,true);assert.equal(first.booking.amount,150);assert.equal(first.booking.status,"On Route");
  assert.equal(first.booking.lastUpdatedBy,"Operations User");
  assert.equal(first.booking.pickupPhotos.front,"keep");
  assert.deepEqual(first.booking.approvalHistory,original.bookings[0].approvalHistory);
  let state=JSON.parse(sql("select data from app_store;"));
  assert.deepEqual(state.updateRequests,original.updateRequests);
  assert.deepEqual(state.holidays,original.holidays);
  assert.equal(sql("select amount||':'||destination_address from bookings where reference='B1';").trim(),"150:Manchester");
  denied(`select request_booking_change('B1','{"amount":999}','old browser');`,/permission denied/);
  denied("select approve_booking_updates(array['OLD']);",/permission denied/);
  denied("select review_booking_update('OLD');",/permission denied/);
  denied("select resubmit_booking_update('OLD','{}','{}');",/permission denied/);
  denied(`update bookings set amount=999 where id='${bid}';`,/require Admin approval/);
  for(const role of ["client","driver"]){
   sql(`update profiles set role='${role}';`);
   denied(`select save_booking_changes('B1','{"amount":999}','{"amount":150}');`,/active Admin or authorized/);
  }
  sql("update profiles set role='staff';");
  denied("set test.permissions='bookings:manage,portal:configured,portal:amount';select save_booking_changes('B1','{\"destination\":\"Bypass\"}','{\"destination\":\"Manchester\"}');",/permission/);
  const scoped=JSON.parse(sql(actor+"set test.permissions='bookings:manage,portal:configured,portal:amount';select save_booking_changes('B1','{\"amount\":160}','{\"amount\":150}');"));
  assert.equal(scoped.booking.amount,160);
  sql("update bookings set miles=35 where reference='B1';");
  assert.equal(save({amount:170},{amount:160}).booking.miles,35);
  denied("select save_booking_changes('B1','{\"amount\":180}','{\"amount\":160}');",/changed while/);
  denied("select save_booking_changes('B1','{\"amount\":-1}','{\"amount\":170}');",/non-negative/);
  denied("select save_booking_changes('B1','{\"lastApprovedBy\":\"Fake\"}','{}');",/valid booking changes/);
  denied("select save_booking_changes('B1','{\"amount\":180,\"bookingDate\":\"bad-date\"}','{\"amount\":170,\"bookingDate\":\"\"}');",/invalid input syntax/);
  assert.equal(sql("select amount from bookings where reference='B1';").trim(),"170");
  assert.equal(sql("select count(*) from ukow_approval_private.writes;").trim(),"0");
  const mixed=save({amount:180,receiver:"New Receiver",pickup:"New Collection",reg:"ZZ99 ZZZ",vehicle:"Vauxhall Corsa"},
   {amount:170,receiver:"",pickup:"Glasgow",reg:"AB12 CDE",vehicle:"Ford Fiesta"});
  assert.equal(mixed.booking.receiver,"New Receiver");assert.equal(mixed.booking.vehicle,"Vauxhall Corsa");
  assert.equal(mixed.booking.reg,"ZZ99 ZZZ");assert.equal(mixed.booking.pickup,"New Collection");
  assert.equal(save({amount:50,destination:"York"},{amount:30,destination:"Leeds"},"LEGACY").booking.destination,"York");
  sql("update bookings set status='Delivered',delivered_at=now() where reference='B1';");
  assert.equal(save({destination:"Delivered address correction"},{destination:"Manchester"}).saved,true);
  denied("select save_booking_changes('B1','{\"status\":\"Picked Up\"}','{\"status\":\"Delivered\"}');",/delivered booking/);
  sql(`insert into bookings(id,reference,status,amount,miles,destination_address) values('00000000-0000-0000-0000-000000000012','DELETED','Cancelled',10,1,'York');`);
  denied("select save_booking_changes('DELETED','{\"amount\":20}','{\"amount\":10}');",/deleted booking/);
  sql("update profiles set status='Inactive';");
  denied("select save_booking_changes('B1','{\"amount\":999}','{\"amount\":180}');",/active Admin or authorized/);
  denied("select save_booking_changes('B1','{\"amount\":999}','{\"amount\":180}');",/permission denied/,"set role anon;");
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{encoding:"utf8"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
