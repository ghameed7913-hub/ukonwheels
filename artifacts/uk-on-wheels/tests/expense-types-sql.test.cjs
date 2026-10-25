/* Isolated, disposable PostgreSQL only; never uses DATABASE_URL. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
test("SQL saves shared types, prevents unauthorised writes and accepts them in atomic expense batches",{timeout:60000},t=>{
 if(spawnSync("which",["initdb"]).status!==0)return t.skip("PostgreSQL unavailable");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-expense-types-")),data=path.join(dir,"data");
 const run=(cmd,args,input)=>{const r=spawnSync(cmd,args,{input,encoding:"utf8",timeout:20000});assert.equal(r.status,0,r.stderr+"\n"+r.stdout);return r.stdout;};
 const args=["-X","-h",dir,"-p","55447","-U","expense_owner","-d","postgres","-v","ON_ERROR_STOP=1","-qAt"];
 const sql=text=>run("psql",args,text),uid=n=>"00000000-0000-0000-0000-"+String(n).padStart(12,"0");
 const as=n=>`set role authenticated;set request.jwt.claim.sub='${uid(n)}';`;
 let started=false;
 try{
  run("initdb",["-D",data,"-U","expense_owner","-A","trust","--no-locale","-E","UTF8"]);
  run("pg_ctl",["-D",data,"-l",path.join(dir,"log"),"-o",`-k ${dir} -p 55447 -c listen_addresses=''`,"-w","start"]);started=true;
  sql(`
   create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;
   create table auth.users(id uuid primary key);
   create table public.profiles(id uuid primary key,role text,status text);
   insert into public.profiles values('${uid(1)}','admin','Active'),('${uid(2)}','staff','Active'),
    ('${uid(3)}','staff','Active'),('${uid(4)}','driver','Active'),('${uid(5)}','client','Active'),('${uid(6)}','admin','Inactive');
   insert into auth.users select id from public.profiles;
   create function public.is_portal_admin() returns boolean language sql stable security definer as
    $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='Active')$$;
   create function public.has_portal_permission(k text) returns boolean language sql stable as
    $$select (auth.uid()='${uid(2)}' and k='accounts:manage') or (auth.uid()='${uid(3)}' and k='accounts:view')$$;
   create function public.hr_screening_access(w boolean) returns boolean language sql stable as $$select public.is_portal_admin()$$;
   create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
   insert into public.app_store values('main','{"expenses":[],"bookings":[{"ref":"keep"}]}',now());
  `);
  const root=path.join(__dirname,"../../..");
  sql(fs.readFileSync(path.join(root,"supabase/bulk-expenses.sql"),"utf8"));
  const patch=fs.readFileSync(path.join(root,"supabase/expense-types.sql"),"utf8");sql(patch);sql(patch);
  const batch=uid(20),rows=JSON.stringify([{date:"2026-10-25",category:"Parking charges",amount:12.50,method:"Cash"}]);
  sql(`${as(1)}select public.add_expense_type('  Parking   charges ');select public.add_expense_type('parking charges');
   select public.add_expense_type('fuel');`);
  assert.equal(sql("reset role;select count(*) from public.expense_types;").trim(),"1");
  assert.match(sql(`${as(3)}select public.read_expense_types();`),/Parking charges/);
  sql(`${as(2)}select public.add_expense_type('Cleaning');`);
  for(const n of [3,4,5,6]){
   sql(`${as(n)}do $$begin
    begin perform public.add_expense_type('Denied');raise exception 'Unauthorised create succeeded';
    exception when insufficient_privilege then null;end;
   end$$;`);
  }
  sql(`${as(1)}select public.save_expense_batch('${batch}','${rows}');
   select public.save_expense_batch('${batch}','${rows}');
   do $$begin
    begin perform public.add_expense_type(repeat('x',81));raise exception 'Overlong name accepted';
    exception when invalid_parameter_value then null;end;
    begin perform public.save_expense_batch('${uid(21)}','[{"date":"2026-10-25","category":"Unknown","amount":10,"method":"Cash"}]');
     raise exception 'Unknown category accepted';exception when invalid_parameter_value then null;end;
   end$$;`);
  assert.equal(sql("reset role;select jsonb_array_length(data->'expenses') from public.app_store;").trim(),"1");
  assert.equal(sql("select data->'bookings'->0->>'ref' from public.app_store;").trim(),"keep");
  sql(`${as(1)}do $$begin
   begin insert into public.expense_types(name,created_by) values('Direct','${uid(1)}');
    raise exception 'Direct table write accepted';exception when insufficient_privilege then null;end;
   end$$;`);
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{stdio:"ignore"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
