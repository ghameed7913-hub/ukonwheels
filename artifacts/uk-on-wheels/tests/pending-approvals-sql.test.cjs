/* Disposable PostgreSQL only; never connects to the portal database. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
test("Atomic bulk approval enforces Admin, selected IDs, staleness, rollback and retry safety",{timeout:60000},t=>{
 if(spawnSync("which",["initdb"]).status!==0)return t.skip("PostgreSQL unavailable");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-approvals-")),data=path.join(dir,"data");
 const run=(cmd,args,input)=>{const r=spawnSync(cmd,args,{input,encoding:"utf8",timeout:20000});assert.equal(r.status,0,r.stderr+"\n"+r.stdout);return r.stdout;};
 const sql=q=>run("psql",["-X","-h",dir,"-p","55444","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],q);
 let started=false;
 const uid="00000000-0000-0000-0000-000000000001";
 try{
  run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale","-E","UTF8"]);
  run("pg_ctl",["-D",data,"-o",`-F -k ${dir} -p 55444 -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
  sql(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
   create table public.profiles(id uuid primary key,role text,status text,full_name text,name text);
   insert into public.profiles values('${uid}','admin','Active','Test Admin','Test Admin');
   create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
   create table public.bookings(id uuid primary key,reference text unique,status text,miles numeric,amount numeric,destination_address text,delivered_at timestamptz);
   create table public.test_events(booking_id uuid);
   create function public.admin_update_booking_details(p_booking_id uuid,p_miles numeric,p_amount numeric,p_destination_address text)
    returns public.bookings language plpgsql as $$declare b public.bookings;begin update public.bookings set miles=p_miles,amount=p_amount,destination_address=p_destination_address where id=p_booking_id returning * into b;return b;end$$;
   create function public.update_booking_status(p_booking_id uuid,p_status text,p_notes text,p_latitude numeric,p_longitude numeric,p_accuracy_metres numeric)
    returns public.bookings language plpgsql as $$declare b public.bookings;begin update public.bookings set status=p_status,delivered_at=case when p_status='Delivered' then now() else delivered_at end where id=p_booking_id returning * into b;insert into public.test_events values(p_booking_id);return b;end$$;
   grant usage on schema public,auth to authenticated;`);
  const migration=fs.readFileSync(path.join(__dirname,"../../../supabase/pending-booking-approvals.sql"),"utf8");
  sql(migration);sql(migration);
  const books=[1,2,3].map(n=>({ref:"B"+n,_normalizedId:`00000000-0000-0000-0000-00000000001${n}`,status:"Picked Up",miles:10,amount:100,destination:"York",pickupPhotos:{front:"keep"},timeline:[],approvalHistory:[]}));
  const requests=books.map((b,i)=>({id:"R"+(i+1),bookingRef:b.ref,status:"Pending Approval",requestedAt:"now",previous:{status:b.status,miles:b.miles,amount:b.amount,destination:b.destination},changes:{status:"On Route",miles:20,amount:120,destination:"Leeds",pickupPhotos:{front:"should not replace"}}}));
  const fixture={bookings:books,updateRequests:requests,notifications:[],otherSettings:{keep:true}};
  sql(`insert into public.app_store values('main','${JSON.stringify(fixture)}',now());`+
   books.map(b=>`insert into public.bookings values('${b._normalizedId}','${b.ref}','Picked Up',10,100,'York',null);`).join(""));
  const actor=`set test.actor='${uid}';set role authenticated;`;
  function denied(q,match){const r=spawnSync("psql",["-X","-h",dir,"-p","55444","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{input:q,encoding:"utf8"});assert.notEqual(r.status,0);assert.match(r.stderr,match);}
  denied(`set role authenticated;select public.approve_booking_updates(array['R1']);`,/active Admin/);
  sql(`update public.profiles set role='staff';`);
  denied(`${actor}select public.approve_booking_updates(array['R1']);`,/active Admin/);
  sql(`update public.profiles set role='admin';`);
  denied(`${actor}select public.approve_booking_updates(array[]::text[]);`,/Select at least one/);
  // A later failing request rolls back the first selected request's details and event.
  denied(`${actor}select public.approve_booking_updates(array['R1','ZZ-MISSING']);`,/not found/);
  assert.equal(sql("select status from public.bookings where reference='B1';").trim(),"Picked Up");
  assert.equal(sql("select count(*) from public.test_events;").trim(),"0");
  sql("update public.bookings set miles=999 where reference='B2';");
  denied(`${actor}select public.approve_booking_updates(array['R1','R2']);`,/changed after/);
  assert.equal(sql("select status from public.bookings where reference='B1';").trim(),"Picked Up");
  sql("update public.bookings set miles=10 where reference='B2';");
  let result=JSON.parse(sql(`${actor}select public.approve_booking_updates(array['R1','R2','R1']);`).trim());
  assert.equal(result.approved_count,2);
  assert.equal(result.requests.length,2);
  const state=JSON.parse(sql("select data from public.app_store where id='main';"));
  assert.equal(state.updateRequests[2].status,"Pending Approval");
  assert.equal(state.bookings[2].status,"Picked Up");
  assert.equal(state.bookings[0].pickupPhotos.front,"keep");
  assert.equal(state.otherSettings.keep,true);
  assert.equal(state.bookings[0].amount,120);
  assert.equal(state.bookings[0].lastApprovedBy,"Test Admin");
  assert.equal(state.bookings[0].timeline.length,1);
  assert.equal(sql("select count(*) from public.test_events;").trim(),"2");
  result=JSON.parse(sql(`${actor}select public.approve_booking_updates(array['R1','R2']);`).trim());
  assert.equal(result.approved_count,0);assert.equal(result.already_approved_count,2);
  assert.equal(sql("select count(*) from public.test_events;").trim(),"2");
  // Delivery that happened meanwhile must not be undone by approval.
  sql("update public.bookings set delivered_at=now() where reference='B3';");
  denied(`${actor}select public.approve_booking_updates(array['R3']);`,/Delivered booking/);
  // Two proposals for one vehicle require a deliberate individual review.
  const extra={...requests[2],id:"R4"};
  sql(`update public.bookings set delivered_at=null where reference='B3';
   update public.app_store set data=jsonb_set(data,'{updateRequests}',data->'updateRequests'||'${JSON.stringify([extra])}');`);
  denied(`${actor}select public.approve_booking_updates(array['R3','R4']);`,/only one update per booking/);
  assert.equal(sql("select status from public.bookings where reference='B3';").trim(),"Picked Up");
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{stdio:"ignore"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
