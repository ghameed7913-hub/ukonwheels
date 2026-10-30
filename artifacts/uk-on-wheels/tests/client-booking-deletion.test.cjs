const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const os=require("node:os");
const {spawnSync}=require("node:child_process");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const helpers=html.slice(html.indexOf("function canClientDeleteBooking("),html.indexOf("function clientViewBooking("));
function context(overrides={}){
 const store={bookings:[{ref:"UKOW00001",_normalizedId:"id-1",status:"Picked Up",driver:"Driver"}]};
 const messages=[],calls=[];
 const ctx=vm.createContext({role:"client",SUPABASE_CONFIGURED:true,
  visibleBookings:()=>store.bookings,getStore:()=>store,STORE_CACHE:store,
  normalizedVisibleIds:new Set(["id-1"]),crmConfirm:async()=>true,
  escapeCrm:s=>s,crmToast:s=>messages.push(s),alert:s=>messages.push(s),
  sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:{status:"Cancelled"}};}},
  render:()=>{},loadNormalizedPortalData:async()=>{},...overrides});
 vm.runInContext(helpers,ctx);
 return {ctx,store,messages,calls};
}
test("Clients can delete only pre-delivery bookings, including assigned and picked up",()=>{
 const {ctx}=context();
 for(const status of ["New Booked Vehicle","Driver Assigned","Picked Up"])
  assert.equal(ctx.canClientDeleteBooking({status}),true);
 for(const status of ["On Route","Out for Delivery","Delayed","Accident","Claims","Delivered","Cancelled","unknown"])
  assert.equal(ctx.canClientDeleteBooking({status}),false);
 assert.equal(ctx.canClientDeleteBooking({status:"Picked Up",_journeyStartedAt:"2026-10-30"}),false);
 assert.equal(ctx.canClientDeleteBooking({status:"Picked Up",_deliveredAt:"2026-10-30"}),false);
 ctx.role="admin";assert.equal(ctx.clientBookingDeleteButton({status:"Picked Up"}),"");
});
test("confirmed deletion uses server RPC and removes booking/driver locally only after success",async()=>{
 const {ctx,store,calls,messages}=context();await ctx.deleteClientBooking("UKOW00001");
 assert.equal(calls[0].name,"client_delete_booking");
 assert.equal(calls[0].args.p_booking_id,"id-1");
 assert.equal(store.bookings[0].status,"Cancelled");assert.equal(store.bookings[0]._driverId,null);
 assert.equal(ctx.normalizedVisibleIds.has("id-1"),false);
 assert.equal(ctx.page,"clientBookings");assert.deepEqual(messages,["Booking deleted"]);
});
test("declining, unauthorized/stale server state, and missing setup never delete local data",async()=>{
 for(const overrides of [
  {crmConfirm:async()=>false},
  {sb:{rpc:async()=>({error:{message:"Vehicle is already on route"}})}},
  {sb:{rpc:async()=>({error:{code:"PGRST202",message:"missing function"}})}},
  {SUPABASE_CONFIGURED:false}
 ]){
  const {ctx,store}=context(overrides);await ctx.deleteClientBooking("UKOW00001");
  assert.equal(store.bookings[0].status,"Picked Up");
 }
});
test("database enforces ownership, status cutoff, audit and stale-write protection",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-client-delete-")),data=path.join(dir,"data"),port="55449";
 let started=false;
 function run(bin,args,input){const r=spawnSync(bin,args,{encoding:"utf8",input});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
 function sql(q){return run("psql",["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],q);}
 const uid="00000000-0000-0000-0000-000000000001",other="00000000-0000-0000-0000-000000000002";
 const bid="00000000-0000-0000-0000-000000000011";
 const actor=`set test.actor='${uid}';set role authenticated;`;
 function denied(q,re){const r=spawnSync("psql",["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{encoding:"utf8",input:actor+q});assert.notEqual(r.status,0);assert.match(r.stderr,re);}
 try{
  run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale"]);
  run("pg_ctl",["-D",data,"-o",`-k ${dir} -p ${port} -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
  sql(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
   create table profiles(id uuid primary key,role text,status text,name text,full_name text);
   insert into profiles values('${uid}','client','Active','Client','Client');
   create function public.is_business_member(uuid) returns boolean language sql stable as $$select coalesce(current_setting('test.member',true),'no')='yes'$$;
   create table bookings(id uuid primary key,reference text,status text,driver_id uuid,client_id uuid,created_by uuid,business_id uuid,journey_started_at timestamptz,delivered_at timestamptz,updated_at timestamptz);
   create table booking_events(booking_id uuid,event_type text,from_status text,to_status text,notes text,created_by uuid);
   create table app_store(id text primary key,data jsonb,updated_at timestamptz);
   insert into app_store values('main','{"bookings":[{"ref":"UKOW00001","status":"Picked Up","driver":"Driver","pickupPhotos":{"front":"keep"}}]}',now());
   insert into bookings values('${bid}','UKOW00001','Picked Up','${other}','${uid}','${uid}',null,null,null,now());
   grant select,update on bookings,app_store to authenticated;`);
  const patch=fs.readFileSync(path.join(__dirname,"../../../supabase/client-booking-deletion.sql"),"utf8");
  sql(patch);sql(patch);
  denied(`update bookings set status='Cancelled';`,/secure Client/);
  sql(`update bookings set client_id='${other}',created_by='${other}';`);
  denied(`select client_delete_booking('${bid}');`,/does not belong/);
  sql(`update bookings set client_id='${uid}';`);
  for(const status of ["On Route","Out for Delivery","Delayed","Accident","Claims","Delivered"]){
   sql(`update bookings set status='${status}';`);
   denied(`select client_delete_booking('${bid}');`,/cannot be deleted/);
  }
  sql(`update bookings set status='Picked Up',journey_started_at=now();`);
  denied(`select client_delete_booking('${bid}');`,/cannot be deleted/);
  sql(`update bookings set journey_started_at=null;update profiles set role='driver';`);
  denied(`select client_delete_booking('${bid}');`,/active Client/);
  sql("update profiles set role='client',status='Inactive';");
  denied(`select client_delete_booking('${bid}');`,/active Client/);
  sql("update profiles set status='Active';");
  sql(`${actor}select client_delete_booking('${bid}');select client_delete_booking('${bid}');`);
  assert.equal(sql("select status||':'||coalesce(driver_id::text,'none') from bookings;").trim(),"Cancelled:none");
  assert.equal(sql("select count(*) from booking_events;").trim(),"1");
  assert.equal(sql("select data#>>'{bookings,0,pickupPhotos,front}' from app_store;").trim(),"keep");
  assert.equal(sql("select data#>>'{bookings,0,status}' from app_store;").trim(),"Cancelled");
  denied("update bookings set status='On Route';",/cannot be changed/);
  denied("update app_store set data=jsonb_set(data,'{bookings,0,status}','\"Picked Up\"');",/old screen/);
  denied("select * from ukow_cancellation_private.writes;",/permission denied/);
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{encoding:"utf8"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
