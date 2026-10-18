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
        ('${uid(4)}','staff','Active'),('${uid(5)}','staff','Active'),('${uid(6)}','staff','Active');
      create function public.is_portal_admin() returns boolean language sql stable security definer as
        $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='Active')$$;
      create function public.has_portal_permission(k text) returns boolean language sql stable as
        $$select (auth.uid()='${uid(4)}' and k='hr:view')
          or (auth.uid()='${uid(5)}' and k='accounts:view')
          or (auth.uid()='${uid(6)}' and k='hr:manage')$$;
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
  }finally{
    if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"]);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
