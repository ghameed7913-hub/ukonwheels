/* Real PostgreSQL fixture only. Never connects to the live Supabase project. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
test("Staff ledger SQL: access, deduplication, daily/monthly totals, atomic payslips and no double-counted expenses",{timeout:60000},t=>{
 if(spawnSync("which",["initdb"]).status!==0)return t.skip("PostgreSQL unavailable");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-staff-")),data=path.join(dir,"data"),socket=path.join(dir,"socket");
 fs.mkdirSync(socket);
 const run=(cmd,args,input)=>{const r=spawnSync(cmd,args,{input,encoding:"utf8",timeout:30000});assert.equal(r.status,0,r.stderr+"\n"+r.stdout);return r.stdout};
 const sql=s=>run("psql",["-X","-h",socket,"-U","ledger_owner","-d","postgres","-v","ON_ERROR_STOP=1","-qAt"],s);
 const uid=n=>"00000000-0000-0000-0000-"+String(n).padStart(12,"0");
 const as=n=>`set role authenticated;set request.jwt.claim.sub='${uid(n)}';`;
 const person=uid(100),daily=uid(101);
 let started=false;
 try{
  run("initdb",["-D",data,"-U","ledger_owner","-A","trust","--no-locale","-E","UTF8"]);
  run("pg_ctl",["-D",data,"-l",path.join(dir,"pg.log"),"-o",`-k ${socket} -c listen_addresses=''`,"-w","start"]);started=true;
  sql(`
   create role authenticated;create role anon;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;
   create table public.profiles(id uuid,role text,status text);
   insert into public.profiles values('${uid(1)}','admin','Active'),('${uid(2)}','driver','Active'),
   ('${uid(3)}','staff','Active'),('${uid(4)}','staff','Active'),('${uid(5)}','client','Active');
   create function public.is_portal_admin() returns boolean language sql stable as $$select auth.uid()='${uid(1)}'$$;
   create function public.has_portal_permission(k text) returns boolean language sql stable as
    $$select (auth.uid()='${uid(3)}' and k='accounts:manage') or (auth.uid()='${uid(4)}' and k='accounts:view')$$;
   create function public.hr_screening_access(w boolean default false) returns boolean language sql stable as $$select public.is_portal_admin()$$;
   create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
   grant select,update on public.app_store to authenticated;
   insert into public.app_store values('main','{"payslips":[],"expenses":[],"bookings":[{"ref":"KEEP"}]}'::jsonb,now());
  `);
  sql(fs.readFileSync(path.resolve(__dirname,"../../../supabase/payslip-payments.sql"),"utf8"));
  const patch=fs.readFileSync(path.resolve(__dirname,"../../../supabase/staff-daily-records.sql"),"utf8");
  sql(patch);sql(patch);
  const sheetPatch=fs.readFileSync(path.resolve(__dirname,"../../../supabase/staff-daily-spreadsheet.sql"),"utf8");
  sql(sheetPatch);sql(sheetPatch);
  sql(`${as(3)}
   select public.save_staff_pay_person('${person}','Monthly Staff','staff@example.invalid','monthly',2000);
   select public.save_staff_pay_person('${person}','Monthly Staff','staff@example.invalid','monthly',2000);
   select public.save_staff_pay_person('${daily}','Daily Staff','daily@example.invalid','daily',120);
  `);
  for(const [n,kind,amount] of [[201,"overtime",100],[202,"expense",75],[203,"advance",300],[204,"payment",200]]){
   const q=`${as(3)} select public.add_staff_daily_entry('${uid(n)}','${person}','2026-10-15','${kind}',${amount},'Daily entry');`;
   sql(q);sql(q);
  }
  sql(`${as(3)}
   select public.add_staff_daily_entry('${uid(205)}','${daily}','2026-10-15','work',240,'Two days');
   do $$begin
    if public.staff_daily_totals('${person}','2026-10')<>'{"basic":2000,"overtime":100,"otherExpenses":75,"advance":500}'::jsonb then raise exception 'Monthly totals wrong';end if;
    if (public.staff_daily_totals('${daily}','2026-10')->>'basic')::numeric<>240 then raise exception 'Daily rate counted incorrectly';end if;
    begin perform public.add_staff_daily_entry('${uid(204)}','${person}','2026-10-15','payment',999,'Daily entry');
      raise exception 'Changed retry accepted';exception when raise_exception then if sqlerrm='Changed retry accepted' then raise;end if;end;
    begin perform public.create_staff_record_payslip('${person}','{}','Unpaid');
      raise exception 'Accounts-only user created payslip';exception when insufficient_privilege then null;end;
   end$$;
  `);
  const slip=JSON.stringify({id:"PAY-STAFF-1",email:"staff@example.invalid",month:"2026-10",name:"Staff",role:"Staff",basic:2000,overtime:100,otherExpenses:75,advance:500,rate:0,fuel:0,food:0,travel:0,taxEnabled:true,taxPct:20});
  sql(`${as(1)}
   do $$begin
    begin perform public.create_staff_record_payslip('${person}',jsonb_set('${slip}'::jsonb,'{advance}','0'),'Paid');
      raise exception 'Ignored deductions';exception when raise_exception then if sqlerrm='Ignored deductions' then raise;end if;end;
    if jsonb_array_length(public.read_payroll_finances()->'payslips')<>0 then raise exception 'Partial payslip after failure';end if;
    begin perform public.create_portal_payslip('${slip}'::jsonb||'{"net":2000}','Paid');
      raise exception 'Bypassed ledger';exception when raise_exception then if sqlerrm='Bypassed ledger' then raise;end if;end;
   end$$;
   select public.create_staff_record_payslip('${person}','${slip}','Unpaid');
   select public.create_staff_record_payslip('${person}','${slip}','Unpaid');
   select public.set_payslip_payment_status('PAY-STAFF-1','Paid',0);
   select public.set_payslip_payment_status('PAY-STAFF-1','Paid',0);
   do $$declare s jsonb;begin
    s:=public.read_payroll_finances();
    if jsonb_array_length(s->'payslips')<>1 or (s#>>'{payslips,0,net}')::numeric<>1255 then raise exception 'Wrong balance or duplicate slip';end if;
    if (select sum((e->>'amount')::numeric) from jsonb_array_elements(s->'expenses') e)<>1755
     or jsonb_array_length(s->'expenses')<>3 then raise exception 'Payment expense missing or counted twice';end if;
    if not exists(select 1 from jsonb_array_elements(public.read_staff_daily_records()->'finalized') f where f->>'paymentStatus'='Paid') then raise exception 'Final paid status stale';end if;
    begin perform public.add_staff_daily_entry('${uid(206)}','${person}','2026-10-16','payment',100,'Late');
      raise exception 'Final period was mutable';exception when raise_exception then if sqlerrm='Final period was mutable' then raise;end if;end;
    begin perform public.create_staff_record_payslip('${person}',jsonb_set('${slip}'::jsonb,'{id}','"PAY-DUP"'),'Unpaid');
      raise exception 'Duplicate month accepted';exception when raise_exception then if sqlerrm='Duplicate month accepted' then raise;end if;end;
   end$$;
   update public.app_store set data='{"payslips":[],"expenses":[],"bookings":[{"ref":"KEEP"}]}'::jsonb where id='main';
   do $$begin
    if jsonb_array_length(public.read_payroll_finances()->'expenses')<>3 then raise exception 'Stale snapshot erased payments';end if;
   end$$;
  `);
  for(const n of [2,5])sql(`${as(n)}do $$begin
    begin perform public.read_staff_daily_records();raise exception 'Private ledger leaked';exception when insufficient_privilege then null;end;
    begin perform public.add_staff_daily_entry('${uid(209)}','${person}','2026-11-01','payment',10,'No');
      raise exception 'Unauthorized save';exception when insufficient_privilege then null;end;
   end$$;`);
  sql(`${as(4)}do $$begin
   if (public.read_staff_daily_records()->>'canManage')::boolean then raise exception 'Viewer can manage';end if;
   begin perform public.save_staff_pay_person('${uid(300)}','No','no@example.invalid','daily',1);
    raise exception 'Viewer saved';exception when insufficient_privilege then null;end;
   begin perform ukow_staff_private.create_portal_payslip('{}','Unpaid');
    raise exception 'Private payroll bypass';exception when insufficient_privilege then null;end;
  end$$;`);
  const sheetRow=(n,props={})=>({
   person_id:uid(n),name:"Sheet Staff "+n,email:`sheet${n}@example.invalid`,pay_basis:"monthly",rate:1800,
   date:"2026-11-02",work:0,overtime:0,expense:0,advance:0,payment:0,notes:"Spreadsheet",
   entry_ids:Object.fromEntries(["work","overtime","expense","advance","payment"].map((k,i)=>[k,uid(n*10+i)])),
   ...props
  });
  const rows=[
   sheetRow(400,{overtime:50,expense:40,advance:100}),
   sheetRow(400,{date:"2026-11-03",overtime:25,payment:150,entry_ids:sheetRow(401).entry_ids}),
   sheetRow(402,{pay_basis:"daily",rate:120,work:240,overtime:10,expense:5,advance:30,payment:50})
  ];
  const json=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
  const save=(r,b=900)=>`public.save_staff_daily_sheet(${json(r)},'${uid(b)}')`;
  sql(`${as(3)}select ${save(rows)};select ${save(rows)};
   do $$declare d jsonb;begin
    if public.staff_daily_totals('${uid(400)}','2026-11')<>'{"basic":1800,"overtime":75,"otherExpenses":40,"advance":250}'::jsonb then raise exception 'Sheet monthly salary duplicated';end if;
    if public.staff_daily_totals('${uid(402)}','2026-11')<>'{"basic":240,"overtime":10,"otherExpenses":5,"advance":80}'::jsonb then raise exception 'Sheet daily totals wrong';end if;
    d:=public.read_staff_daily_records();
    if (select count(*) from jsonb_array_elements(d->'entries') e where e->>'staff_id' in ('${uid(400)}','${uid(402)}'))<>10 then raise exception 'Sheet retry duplicated entries';end if;
    if (select sum((e->>'amount')::numeric) from jsonb_array_elements(d#>'{finances,expenses}') e where e->>'payee' like 'Sheet Staff%')<>330 then raise exception 'Sheet expense payments duplicated';end if;
    begin perform ${save([{...rows[0],payment:999}])};raise exception 'Changed batch accepted';
      exception when raise_exception then if sqlerrm='Changed batch accepted' then raise;end if;end;
   end$$;
  `);
  const invalid=[sheetRow(410,{payment:100}),sheetRow(411,{overtime:-1})];
  sql(`${as(3)}do $$declare d jsonb;begin
   begin perform ${save(invalid,901)};raise exception 'Invalid batch accepted';
    exception when raise_exception then
     if sqlerrm='Invalid batch accepted' then raise;end if;
     if position('Row 2:' in sqlerrm)=0 then raise exception 'Missing row-specific error: %',sqlerrm;end if;
   end;
   d:=public.read_staff_daily_records();
   if exists(select 1 from jsonb_array_elements(d->'people') p where p->>'id'='${uid(410)}') then raise exception 'Partial person saved';end if;
   if exists(select 1 from jsonb_array_elements(d#>'{finances,expenses}') e where e->>'payee'='Sheet Staff 410') then raise exception 'Partial payment saved';end if;
  end$$;
  select ${save([invalid[0],{...invalid[1],overtime:25}],901)};
  `);
  for(const n of [2,4,5])sql(`${as(n)}do $$begin
   begin perform ${save(rows,902)};raise exception 'Unauthorized sheet save';
    exception when insufficient_privilege then null;end;
  end$$;`);
  sql(`${as(1)}do $$begin
   begin perform ${save([sheetRow(100,{name:"Monthly Staff",email:"staff@example.invalid",rate:2000,date:"2026-10-20",payment:10})],903)};raise exception 'Closed sheet accepted';
    exception when raise_exception then if sqlerrm='Closed sheet accepted' then raise;end if;end;
   begin perform ${save([sheetRow(400,{rate:9999})],904)};raise exception 'Sheet changed saved rate';
    exception when raise_exception then if sqlerrm='Sheet changed saved rate' then raise;end if;end;
  end$$;`);
 }finally{if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"]);fs.rmSync(dir,{recursive:true,force:true})}
});
