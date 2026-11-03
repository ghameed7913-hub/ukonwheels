const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {execFileSync}=require("node:child_process");
const id=n=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
test("Live tracking isolated PostgreSQL security and lifecycle",async t=>{
  try{execFileSync("initdb",["--version"],{stdio:"pipe"});}catch{t.skip("PostgreSQL test binaries unavailable");return;}
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-tracking-")),data=path.join(dir,"db");
  execFileSync("initdb",["-D",data,"-U","tracking_test","-A","trust","--no-locale"],{stdio:"pipe"});
  execFileSync("pg_ctl",["-D",data,"-l",path.join(dir,"pg.log"),"-o",`-k ${dir} -h '' -p 55438`,"-w","start"],{stdio:"pipe"});
  t.after(()=>{try{execFileSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"],{stdio:"pipe"});}finally{fs.rmSync(dir,{recursive:true,force:true});}});
  const run=input=>execFileSync("psql",["-X","-qAt","-v","ON_ERROR_STOP=1","-U","tracking_test","-h",dir,"-p","55438","-d","postgres"],
    {input,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim();
  const as=(who,input)=>run(`set role authenticated; set test.actor='${id(who)}'; ${input}`);
  const anon=input=>run("set role anon; "+input);
  const json=JSON.parse;
  run(`create role anon;create role authenticated;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
    create table public.profiles(id uuid primary key,name text,full_name text,email text,role text,status text);
    create table public.hr_employee_records(id serial primary key,data jsonb not null);
    create table public.business_memberships(business_id uuid,profile_id uuid,status text);
    create table public.bookings(id uuid primary key,reference text,vehicle_registration text,vehicle_make text,vehicle_model text,
      status text,driver_id uuid,created_by uuid,client_id uuid,business_id uuid,pickup_address text,destination_address text,
      delivered_at timestamptz,created_at timestamptz default now());
    create table public.booking_events(booking_id uuid,to_status text,created_at timestamptz default now());
    create function public.is_portal_admin() returns boolean language sql stable security definer as $$
      select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='Active')$$;
    create function public.is_business_member(target uuid) returns boolean language sql stable security definer as $$
      select exists(select 1 from public.business_memberships where business_id=target and profile_id=auth.uid() and status='Active')$$;
    insert into profiles values
      ('${id(1)}','Admin',null,'admin@example.invalid','admin','Active'),
      ('${id(2)}','Driver A',null,'driver-a@example.invalid','driver','Active'),
      ('${id(3)}','Driver B',null,'driver-b@example.invalid','driver','Active'),
      ('${id(4)}','Client A',null,'client-a@example.invalid','client','Active'),
      ('${id(5)}','Client B',null,'client-b@example.invalid','client','Active'),
      ('${id(6)}','Staff',null,'staff@example.invalid','staff','Active');
    insert into business_memberships values ('${id(21)}','${id(4)}','Active'),('${id(22)}','${id(5)}','Active');
    insert into bookings(id,reference,vehicle_registration,status,driver_id,created_by,business_id,pickup_address,destination_address) values
      ('${id(11)}','UKOW00011','AB12 CDE','Picked Up','${id(2)}','${id(1)}','${id(21)}','Glasgow','London'),
      ('${id(12)}','UKOW00012','AB12 CDE','Picked Up','${id(3)}','${id(1)}','${id(22)}','Leeds','York'),
      ('${id(13)}','UKOW00013','EF34 GHI','Picked Up','${id(2)}','${id(4)}',null,'Bath','Bristol');
    insert into booking_events values('${id(11)}','Picked Up',now());`);
  run(`insert into bookings(id,reference,vehicle_registration,status,driver_id,created_by,client_id)
    values('${id(14)}','UKOW00014','JK56 LMN','Picked Up','${id(2)}','${id(1)}','${id(4)}');`);
  const sql=fs.readFileSync(path.join(__dirname,"../../../supabase/live-vehicle-tracking.sql"),"utf8");
  run(sql);run(sql);
  const start=(driver,booking)=>json(as(driver,`select public.start_vehicle_tracking('${id(booking)}');`));
  const track=(user,query="")=>json(as(user,`select public.track_vehicle('${query}');`));
  const publish=(token,lat="55.85",lng="-4.25",acc="8",time="now()")=>
    json(anon(`select public.publish_vehicle_location('${token}',${lat},${lng},${acc},${time});`));
  let a,b;
  await t.test("Clients see only their own business/private records, even with duplicate registrations",()=>{
    assert.equal(track(1,"AB12CDE").bookings.length,2);
    assert.equal(track(4,"AB12 CDE").bookings.length,1);
    assert.equal(track(5,"AB12 CDE").bookings[0].reference,"UKOW00012");
    assert.equal(track(4,"UKOW00012").bookings.length,0);
    assert.equal(track(4,"UKOW00013").bookings.length,1);
    assert.equal(track(5,"UKOW00013").bookings.length,0);
    assert.equal(track(4,"UKOW00014").bookings.length,1);
    assert.equal(track(5,"UKOW00014").bookings.length,0);
    assert.equal(track(4).bookings.length,3);
    assert.throws(()=>as(2,"select public.track_vehicle();"),/Admin or Client/);
    assert.throws(()=>as(6,"select public.track_vehicle();"),/Admin or Client/);
    assert.throws(()=>anon("select public.track_vehicle();"),/permission denied/);
  });
  await t.test("Only assigned active Drivers can opt in, without exposing stored plaintext tokens",()=>{
    assert.throws(()=>start(1,11),/active Driver/);assert.throws(()=>start(3,11),/assigned vehicle/);
    a=start(2,11);b=start(3,12);
    assert.match(a.token,/^[a-f0-9]{64}$/);assert.equal(a.booking_id,id(11));
    assert.equal(run(`select count(*) from ukow_tracking_private.sessions where token_hash='${a.token}';`),"0");
    assert.throws(()=>anon("select * from ukow_tracking_private.sessions;"),/permission denied/);
    assert.equal(track(4).bookings.find(x=>x.reference==="UKOW00011").location,null);
  });
  await t.test("Write-only capabilities publish a real position; readers never receive token or another business's point",()=>{
    assert.deepEqual(publish(a.token),{active:true,accepted:true});
    assert.deepEqual(publish(b.token,"53.8","-1.5"),{active:true,accepted:true});
    const result=track(4,"UKOW00011");
    assert.equal(result.bookings[0].location.latitude,55.85);
    assert.equal(result.bookings[0].events[0].status,"Picked Up");
    assert.ok(!JSON.stringify(result).includes(a.token));
    assert.equal(track(5,"UKOW00012").bookings[0].location.latitude,53.8);
    assert.deepEqual(publish("0".repeat(64)),{active:false,accepted:false});
  });
  await t.test("Invalid and out-of-order fixes cannot replace a valid position",()=>{
    for(const lat of ["91","'NaN'::float8","'Infinity'::float8"]){
      assert.throws(()=>publish(a.token,lat),/Invalid or outdated/);
    }
    assert.throws(()=>publish(a.token,"55","-4","-1"),/Invalid or outdated/);
    assert.throws(()=>publish(a.token,"55","-4","8","now()+interval '5 minutes'"),/Invalid or outdated/);
    assert.equal(publish(a.token,"40","0","8","now()-interval '1 minute'").accepted,false);
    assert.equal(track(4,"UKOW00011").bookings[0].location.latitude,55.85);
  });
  await t.test("Starting a different job closes the previous job; stopping revokes read access and future writes",()=>{
    const next=start(2,13);
    assert.equal(publish(a.token).active,false);
    assert.equal(track(4,"UKOW00011").bookings[0].location,null);
    assert.equal(json(as(2,"select public.vehicle_tracking_driver_status();")).booking_id,id(13));
    assert.throws(()=>as(5,`select public.stop_vehicle_tracking('${id(13)}');`),/not your/);
    assert.equal(as(2,`select public.stop_vehicle_tracking('${id(13)}');`),"t");
    assert.equal(publish(next.token).active,false);
    assert.equal(json(as(2,"select public.vehicle_tracking_driver_status();")).sharing,false);
  });
  await t.test("Reassignment and delivery revoke the old phone immediately and hide location",()=>{
    a=start(2,11);publish(a.token);
    run(`update bookings set driver_id='${id(3)}' where id='${id(11)}';`);
    assert.equal(publish(a.token).active,false);assert.equal(track(4,"UKOW00011").bookings[0].location,null);
    b=start(3,11);publish(b.token);
    run(`update bookings set status='Delivered',delivered_at=now() where id='${id(11)}';`);
    assert.equal(publish(b.token).active,false);assert.equal(track(4,"UKOW00011").bookings[0].sharing,false);
    assert.throws(()=>start(3,11),/undelivered/);
  });
  await t.test("Expired Driver documents, disabled accounts and expiring sessions stop background writes",()=>{
    const s=start(2,13);
    run(`insert into hr_employee_records(data) values ('{"portalUserId":"${id(2)}","licenceExpiry":"2000-01-01"}');`);
    assert.equal(publish(s.token).active,false);assert.throws(()=>start(2,13),/valid required documents/);
    run("delete from hr_employee_records;");
    const s2=start(2,13);run(`update profiles set status='Inactive' where id='${id(2)}';`);
    assert.equal(publish(s2.token).active,false);
    run(`update profiles set status='Active' where id='${id(2)}';`);
    const s3=start(2,13);run(`update ukow_tracking_private.sessions set expires_at=now()-interval '1 minute' where booking_id='${id(13)}';`);
    assert.equal(publish(s3.token).active,false);
    assert.equal(track(4,"UKOW00013").bookings[0].location,null);
  });
  await t.test("Closing a capability is idempotent and does not affect other Drivers",()=>{
    const s=start(2,13),other=start(3,12);
    assert.equal(anon(`select public.close_vehicle_tracking('${s.token}');`),"t");
    assert.equal(anon(`select public.close_vehicle_tracking('${s.token}');`),"t");
    assert.equal(publish(s.token).active,false);assert.equal(publish(other.token).active,true);
    run(`update business_memberships set status='Inactive' where profile_id='${id(5)}';`);
    assert.equal(track(5,"UKOW00012").bookings.length,0);
  });
});
