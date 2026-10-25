const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {spawnSync,spawn}=require("node:child_process");

test("short references cover Admin, Client and private bookings without breaking retries, history or registration protection",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-short-refs-")),data=path.join(dir,"data"),port="55447";
  const args=["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"];
  const root=path.resolve(__dirname,"../../../supabase");
  const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
  const key=n=>"UKOW-2026-"+String(n).padStart(32,"0");
  const actor=n=>`set test.actor='${id(n)}';`;
  let started=false;
  function run(bin,argv,input){const r=spawnSync(bin,argv,{encoding:"utf8",input});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
  const sql=q=>run("psql",args,q).trim();
  const denied=(q,re)=>{const r=spawnSync("psql",args,{encoding:"utf8",input:q});assert.notEqual(r.status,0);assert.match(r.stderr,re);};
  function admin(reg,ref="null",type="Business"){
    return `select reference from admin_create_delivery_booking('${type}',${type==="Business"?`'${id(100)}'`:"null"},${type==="Private"?"'private@example.test'":"null"},
      'Ford','Focus','${reg}','Vehicle Delivery','A','B','Receiver','07123456789',null,null,10,100,null,${ref});`;
  }
  function client(n,reg){
    return `select reference from client_create_bulk_booking('${key(n)}',
      '{"customerType":"Business","_businessId":"${id(100)}","vehicle":"Ford Focus","reg":"${reg}","pickup":"A","destination":"B","receiver":"R","receiverMobile":"07123456789"}');`;
  }
  try{
    run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale"]);
    run("pg_ctl",["-D",data,"-o",`-k ${dir} -p ${port} -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
    sql(`create role anon;create role authenticated;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
      create table profiles(id uuid primary key,role text,status text,account_type text,email text);
      insert into profiles values('${id(1)}','admin','Active',null,'admin@example.test'),
        ('${id(2)}','client','Active','business','client@example.test'),
        ('${id(3)}','client','Active','private','private@example.test');
      create table businesses(id uuid primary key,status text);
      insert into businesses values('${id(100)}','Active');
      create function is_portal_admin() returns boolean language sql stable as $$select auth.uid()='${id(1)}'::uuid$$;
      create function has_portal_permission(text) returns boolean language sql stable as $$select is_portal_admin()$$;
      create function is_business_member(uuid) returns boolean language sql stable as $$select auth.uid()='${id(2)}'::uuid$$;
      create table bookings(id uuid primary key default gen_random_uuid(),reference text unique,customer_type text,business_id uuid,client_id uuid,created_by uuid,
        vehicle_registration text,status text,payment_status text,booking_date date,miles numeric,amount numeric,dropoff_deadline text,updated_at timestamptz);
      create sequence old_reference_seq;
      create function create_portal_booking(text,uuid,text,text,text,text,text,text,text,text,text,text,text,date,text)
      returns bookings language plpgsql as $$declare b bookings;begin
        insert into bookings(reference,customer_type,business_id,created_by,vehicle_registration,status)
        values('UKOW-2026-'||nextval('old_reference_seq'),$1,$2,auth.uid(),$5,'New Booked Vehicle')
        returning * into b;return b;end$$;
      insert into bookings(reference,customer_type,business_id,vehicle_registration,status)
      values('UKOW-2026-001000','Business','${id(100)}','LEGACY1','Delivered'),
        ('UKOW00005','Business','${id(100)}','LEGACY2','Delivered');`);
    sql(fs.readFileSync(path.join(root,"client-bulk-booking-patch.sql"),"utf8"));
    const adminSource=fs.readFileSync(path.join(root,"driver_photo_workflow_patch.sql"),"utf8");
    const start=adminSource.indexOf("create or replace function public.admin_create_delivery_booking(");
    sql(adminSource.slice(start,adminSource.indexOf("$$;",start)+3));
    sql(fs.readFileSync(path.join(root,"booking-registration-uniqueness.sql"),"utf8"));
    const patch=fs.readFileSync(path.join(root,"short-booking-references.sql"),"utf8");
    sql(patch);sql(patch);
    assert.equal(sql(actor(1)+admin("ADMIN1")),"UKOW00006");
    assert.equal(sql(actor(2)+client(1,"CLIENT1")),"UKOW00007");
    assert.equal(sql(actor(2)+client(1,"CLIENT1")),"UKOW00007","Retry must return the original short ref");
    assert.equal(sql(actor(1)+admin("PRIVATE1","null","Private")),"UKOW00008");
    assert.equal(sql(actor(1)+admin("BULK1",`'${key(2)}'`)),"UKOW00009");
    assert.equal(sql(`select booking_request_reference from bookings where reference='UKOW00009';`),key(2));
    assert.equal(sql("select count(*) from bookings where reference in ('UKOW00005','UKOW-2026-001000');"),"2");
    denied(actor(1)+admin("legacy-1"),/already booked for this customer\/branch/);
    denied(`update bookings set booking_request_reference='${key(999)}' where reference='UKOW00007';`,/cannot be changed/);
    // Real overlapping connections allocate distinct values from one sequence.
    function concurrent(q){
      return new Promise((resolve,reject)=>{
        const p=spawn("psql",args);let out="",err="";
        p.stdout.on("data",d=>out+=d);p.stderr.on("data",d=>err+=d);
        p.on("error",reject);p.on("close",code=>code===0?resolve(out.trim()):reject(new Error(err)));p.stdin.end(q);
      });
    }
    const refs=await Promise.all([concurrent(actor(2)+client(3,"RACE1")),concurrent(actor(2)+client(4,"RACE2"))]);
    assert.equal(new Set(refs).size,2);refs.forEach(ref=>assert.match(ref,/^UKOW[0-9]{5}$/));
    const before=Number(sql("select last_value from short_booking_reference_seq;"));
    sql(patch);
    assert.equal(Number(sql("select last_value from short_booking_reference_seq;")),before,"Rerun never resets the sequence");
    sql("select setval('short_booking_reference_seq',99998,true);");
    assert.equal(sql(actor(1)+admin("LAST1")),"UKOW99999");
    denied(actor(1)+admin("TOOMANY"),/All five-digit booking references have been used/);
    assert.equal(sql("select count(*) from bookings where vehicle_registration='TOOMANY';"),"0");
    assert.equal(sql(actor(2)+client(1,"CLIENT1")),"UKOW00007","Recovery works even after number exhaustion");
  }finally{
    if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{stdio:"ignore"});
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
