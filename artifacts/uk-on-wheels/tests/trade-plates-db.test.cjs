const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {execFileSync}=require("node:child_process");
const sql=fs.readFileSync(path.join(__dirname,"../../../supabase/driver-trade-plates.sql"),"utf8");
const ids={admin:"00000000-0000-4000-8000-000000000001",hr:"00000000-0000-4000-8000-000000000002",
  driver:"00000000-0000-4000-8000-000000000003",other:"00000000-0000-4000-8000-000000000004",
  client:"00000000-0000-4000-8000-000000000005",staff:"00000000-0000-4000-8000-000000000006"};
test("Trade plate SQL: real isolated PostgreSQL permissions, persistence and conflicts",async t=>{
  try{execFileSync("initdb",["--version"],{stdio:"pipe"});}catch(_){t.skip("Local PostgreSQL test binaries are not installed.");return;}
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-trade-test-")),data=path.join(dir,"db");
  execFileSync("initdb",["-D",data,"-U","ukow_test","-A","trust","--no-locale"],{stdio:"pipe"});
  execFileSync("pg_ctl",["-D",data,"-l",path.join(dir,"server.log"),"-o",`-k ${dir} -h '' -p 55439`,"-w","start"],{stdio:"pipe"});
  t.after(()=>{try{execFileSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"],{stdio:"pipe"});}finally{fs.rmSync(dir,{recursive:true,force:true});}});
  const run=input=>execFileSync("psql",["-X","-qAt","-v","ON_ERROR_STOP=1","-U","ukow_test","-h",dir,"-p","55439","-d","postgres"],{input,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim();
  const as=(id,input)=>run(`set role authenticated; set test.actor='${id}'; ${input}`);
  run(`create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
    create table public.profiles(id uuid primary key,name text,full_name text,role text,status text,hr_manage boolean default false);
    create function public.hr_screening_access(p_write boolean default false) returns boolean language sql stable security definer as $$
      select exists(select 1 from public.profiles where id=auth.uid() and status='Active'
      and (role='admin' or (role='staff' and hr_manage)))$$;
    insert into public.profiles(id,name,role,status,hr_manage) values
    ('${ids.admin}','Admin','admin','Active',false),('${ids.hr}','HR','staff','Active',true),
    ('${ids.driver}','Driver A','driver','Active',false),('${ids.other}','Driver B','driver','Active',false),
    ('${ids.client}','Client','client','Active',false),('${ids.staff}','Operations','staff','Active',false);`);
  run(sql);run(sql); // Safe to rerun without deleting assignments or breaking function signatures.
  const save=(id,plate,version=0,expiry="2099-12-31")=>
    `select public.save_driver_trade_plate('${id}','${plate}','${expiry}',${version});`;
  let first,second;
  await t.test("Only Admin and HR managers can list active Drivers",()=>{
    const list=JSON.parse(as(ids.hr,"select public.list_driver_trade_plates();"));
    assert.equal(list.canManage,true);assert.deepEqual(list.drivers.map(d=>d.name),["Driver A","Driver B"]);
    for(const id of [ids.driver,ids.client,ids.staff])assert.throws(()=>as(id,"select public.list_driver_trade_plates();"),/HR management access required/);
  });
  await t.test("HR save persists, normalises plate and shows only to assigned Driver",()=>{
    first=JSON.parse(as(ids.hr,save(ids.driver,"123 - ab")));
    assert.equal(first.plate_number,"123AB");assert.equal(first.driver_name,"Driver A");assert.ok(first.version>0);
    assert.equal(JSON.parse(as(ids.driver,"select public.my_driver_trade_plate();")).assignment.plate_number,"123AB");
    assert.equal(JSON.parse(as(ids.other,"select public.my_driver_trade_plate();")).assignment,null);
    assert.throws(()=>as(ids.client,"select public.my_driver_trade_plate();"),/Driver sign-in/);
  });
  await t.test("Drivers, ordinary staff and Clients cannot assign, remove or write the table directly",()=>{
    for(const id of [ids.driver,ids.client,ids.staff]){
      assert.throws(()=>as(id,save(ids.other,"987CD")),/HR management access required/);
      assert.throws(()=>as(id,`select public.remove_driver_trade_plate('${ids.driver}',${first.version});`),/HR management access required/);
      assert.throws(()=>as(id,"select * from public.driver_trade_plates;"),/permission denied/);
      assert.throws(()=>as(id,"delete from public.driver_trade_plates;"),/permission denied/);
    }
    assert.throws(()=>run("set role anon; select public.my_driver_trade_plate();"),/permission denied/);
  });
  await t.test("Duplicate plate, stale overwrite, bad expiry and non-Driver target are blocked",()=>{
    assert.throws(()=>as(ids.hr,save(ids.other,"123 AB")),/another Driver/);
    assert.throws(()=>as(ids.hr,save(ids.driver,"555CD")),/assignment changed/);
    assert.throws(()=>as(ids.hr,save(ids.other,"555CD",0,"2000-01-01")),/expiry date/);
    assert.throws(()=>as(ids.hr,save(ids.other,"!!")),/plate number/);
    assert.throws(()=>as(ids.hr,save(ids.staff,"555CD")),/active saved Driver/);
    second=JSON.parse(as(ids.admin,save(ids.driver,"555CD",first.version)));
    assert.ok(second.version>first.version);
    assert.throws(()=>as(ids.hr,`select public.remove_driver_trade_plate('${ids.driver}',${first.version});`),/assignment changed/);
  });
  await t.test("Admin remove disappears from Driver; reassignment never reuses an old version",()=>{
    assert.equal(JSON.parse(as(ids.admin,`select public.remove_driver_trade_plate('${ids.driver}',${second.version});`)).removed,true);
    assert.equal(JSON.parse(as(ids.driver,"select public.my_driver_trade_plate();")).assignment,null);
    const third=JSON.parse(as(ids.hr,save(ids.driver,"555CD")));
    assert.ok(third.version>second.version);
    assert.throws(()=>as(ids.admin,save(ids.driver,"777EF",second.version)),/assignment changed/);
    run(`update public.profiles set status='Inactive' where id='${ids.hr}';`);
    assert.throws(()=>as(ids.hr,save(ids.other,"888EF")),/HR management access required/);
  });
  await t.test("Expired assignments remain visible as expired evidence, not login restrictions",()=>{
    run(`update public.driver_trade_plates set expires_on='2000-01-01' where driver_id='${ids.driver}';`);
    assert.equal(JSON.parse(as(ids.driver,"select public.my_driver_trade_plate();")).assignment.expires_on,"2000-01-01");
    assert.equal(JSON.parse(as(ids.admin,"select public.list_driver_trade_plates();")).assignments.length,1);
  });
});
