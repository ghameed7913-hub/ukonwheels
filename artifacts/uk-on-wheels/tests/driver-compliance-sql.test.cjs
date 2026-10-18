/* Isolated PostgreSQL cluster only; never connects to the portal database. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"../../..");
test("Real SQL: date validation, own-account notices, API/storage lock and HR renewal",{timeout:60000},t=>{
  if(spawnSync("which",["initdb"]).status!==0)return t.skip("PostgreSQL test binaries unavailable");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-expiry-"));
  const data=path.join(dir,"data"),socket=path.join(dir,"socket");
  fs.mkdirSync(socket);
  function run(cmd,args,input) {
    const r=spawnSync(cmd,args,{input,encoding:"utf8",timeout:30000});
    assert.equal(r.status,0,`${cmd}: ${r.stderr}\n${r.stdout}`);
    return r.stdout;
  }
  function sql(text){return run("psql",["-X","-h",socket,"-U","ukow_test_owner","-d","postgres","-v","ON_ERROR_STOP=1","-qAt"],text)}
  let started=false;
  try {
    run("initdb",["-D",data,"-U","ukow_test_owner","-A","trust","--no-locale","-E","UTF8"]);
    run("pg_ctl",["-D",data,"-l",path.join(dir,"postgres.log"),"-o",`-k ${socket} -c listen_addresses=''`,"-w","start"]);
    started=true;
    sql(`
      create role anon; create role authenticated; create role authenticator;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public,storage to anon,authenticated;
      create table public.profiles(id uuid primary key,email text,role text,status text);
      create function public.is_portal_admin() returns boolean language sql stable security definer as
        $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
      create function public.has_portal_permission(text) returns boolean language sql stable as $$select false$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert on storage.objects to authenticated;
      create policy test_existing_storage_permission on storage.objects for all to authenticated using(true) with check(true);
      insert into public.profiles values
       ('00000000-0000-0000-0000-000000000001','admin@example.test','admin','Active'),
       ('00000000-0000-0000-0000-000000000002','driver@example.test','driver','Active'),
       ('00000000-0000-0000-0000-000000000003','other@example.test','driver','Active'),
       ('00000000-0000-0000-0000-000000000004','client@example.test','client','Active');
    `);
    // Simulate the older deployed whitelist, not just a fresh latest installation.
    const hr=fs.readFileSync(path.join(root,"supabase/hr-screening-patch.sql"),"utf8")
      .replace(",\n      'passportExpiry','visaExpiry','identityExpiry','dvlaExpiry','qualificationExpiry','safetyExpiry','dbsExpiry'","");
    sql(hr);
    const patch=fs.readFileSync(path.join(root,"supabase/driver-document-access.sql"),"utf8");
    sql(patch);sql(patch); // safe rerun
    const admin="00000000-0000-0000-0000-000000000001";
    const driver="00000000-0000-0000-0000-000000000002";
    const employee="10000000-0000-0000-0000-000000000001";
    sql(`
      set request.jwt.claim.sub='${admin}';
      select public.save_hr_employee(jsonb_build_object('id','${employee}','version',0,
        'data',jsonb_build_object('firstName','Test','lastName','Driver','email','driver@example.test',
        'passportExpiry',((now() at time zone 'Europe/London')::date-1)::text)));
      do $$begin
        if (select data->>'portalUserId' from public.hr_employee_records where id='${employee}')<>'${driver}'
          then raise exception 'Email did not auto-link'; end if;
      end$$;
      set role authenticated;
      set request.jwt.claim.sub='${driver}';
      do $$declare s jsonb;begin
        s:=public.driver_document_status();
        if not (s->>'blocked')::boolean or s->'expired'->0->>'label'<>'Passport' then raise exception 'Passport not blocked'; end if;
        if s::text like '%driver@example%' or s::text like '%firstName%' then raise exception 'Private data leaked'; end if;
        begin
          perform public.enforce_driver_document_access();
          raise exception 'API bypass allowed';
        exception when insufficient_privilege then null; end;
        if public.driver_documents_allow_storage() then raise exception 'Storage bypass allowed'; end if;
        if exists(select 1 from public.hr_employee_records) then raise exception 'Private HR visible to Driver'; end if;
        begin
          perform public.save_hr_employee_core('{}');
          raise exception 'Driver can call HR core';
        exception when insufficient_privilege then null; end;
      end$$;
      set request.path='/rpc/driver_document_status';
      select public.enforce_driver_document_access();
      set request.path='/rpc/anything_else';
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
      do $$begin if (public.driver_document_status()->>'blocked')::boolean then raise exception 'Unrelated Driver blocked'; end if;end$$;
      set request.jwt.claim.sub='${admin}';
      select public.enforce_driver_document_access();
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
      select public.enforce_driver_document_access();
      reset role;
      set request.jwt.claim.sub='${admin}';
      select public.save_hr_employee(jsonb_build_object('id','${employee}','version',1,
        'data',jsonb_build_object('firstName','Test','lastName','Driver','email','driver@example.test',
        'passportExpiry',((now() at time zone 'Europe/London')::date)::text,
        'visaExpiry','2099-01-01','licenceExpiry','2099-01-01','qualificationExpiry','2000-01-01')));
      set role authenticated;
      set request.jwt.claim.sub='${driver}';
      do $$declare s jsonb;begin
        s:=public.driver_document_status();
        if (s->>'blocked')::boolean then raise exception 'HR renewal failed';end if;
        if jsonb_array_length(s->'expired')<>1 or s->'expired'->0->>'label'<>'Qualification'
          then raise exception 'Noncritical alert missing';end if;
      end$$;
      select public.enforce_driver_document_access();
      reset role;
      do $$declare k text;begin
        foreach k in array array['licenceExpiry','passportExpiry','visaExpiry'] loop
          update public.hr_employee_records set data=jsonb_set(data,array[k],'"2000-01-01"') where id='${employee}';
          perform set_config('request.jwt.claim.sub','${driver}',false);
          if not (public.driver_document_status()->>'blocked')::boolean then raise exception 'Missing critical lock %',k;end if;
          update public.hr_employee_records set data=jsonb_set(data,array[k],'"2099-01-01"') where id='${employee}';
        end loop;
        begin
          update public.hr_employee_records set data=jsonb_set(data,'{visaExpiry}','"2026-02-30"') where id='${employee}';
          raise exception 'Invalid date accepted';
        exception when datetime_field_overflow then null;end;
      end$$;
    `);
    assert.match(sql("select array_to_string(rolconfig,',') from pg_roles where rolname='authenticator'"),
      /pgrst.db_pre_request=public.enforce_driver_document_access/);
  } finally {
    if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"],{encoding:"utf8"});
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
