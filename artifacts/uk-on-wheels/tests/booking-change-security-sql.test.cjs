const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {spawnSync}=require("node:child_process");
test("database protects charges and destinations until approval, including direct-write attempts",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-charge-approval-")),data=path.join(dir,"data"),port="55445";
 const uid="00000000-0000-0000-0000-000000000001",bid="00000000-0000-0000-0000-000000000011";
 let started=false;
 function run(bin,args,input){const r=spawnSync(bin,args,{encoding:"utf8",input});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
 function sql(q){return run("psql",["-X","-h",dir,"-p",port,"-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],q);}
 const actor=`set test.actor='${uid}';set role authenticated;`;
 function denied(q,re){const r=spawnSync("psql",["-X","-h",dir,"-p",port,"-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{encoding:"utf8",input:actor+q});assert.notEqual(r.status,0);assert.match(r.stderr,re);}
 const root=path.resolve(__dirname,"../../../supabase");
 try{
  run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale"]);
  run("pg_ctl",["-D",data,"-o",`-k ${dir} -p ${port} -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
  sql(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
   create table public.profiles(id uuid primary key,role text,status text,full_name text,name text);
   insert into public.profiles values('${uid}','staff','Active','Operations User','Operations User');
   create function public.has_portal_permission(p text) returns boolean language sql stable as $$select coalesce(current_setting('test.permission',true),'yes')<>'no'$$;
   create table public.bookings(id uuid primary key,reference text unique,status text,miles numeric,amount numeric,destination_address text,delivered_at timestamptz);
   create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
   grant select,insert,update,delete on public.bookings,public.app_store to authenticated;
   create function public.admin_update_booking_details(p_booking_id uuid,p_miles numeric default null,p_amount numeric default null,p_destination_address text default null)
    returns public.bookings language plpgsql security definer as $$declare b public.bookings;begin
    update public.bookings set miles=coalesce(p_miles,miles),amount=coalesce(p_amount,amount),destination_address=coalesce(p_destination_address,destination_address)
    where id=p_booking_id returning * into b;return b;end$$;
   create function public.update_booking_status(p_booking_id uuid,p_status text,p_notes text,p_latitude numeric,p_longitude numeric,p_accuracy_metres numeric)
    returns public.bookings language plpgsql security definer as $$declare b public.bookings;begin
    update public.bookings set status=p_status where id=p_booking_id returning * into b;return b;end$$;
   insert into public.bookings values('${bid}','B1','Picked Up',10,171.56,'London',null);
   insert into public.app_store values('main','{"bookings":[{"ref":"B1","_normalizedId":"${bid}","status":"Picked Up","miles":10,"amount":171.56,"destination":"London","pickupPhotos":{"front":"keep"}}],"updateRequests":[],"notifications":[]}',now());`);
  sql(fs.readFileSync(path.join(root,"pending-booking-approvals.sql"),"utf8"));
  const patch=fs.readFileSync(path.join(root,"booking-change-security.sql"),"utf8");
  sql(patch);sql(patch); // Rerunning never moves the public wrapper over the private original.
  for(const role of ["staff","admin"]){
   sql(`update public.profiles set role='${role}';`);
   denied(`select public.admin_update_booking_details('${bid}',null,999,null);`,/require Admin approval/);
   denied(`update public.bookings set destination_address='Bypass' where id='${bid}';`,/require Admin approval/);
   denied(`select set_config('ukow.approved','true',false);update public.bookings set amount=999 where id='${bid}';`,/require Admin approval/);
   denied(`select ukow_approval_private.approve_booking_updates(array['fake']);`,/permission denied/);
   denied(`delete from public.bookings where id='${bid}';`,/cannot be removed/);
   denied(`update public.app_store set data=jsonb_set(data,'{bookings,0,amount}','999') where id='main';`,/match the approved booking/);
   denied(`update public.app_store set data=jsonb_set(data,'{bookings}','[]') where id='main';`,/cannot be removed/);
   denied(`update public.app_store set id='bypass' where id='main';`,/identity cannot change/);
  }
  // Creation's insert and initial charge are one transaction; later changes are blocked.
  const newId="00000000-0000-0000-0000-000000000012";
  sql(`${actor}begin;insert into public.bookings values('${newId}','B2','New Booked Vehicle',0,0,'York',null);
   update public.bookings set amount=250 where id='${newId}';commit;`);
  assert.equal(sql("select amount from public.bookings where reference='B2';").trim(),"250");
  denied(`update public.bookings set amount=300 where reference='B2';`,/require Admin approval/);
  denied(`begin;update public.bookings set miles=15 where reference='B2';update public.bookings set amount=300 where reference='B2';commit;`,/require Admin approval/);
  // Status, miles and same-value protected writes remain allowed.
  sql(`${actor}select public.admin_update_booking_details('${bid}',12,171.56,'London');`);
  const previousAmount=sql("select amount from public.bookings where reference='B1';").trim();
  sql(`update public.profiles set role='staff';`);
  const request=JSON.parse(sql(`${actor}select public.request_booking_change('B1','{"amount":200,"destination":"Leeds"}','Additional delivery distance');`).trim()).request;
  assert.equal(previousAmount,"171.56");assert.equal(request.status,"Pending Approval");
  assert.equal(request.requestedBy,"Operations User");assert.equal(request.previous.miles,12);
  assert.equal(sql("select destination_address from public.bookings where reference='B1';").trim(),"London");
  const retry=JSON.parse(sql(`${actor}select public.request_booking_change('B1','{"amount":200,"destination":"Leeds"}','retry');`).trim()).request;
  assert.equal(retry.id,request.id);
  denied(`select public.approve_booking_updates(array['${request.id}']);`,/active Admin/);
  denied(`update public.app_store set data=jsonb_set(data,'{updateRequests,0,status}','"Approved"') where id='main';`,/approval process/);
  denied(`select public.request_booking_change('B1','{"amount":-1}','bad');`,/valid amount/);
  denied(`select public.request_booking_change('B1','{"destination":""}','bad');`,/valid amount/);
  denied(`select public.request_booking_change('B1','{"approvedBy":"fake"}','bad');`,/valid booking changes/);
  denied(`set test.permission='no';select public.request_booking_change('B1','{"amount":201}','no permission');`,/permission required/);
  sql("update public.profiles set role='client';");
  denied(`select public.request_booking_change('B1','{"amount":201}','bad');`,/Active Operations/);
  sql("update public.profiles set role='admin',full_name='Super Admin Person';");
  // Whole batch rolls back if any request fails, and no private context leaks.
  denied(`select public.approve_booking_updates(array['${request.id}','ZZ-MISSING']);`,/not found/);
  assert.equal(sql("select amount from public.bookings where reference='B1';").trim(),"171.56");
  assert.equal(sql("select count(*) from ukow_approval_private.writes;").trim(),"0");
  const approved=JSON.parse(sql(`${actor}select public.approve_booking_updates(array['${request.id}']);`).trim());
  assert.equal(approved.approved_count,1);
  const state=JSON.parse(sql("select data from public.app_store where id='main';"));
  assert.equal(state.bookings[0].amount,200);assert.equal(state.bookings[0].destination,"Leeds");
  assert.equal(state.bookings[0].pickupPhotos.front,"keep");
  assert.equal(state.bookings[0].lastApprovedBy,"Super Admin Person");
  assert.ok(state.bookings[0].lastApprovedAt);
  assert.equal(sql("select destination_address from public.bookings where reference='B1';").trim(),"Leeds");
  denied(`update public.bookings set amount=300 where reference='B1';`,/require Admin approval/);
  const again=JSON.parse(sql(`${actor}select public.approve_booking_updates(array['${request.id}']);`).trim());
  assert.equal(again.already_approved_count,1);
  denied(`update public.app_store set data=jsonb_set(data,'{bookings,0,lastApprovedBy}','"Forged"') where id='main';`,/approval process/);
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{stdio:"ignore"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
