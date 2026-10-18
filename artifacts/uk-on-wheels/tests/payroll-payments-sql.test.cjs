/* Temporary PostgreSQL only. No connection to live payroll. */
const {test}=require("node:test");
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {spawnSync,spawn}=require("node:child_process");
test("Real SQL: atomic paid expenses, role access, idempotency, stale snapshots and concurrent payroll",{timeout:60000},async t=>{
  if(spawnSync("which",["initdb"]).status!==0)return t.skip("PostgreSQL unavailable");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-payroll-")),data=path.join(dir,"data"),socket=path.join(dir,"socket");
  fs.mkdirSync(socket);
  const args=["-X","-h",socket,"-U","payroll_owner","-d","postgres","-v","ON_ERROR_STOP=1","-qAt"];
  function run(cmd,args,input){const r=spawnSync(cmd,args,{input,encoding:"utf8",timeout:30000});assert.equal(r.status,0,r.stderr+"\n"+r.stdout);return r.stdout;}
  const sql=text=>run("psql",args,text);
  const uid=n=>"00000000-0000-0000-0000-"+String(n).padStart(12,"0");
  const as=n=>`set role authenticated;set request.jwt.claim.sub='${uid(n)}';`;
  const slip=(id,role="Driver",net=930)=>JSON.stringify({id,name:"Employee",email:"test@example.invalid",role,month:"2026-10",net});
  function parallel(text){return new Promise((resolve,reject)=>{
    const p=spawn("psql",args);let err="";p.stderr.on("data",d=>err+=d);p.stdout.resume();
    p.on("error",reject);p.on("exit",code=>code===0?resolve():reject(Error(err)));p.stdin.end(text);
  });}
  let started=false;
  try{
    run("initdb",["-D",data,"-U","payroll_owner","-A","trust","--no-locale","-E","UTF8"]);
    run("pg_ctl",["-D",data,"-l",path.join(dir,"postgres.log"),"-o",`-k ${socket} -c listen_addresses=''`,"-w","start"]);started=true;
    sql(`
      create role anon;create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;
      create table public.profiles(id uuid primary key,role text,status text);
      insert into public.profiles values
        ('${uid(1)}','admin','Active'),('${uid(2)}','driver','Active'),('${uid(3)}','client','Active'),
        ('${uid(4)}','staff','Active'),('${uid(5)}','staff','Active'),('${uid(6)}','staff','Active'),
        ('${uid(7)}','staff','Active');
      create function public.is_portal_admin() returns boolean language sql stable security definer as
        $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='Active')$$;
      create function public.has_portal_permission(k text) returns boolean language sql stable as
        $$select (auth.uid()='${uid(4)}' and k='hr:view')
          or (auth.uid()='${uid(5)}' and k='accounts:view')
          or (auth.uid()='${uid(6)}' and k='hr:manage')
          or (auth.uid()='${uid(7)}' and k='accounts:manage')$$;
      create function public.hr_screening_access(w boolean default false) returns boolean language sql stable as
        $$select public.is_portal_admin() or public.has_portal_permission('hr:manage')
          or (not w and public.has_portal_permission('hr:view'))$$;
      create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
      grant select,update on public.app_store to authenticated;
      insert into public.app_store values('main',
        '{"bookings":[],"payslips":[{"id":"historic","role":"Driver","net":80},{"id":"negative","role":"Driver","net":-10}],
          "expenses":[{"category":"Fuel","amount":12}]}'::jsonb,now());
    `);
    const patch=fs.readFileSync(path.resolve(__dirname,"../../../supabase/payslip-payments.sql"),"utf8");
    sql(patch);sql(patch);
    const bulk=fs.readFileSync(path.resolve(__dirname,"../../../supabase/bulk-expenses.sql"),"utf8");
    sql(bulk);sql(bulk);
    const trading=fs.readFileSync(path.resolve(__dirname,"../../../supabase/vehicle-trading.sql"),"utf8");
    sql(trading);sql(trading);
    sql(`${as(1)}
      select public.create_portal_payslip('${slip("DRV")}'::jsonb,'Unpaid');
      do $$declare result jsonb;begin
        result:=public.set_payslip_payment_status('DRV','Paid',0);
        if not exists(select 1 from jsonb_array_elements(result->'payslips') p where p->>'id'='DRV' and p->>'paymentStatus'='Paid')
          or not exists(select 1 from jsonb_array_elements(result->'expenses') e where e->>'payslipId'='DRV')
          then raise exception 'Mutation returned stale payroll';end if;
      end$$;
      select public.set_payslip_payment_status('DRV','Paid',0);
      select public.create_portal_payslip('${slip("DRV")}'::jsonb,'Paid');
      select public.create_portal_payslip('${slip("STAFF","Staff",400)}'::jsonb,'Paid');
      do $$declare s jsonb;begin
        s:=public.read_payroll_finances();
        if (select count(*) from jsonb_array_elements(s->'expenses') e where e->>'payslipId'='DRV')<>1
          or not exists(select 1 from jsonb_array_elements(s->'expenses') e where e->>'payslipId'='DRV'
            and e->>'category'='Wages' and (e->>'amount')::numeric=930)
          or not exists(select 1 from jsonb_array_elements(s->'expenses') e where e->>'payslipId'='STAFF'
            and e->>'category'='Salary' and (e->>'amount')::numeric=400) then raise exception 'Wrong/duplicate payroll expenses';end if;
        begin perform public.set_payslip_payment_status('DRV','Unpaid',0);raise exception 'Stale status accepted';
        exception when raise_exception then if sqlerrm='Stale status accepted' then raise;end if;end;
        begin perform public.set_payslip_payment_status('negative','Paid',0);raise exception 'Negative payout accepted';
        exception when raise_exception then if sqlerrm='Negative payout accepted' then raise;end if;end;
        begin perform public.create_portal_payslip('${slip("BAD","Driver",-10)}'::jsonb,'Paid');raise exception 'Negative create accepted';
        exception when raise_exception then if sqlerrm='Negative create accepted' then raise;end if;end;
        begin perform public.create_portal_payslip('${slip("BAD-HTML")}'::jsonb||'{"deliveredCount":"<script>unsafe</script>"}'::jsonb,'Paid');
          raise exception 'Non-numeric payroll count accepted';
        exception when raise_exception then if sqlerrm='Non-numeric payroll count accepted' then raise;end if;end;
        if exists(select 1 from jsonb_array_elements(public.read_payroll_finances()->'payslips') p where p->>'id'='BAD')
          then raise exception 'Partial failed create persisted';end if;
      end$$;
      -- A stale generic portal save must retain authoritative paid records/expenses.
      update public.app_store set data='{"bookings":[{"ref":"new-booking"}],"payslips":[],"expenses":[{"category":"Rent","amount":25}]}'::jsonb where id='main';
      do $$declare s jsonb;begin
        s:=public.read_payroll_finances();
        if jsonb_array_length(s->'payslips')<>4 or jsonb_array_length(s->'expenses')<>3 then raise exception 'Stale save lost payroll';end if;
        if not exists(select 1 from jsonb_array_elements(s->'expenses') e where e->>'category'='Rent') then raise exception 'Manual expenses not saved';end if;
      end$$;
      select public.set_payslip_payment_status('DRV','Unpaid',1);
      select public.set_payslip_payment_status('DRV','Unpaid',1);
      do $$declare s jsonb;begin
        s:=public.read_payroll_finances();
        if exists(select 1 from jsonb_array_elements(s->'expenses') e where e->>'payslipId'='DRV')
          or jsonb_array_length(s->'expenses')<>2 then raise exception 'Unpaid did not remove only own linked expense';end if;
        begin perform public.apply_payslip_payment('{}','DRV','Paid',0);raise exception 'Internal helper public';
        exception when insufficient_privilege then null;end;
      end$$;
      reset role;
    `);
    for(const n of [2,3,4,5])sql(`${as(n)}
      do $$begin
        begin perform public.set_payslip_payment_status('DRV','Paid',2);raise exception 'Unauthorised status change';
        exception when insufficient_privilege then null;end;
        begin perform public.create_portal_payslip('${slip("UNAUTH")}'::jsonb,'Paid');raise exception 'Unauthorised creation';
        exception when insufficient_privilege then null;end;
      end$$;
    `);
    for(const n of [2,3])sql(`${as(n)}
      do $$begin begin perform public.read_payroll_finances();raise exception 'Driver/Client financial read allowed';
        exception when insufficient_privilege then null;end;end$$;`);
    sql(`${as(4)}do $$begin if (public.read_payroll_finances()->>'canManage')::boolean then raise exception 'HR viewer can manage';end if;end$$;`);
    sql(`${as(5)}do $$begin if public.read_payroll_finances()->'payslips'<>'null'::jsonb then raise exception 'Accounts read exposed payslips';end if;end$$;`);
    await Promise.all([
      parallel(`${as(1)}begin;select public.create_portal_payslip('${slip("CONCURRENT-DRIVER")}'::jsonb,'Paid');select pg_sleep(0.2);commit;`),
      parallel(`${as(6)}select public.create_portal_payslip('${slip("CONCURRENT-STAFF","Staff")}'::jsonb,'Paid');`)
    ]);
    sql(`${as(1)}do $$begin
      if (select count(*) from jsonb_array_elements(public.read_payroll_finances()->'expenses') e where e->>'payslipId' like 'CONCURRENT-%')<>2
        then raise exception 'Concurrent payroll lost an expense';end if;
      if not exists(select 1 from jsonb_array_elements(public.read_payroll_finances()->'payslips') p where p->>'id'='historic' and p->>'net'='80')
        then raise exception 'Historic total changed';end if;
    end$$;`);
    const batch="30000000-0000-0000-0000-000000000001";
    const rows=JSON.stringify([{date:"2026-10-18",category:"Fuel",amount:10.01,method:"Cash",reference:"R1",notes:"first"},
      {date:"2026-10-17",category:"Rent",amount:20.02,method:"Bank Transfer",payee:"Supplier"}]);
    sql(`${as(1)}
      do $$declare result jsonb;begin
        result:=public.save_expense_batch('${batch}','${rows}'::jsonb);
        if result->>'batch_id'<>'${batch}' or (result->>'saved_count')::int<>2
          or (select count(*) from jsonb_array_elements(result->'expenses') e where e->>'batchId'='${batch}')<>2
          then raise exception 'Expense batch response is not committed';end if;
        perform public.save_expense_batch('${batch}','${rows}'::jsonb);
        if (select count(*) from jsonb_array_elements(public.read_payroll_finances()->'expenses') e where e->>'batchId'='${batch}')<>2
          then raise exception 'Retry duplicated batch';end if;
        begin perform public.save_expense_batch('${batch}',jsonb_set('${rows}'::jsonb,'{0,amount}','99'));
          raise exception 'Changed batch accepted';exception when invalid_parameter_value then null;end;
        begin perform public.save_expense_batch('30000000-0000-0000-0000-000000000099',jsonb_set('${rows}'::jsonb,'{1,amount}','0'));
          raise exception 'Partial invalid batch accepted';exception when invalid_parameter_value then null;end;
        if exists(select 1 from jsonb_array_elements(public.read_payroll_finances()->'expenses') e
          where e->>'batchId'='30000000-0000-0000-0000-000000000099') then raise exception 'Partial expense persisted';end if;
        begin perform public.save_expense_batch('30000000-0000-0000-0000-000000000099',jsonb_set('${rows}'::jsonb,'{0,date}','"2026-02-30"'));
          raise exception 'Impossible expense date accepted';exception when invalid_parameter_value then null;end;
      end$$;
      update public.app_store set data=jsonb_set(data,'{expenses}','[{"category":"Office","amount":17}]') where id='main';
      do $$declare s jsonb;begin
        s:=public.read_payroll_finances();
        if (select count(*) from jsonb_array_elements(s->'expenses') e where e->>'batchId'='${batch}')<>2
          or (select count(*) from jsonb_array_elements(s->'expenses') e where e->>'source'='payslip')<>3
          or not exists(select 1 from jsonb_array_elements(s->'expenses') e where e->>'category'='Office')
          then raise exception 'Snapshot protection lost bulk/payroll/manual rows';end if;
      end$$;`);
    for(const n of [2,3,4,5,6])sql(`${as(n)}do $$begin
      begin perform public.save_expense_batch('30000000-0000-0000-0000-000000000099','${rows}');
        raise exception 'Unauthorised bulk write';exception when insufficient_privilege then null;end;
    end$$;`);
    sql(`${as(7)}do $$begin
      if not (public.read_payroll_finances()->>'canManageExpenses')::boolean then raise exception 'Accounts manager access missing';end if;
      begin perform public.save_expense_batch('${batch}','${rows}');raise exception 'Foreign batch retry accepted';
        exception when insufficient_privilege then null;end;
    end$$;`);
    await Promise.all([
      parallel(`${as(1)}begin;select public.save_expense_batch('30000000-0000-0000-0000-000000000002','${rows}');select pg_sleep(0.2);commit;`),
      parallel(`${as(7)}select public.save_expense_batch('30000000-0000-0000-0000-000000000003','${rows}');`)
    ]);
    sql(`${as(1)}do $$begin
      if (select count(*) from jsonb_array_elements(public.read_payroll_finances()->'expenses') e where e->>'source'='expense-batch')<>6
        then raise exception 'Concurrent batches lost expenses';end if;
    end$$;`);
    const tradeId="40000000-0000-0000-0000-000000000001",mutation="50000000-0000-0000-0000-000000000001";
    const vehicle=JSON.stringify({purchaseDate:"2026-10-18",purchaseSource:"auction",sellerName:"Test Auction",
      purchaseAmount:1000,fuel:20.10,motCharges:40,roadTax:30,auctionCharges:100,mileage:42000,
      registration:"ab12 cde",make:"Ford",model:"Focus",serviceHistory:"Full",logBook:"Yes",soldFor:null,totalCost:1,profit:999});
    sql(`${as(1)}do $$declare r jsonb;begin
      r:=public.save_vehicle_trade('${tradeId}',0,'${mutation}','${vehicle}');
      if (r#>>'{trade,totalCost}')::numeric<>1190.10 or r#>'{trade,profit}'<>'null'::jsonb
        or r#>>'{trade,day}'<>'Sunday' or r#>>'{trade,registration}'<>'AB12 CDE'
        then raise exception 'Trade totals/unsold/day/registration wrong';end if;
      perform public.save_vehicle_trade('${tradeId}',0,'${mutation}','${vehicle}');
      if (select count(*) from public.vehicle_trades)<>1 then raise exception 'Duplicate trade retry';end if;
      begin perform public.save_vehicle_trade('${tradeId}',1,'${mutation}',jsonb_set('${vehicle}'::jsonb,'{fuel}','99'));
        raise exception 'Changed mutation accepted';exception when invalid_parameter_value then null;end;
      begin perform public.save_vehicle_trade('40000000-0000-0000-0000-000000000099',0,'${mutation}',jsonb_set('${vehicle}'::jsonb,'{roadTax}','-1'));
        raise exception 'Negative cost accepted';exception when invalid_parameter_value then null;end;
      if exists(select 1 from public.app_store where data ? 'vehicleTrades') then raise exception 'Private trades leaked into shared store';end if;
    end$$;`);
    for(const n of [2,3,4,6])sql(`${as(n)}do $$begin
      begin perform public.read_vehicle_trades();raise exception 'Unauthorised trade read';
        exception when insufficient_privilege then null;end;
      if (select count(*) from public.vehicle_trades)<>0 then raise exception 'Trade RLS leak';end if;
      begin perform public.save_vehicle_trade('${tradeId}',1,'${mutation}','${vehicle}');raise exception 'Unauthorised trade write';
        exception when insufficient_privilege then null;end;
    end$$;`);
    sql(`${as(5)}do $$begin
      if (public.read_vehicle_trades()->>'canManage')::boolean or (select count(*) from public.vehicle_trades)<>1
        then raise exception 'Accounts viewer incorrect access';end if;
      begin perform public.save_vehicle_trade('${tradeId}',1,'${mutation}','${vehicle}');raise exception 'Viewer wrote trade';
        exception when insufficient_privilege then null;end;
      begin update public.vehicle_trades set version=99;raise exception 'Direct table write allowed';
        exception when insufficient_privilege then null;end;
    end$$;`);
    sql(`${as(7)}do $$declare r jsonb;begin
      r:=public.save_vehicle_trade('${tradeId}',1,'50000000-0000-0000-0000-000000000002',jsonb_set('${vehicle}'::jsonb,'{soldFor}','1500'));
      if (r#>>'{trade,profit}')::numeric<>309.90 or (r#>>'{trade,version}')::int<>2 then raise exception 'Trade profit wrong';end if;
      r:=public.save_vehicle_trade('${tradeId}',2,'50000000-0000-0000-0000-000000000003',jsonb_set('${vehicle}'::jsonb,'{soldFor}','1100'));
      if (r#>>'{trade,profit}')::numeric<>-90.10 then raise exception 'Trade loss wrong';end if;
      r:=public.save_vehicle_trade('${tradeId}',3,'50000000-0000-0000-0000-000000000004',jsonb_set('${vehicle}'::jsonb,'{soldFor}','1190.10'));
      if (r#>>'{trade,profit}')::numeric<>0 then raise exception 'Trade break even wrong';end if;
      r:=public.save_vehicle_trade('${tradeId}',4,'50000000-0000-0000-0000-000000000005',jsonb_set('${vehicle}'::jsonb,'{soldFor}','0'));
      if (r#>>'{trade,profit}')::numeric<>-1190.10 then raise exception 'Zero sale treated as unsold';end if;
      begin perform public.save_vehicle_trade('${tradeId}',1,'50000000-0000-0000-0000-000000000006','${vehicle}');
        raise exception 'Stale version accepted';exception when serialization_failure then null;end;
    end$$;`);
    await Promise.all([1,7].map((actor,i)=>parallel(`${as(actor)}do $$begin
      begin perform public.save_vehicle_trade('${tradeId}',5,'50000000-0000-0000-0000-00000000000${i+7}',jsonb_set('${vehicle}'::jsonb,'{soldFor}','${1300+i*100}'));
      exception when serialization_failure then null;end;
    end$$;`)));
    sql(`${as(1)}do $$begin if (select version from public.vehicle_trades where id='${tradeId}')<>6
      then raise exception 'Concurrent trade overwritten or saved twice';end if;end$$;`);
    // Existing Driver RPC: test the real ownership filter and HR-to-Driver status hand-off.
    sql(`reset role;
      alter table public.profiles add column email text;
      update public.profiles set email='driver@example.invalid' where id='${uid(2)}';
      update public.profiles set email='client@example.invalid' where id='${uid(3)}';
      create table public.bookings(reference text,client_id uuid,created_by uuid,business_id uuid);
      create function public.is_business_member(uuid) returns boolean language sql as $$select false$$;
    `);
    const safety=fs.readFileSync(path.resolve(__dirname,"../../../supabase/portal-safety-fixes.sql"),"utf8");
    const scoped=safety.match(/create or replace function public\.read_own_portal_store\(\)[\s\S]*?\$\$;/);
    assert.ok(scoped,"Existing Driver read RPC must exist");sql(scoped[0]);
    sql(`update public.app_store set data=jsonb_build_object('payslips',jsonb_build_array(
      jsonb_build_object('id','OWN','profileId','${uid(2)}','role','Driver','name','Driver','month','2026-10','net',123,'email','changed@example.invalid'),
      jsonb_build_object('id','LEGACY','email','DRIVER@EXAMPLE.INVALID','net',80),
      jsonb_build_object('id','FOREIGN','profileId','${uid(6)}','email','driver@example.invalid','net',999),
      jsonb_build_object('id','UNLINKED','profileId',null,'email','driver@example.invalid','net',888),
      jsonb_build_object('id','SAME-NAME','name','Driver','email','someone@example.invalid','net',777)
    ),'expenses','[]'::jsonb) where id='main';
    ${as(2)}
    do $$declare s jsonb;begin
      s:=public.read_own_portal_store();
      if jsonb_array_length(s->'payslips')<>2 or s?'expenses' then raise exception 'Driver financial scope leaked';end if;
      if not exists(select 1 from jsonb_array_elements(s->'payslips') p where p->>'id'='OWN')
        or not exists(select 1 from jsonb_array_elements(s->'payslips') p where p->>'id'='LEGACY') then raise exception 'Own payslips missing';end if;
    end$$;
    ${as(1)}
    select public.set_payslip_payment_status('OWN','Paid',0);
    ${as(2)}
    do $$begin
      if not exists(select 1 from jsonb_array_elements(public.read_own_portal_store()->'payslips') p
        where p->>'id'='OWN' and p->>'paymentStatus'='Paid' and (p->>'net')::numeric=123)
        then raise exception 'HR paid status did not reach Driver';end if;
    end$$;
    ${as(3)}
    do $$begin if jsonb_array_length(public.read_own_portal_store()->'payslips')<>0
      then raise exception 'Client received Driver payslips';end if;end$$;
    `);
  }finally{
    if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"]);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
