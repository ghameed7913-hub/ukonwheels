const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {spawnSync,spawn}=require("node:child_process");

test("database scopes historical registrations by customer, preserves old records and blocks concurrent duplicates",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-registration-")),data=path.join(dir,"data"),port="55446";
  const args=["-X","-h",dir,"-p",port,"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"];
  let started=false;
  const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
  function run(bin,argv,input){const r=spawnSync(bin,argv,{encoding:"utf8",input});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
  const sql=q=>run("psql",args,q);
  const insert=(n,customer,reg,type="Business")=>`insert into bookings values('${id(n)}','REF-${n}','${type}',${type==="Business"?`'${id(customer)}'`:"null"},${type==="Private"?`'${id(customer)}'`:"null"},'${reg}','New Booked Vehicle');`;
  function denied(q,re=/already booked for this customer\/branch/){
    const r=spawnSync("psql",args,{encoding:"utf8",input:q});
    assert.notEqual(r.status,0,"Duplicate must not commit");assert.match(r.stderr,re);
  }
  try{
    run("initdb",["-D",data,"-U","postgres","-A","trust","--no-locale"]);
    run("pg_ctl",["-D",data,"-o",`-k ${dir} -p ${port} -c listen_addresses=''`,"-l",path.join(dir,"log"),"-w","start"]);started=true;
    sql(`create role anon;create role authenticated;
      create table bookings(id uuid primary key,reference text unique,customer_type text,business_id uuid,client_id uuid,vehicle_registration text,status text);
      grant select,insert,update on bookings to authenticated;
      ${insert(1,100,"AB10 CDE")}${insert(2,100,"ab10-cde")}
      update bookings set status='Delivered';`);
    const patch=fs.readFileSync(path.resolve(__dirname,"../../../supabase/booking-registration-uniqueness.sql"),"utf8");
    sql(patch);sql(patch);
    assert.equal(sql("select count(*) from bookings;").trim(),"2","Patch must preserve historical duplicates");
    sql("update bookings set status='Paid';update bookings set vehicle_registration=vehicle_registration;");
    denied("set role authenticated;"+insert(3,100,"ab 10-cde"));
    sql(insert(4,101,"AB10CDE"));
    denied(`update bookings set business_id='${id(100)}' where id='${id(4)}';`);
    sql(insert(5,100,"NEW99"));
    denied(`update bookings set vehicle_registration='ab10 cde' where id='${id(5)}';`);
    sql(insert(6,201,"AB10CDE","Private"));
    denied(insert(7,201,"ab-10 cde","Private"));
    sql(insert(8,202,"AB10CDE","Private"));
    // Admin creation attaches private client_id only after the initial INSERT.
    sql(`begin;insert into bookings values('${id(9)}','REF-9','Private',null,null,'PRIVATE1','New Booked Vehicle');
      update bookings set client_id='${id(201)}' where id='${id(9)}';commit;`);
    denied(`begin;insert into bookings values('${id(10)}','REF-10','Private',null,null,'private-1','New Booked Vehicle');
      update bookings set client_id='${id(201)}' where id='${id(10)}';commit;`);
    denied(insert(11,303,"BATCH1")+insert(12,303,"batch-1"));
    assert.equal(sql(`select count(*) from bookings where id='${id(12)}';`).trim(),"0");
    // Two genuinely overlapping transactions: the second waits for the first
    // customer/registration lock, then sees its committed booking.
    const first=spawn("psql",args,{stdio:["pipe","pipe","pipe"]});
    const exited=new Promise(resolve=>first.on("exit",resolve));
    let output="",error="";
    first.stderr.on("data",d=>error+=d);
    const ready=new Promise((resolve,reject)=>{
      first.stdout.on("data",d=>{output+=d;if(output.includes("LOCKED"))resolve();});
      first.on("error",reject);
      first.on("exit",()=>{if(!output.includes("LOCKED"))reject(new Error(error));});
    });
    first.stdin.end(`begin;${insert(20,400,"RACE1")}set constraints all immediate;select 'LOCKED';select pg_sleep(1);commit;`);
    await ready;
    denied(insert(21,400,"race-1"));
    assert.equal(await exited,0,error);
    assert.equal(sql(`select count(*) from bookings where business_id='${id(400)}';`).trim(),"1");
  } finally {
    if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{stdio:"ignore"});
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
