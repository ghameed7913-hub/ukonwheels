const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {spawnSync}=require("node:child_process");
test("review safely replaces stale requests without changing the booking or bypassing approval",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-approval-review-")),data=path.join(dir,"data"),port="55450";
 const uid="00000000-0000-0000-0000-000000000001",bid="00000000-0000-0000-0000-000000000011";
 let started=false;
 function run(bin,args,input){const r=spawnSync(bin,args,{encoding:"utf8",input});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
 function sql(q){return run("psql",["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],q);}
 const actor=`set test.actor='${uid}';set role authenticated;`;
 const json=q=>JSON.parse(sql(actor+q).trim());
 function denied(q,re){const r=spawnSync("psql",["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{encoding:"utf8",input:actor+q});assert.notEqual(r.status,0);assert.match(r.stderr,re);}
 const literal=x=>"'"+JSON.stringify(x).replace(/'/g,"''")+"'::jsonb";
 const root=path.resolve(__dirname,"../../../supabase");
 try{
  run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale"]);
  run("pg_ctl",["-D",data,"-o",`-k ${dir} -p ${port} -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
  sql(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
   create table profiles(id uuid primary key,role text,status text,full_name text,name text);
   insert into profiles values('${uid}','staff','Active','Operations User','Operations User');
   create function public.has_portal_permission(text) returns boolean language sql stable as $$select true$$;
   create function public.is_business_member(uuid) returns boolean language sql stable as $$select false$$;
   create table bookings(id uuid primary key,reference text unique,status text,miles numeric,amount numeric,destination_address text,delivered_at timestamptz,journey_started_at timestamptz,driver_id uuid,client_id uuid,created_by uuid,business_id uuid,updated_at timestamptz);
   create table booking_events(booking_id uuid,event_type text,from_status text,to_status text,notes text,created_by uuid);
   create table app_store(id text primary key,data jsonb,updated_at timestamptz);
   create function public.admin_update_booking_details(p_booking_id uuid,p_miles numeric default null,p_amount numeric default null,p_destination_address text default null)
    returns public.bookings language plpgsql security definer as $$declare b public.bookings;begin
    update public.bookings set miles=coalesce(p_miles,miles),amount=coalesce(p_amount,amount),destination_address=coalesce(p_destination_address,destination_address)
    where id=p_booking_id returning * into b;return b;end$$;
   create function public.update_booking_status(p_booking_id uuid,p_status text,p_notes text,p_latitude numeric,p_longitude numeric,p_accuracy_metres numeric)
    returns public.bookings language plpgsql security definer as $$declare b public.bookings;begin
    update public.bookings set status=p_status where id=p_booking_id returning * into b;return b;end$$;
   insert into bookings(id,reference,status,miles,amount,destination_address) values('${bid}','B1','Picked Up',10,100,'London');
   insert into app_store values('main','{"bookings":[{"ref":"B1","_normalizedId":"${bid}","status":"Picked Up","miles":10,"amount":100,"destination":"London","pickupPhotos":{"front":"keep"}}],"updateRequests":[],"notifications":[]}',now());
   grant select,update on bookings,app_store to authenticated;`);
  for(const file of ["pending-booking-approvals.sql","booking-change-security.sql","client-booking-deletion.sql","review-booking-approvals.sql","review-booking-approvals.sql"])
   sql(fs.readFileSync(path.join(root,file),"utf8"));
  const original=json("select request_booking_change('B1','{\"amount\":150,\"destination\":\"Leeds\"}','Extra distance');").request;
  denied(`select review_booking_update('${original.id}');`,/active Admin/);
  sql("update profiles set role='admin',full_name='Super Admin';update bookings set status='On Route',miles=30,amount=110,destination_address='Manchester';");
  denied(`select approve_booking_updates(array['${original.id}']);`,/changed after this request/);
  const review=json(`select review_booking_update('${original.id}');`);
  assert.equal(review.current.status,"On Route");assert.equal(review.current.miles,30);
  assert.equal(review.request.previous.status,"Picked Up");
  denied(`select resubmit_booking_update('${original.id}',${literal(review.expected)},'{"amount":999}');`,/Only the reviewed/);
  denied(`select resubmit_booking_update('${original.id}',${literal(review.expected)},'{"status":"Picked Up"}');`,/Only the reviewed/);
  denied(`select resubmit_booking_update('${original.id}',${literal(review.expected)},'{}');`,/Select at least/);
  denied(`select resubmit_booking_update('${original.id}','{}','{"amount":150}');`,/changed while/);
  sql(`insert into bookings(id,reference,status,miles,amount,destination_address)
   values('00000000-0000-0000-0000-000000000013','B2','Delivered',20,301,'Bath');
   update app_store set data=jsonb_set(data,'{bookings}',(data->'bookings')||
    '[{"ref":"B2","status":"Delivered","amount":1,"destination":"Old address","timeline":[{"title":"keep this event"}]}]'::jsonb);`);
  const replacement=json(`select resubmit_booking_update('${original.id}',${literal(review.expected)},'{"amount":150}');`).request;
  assert.notEqual(replacement.id,original.id);
  assert.equal(replacement.status,"Pending Approval");
  assert.equal(replacement.previous.status,"On Route");assert.equal(replacement.previous.miles,30);
  assert.equal(replacement.changes.status,"On Route");assert.equal(replacement.changes.destination,"Manchester");
  assert.equal(sql("select amount from bookings where reference='B1';").trim(),"110");
  let state=JSON.parse(sql("select data from app_store where id='main';"));
  const old=state.updateRequests.find(r=>r.id===original.id);
  assert.equal(old.status,"Superseded");assert.equal(old.requestedBy,"Operations User");
  assert.equal(old.replacementRequestId,replacement.id);
  assert.deepEqual(replacement.reviewOfRequestIds,[original.id]);
  assert.equal(state.bookings[0].pickupPhotos.front,"keep");
  assert.equal(state.bookings[0].amount,110);
  assert.equal(state.bookings[0].destination,"Manchester");
  assert.equal(state.bookings[1].amount,301);
  assert.equal(state.bookings[1].destination,"Bath");
  assert.equal(state.bookings[1].timeline[0].title,"keep this event");
  assert.equal(sql("select amount||':'||destination_address from bookings where reference='B2';").trim(),"301:Bath");
  denied(`select resubmit_booking_update('${original.id}',${literal(review.expected)},'{"amount":150}');`,/no longer pending/);
  json(`select approve_booking_updates(array['${replacement.id}']);`);
  assert.equal(sql("select status||':'||miles||':'||amount||':'||destination_address from bookings where reference='B1';").trim(),"On Route:30:150:Manchester");
  const req=json("select request_booking_change('B1','{\"amount\":200}','Another charge');").request;
  const snapshot=json(`select review_booking_update('${req.id}');`);
  sql("update bookings set miles=31;");
  denied(`select resubmit_booking_update('${req.id}',${literal(snapshot.expected)},'{"amount":200}');`,/changed while/);
  state=JSON.parse(sql("select data from app_store;"));
  assert.equal(state.updateRequests.find(r=>r.id===req.id).status,"Pending Approval");
  assert.equal(sql("select count(*) from ukow_approval_private.writes;").trim(),"0");
  const backwards=json("select request_booking_change('B1','{\"status\":\"Picked Up\"}','Old status request');").request;
  sql("update bookings set status='Delivered',delivered_at=now();");
  const delivered=json(`select review_booking_update('${backwards.id}');`);
  denied(`select resubmit_booking_update('${backwards.id}',${literal(delivered.expected)},'{"status":"Picked Up"}');`,/delivered booking/);
  sql(`insert into bookings(id,reference,status,miles,amount,destination_address)
   values('00000000-0000-0000-0000-000000000012','B-CANCELLED','Cancelled',0,100,'London');
   update app_store set data=jsonb_set(jsonb_set(data,'{bookings}',(data->'bookings')||
    '[{"ref":"B-CANCELLED","status":"Cancelled","driver":"","amount":100,"destination":"London"}]'::jsonb),
    '{updateRequests}',(data->'updateRequests')||'[{"id":"CANCELLED-REQ","bookingRef":"B-CANCELLED","status":"Pending Approval","previous":{"amount":100},"changes":{"amount":150}}]'::jsonb);`);
  denied("select review_booking_update('CANCELLED-REQ');",/booking was deleted/);
  sql("update profiles set status='Inactive';");
  denied(`select review_booking_update('${req.id}');`,/active Admin/);
  denied(`select ukow_review_private.locked_review('${req.id}');`,/permission denied/);
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{encoding:"utf8"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
