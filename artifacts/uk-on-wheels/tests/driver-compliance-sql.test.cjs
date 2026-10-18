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
    // Company ID tests extend this isolated fixture; no live storage is touched.
    sql(`
      alter table public.profiles add column name text default 'Test Driver';
      alter table public.profiles add column full_name text;
      alter table public.profiles add column phone text;
      alter table storage.objects add column metadata jsonb default '{}';
      drop policy test_existing_storage_permission on storage.objects;
    `);
    const identityPatch=fs.readFileSync(path.join(root,"supabase/driver-company-id.sql"),"utf8");
    sql(identityPatch);sql(identityPatch);
    sql(`
      set role authenticated;
      set request.jwt.claim.sub='${driver}';
      set request.method='POST';
      set request.path='/rpc/save_pickup_inspection';
      do $$begin
        if public.driver_has_required_photo() then raise exception 'Missing photo treated as ready';end if;
        begin
          perform public.enforce_driver_document_access();
          raise exception 'Driver can act without compulsory portrait';
        exception when insufficient_privilege then null;end;
        begin
          perform public.list_driver_identities();
          raise exception 'Driver can read HR identity directory';
        exception when insufficient_privilege then null;end;
        begin
          perform public.issue_driver_company_id('${driver}',null,0);
          raise exception 'Driver can issue own ID';
        exception when insufficient_privilege then null;end;
        begin
          perform public.driver_identity_snapshot('00000000-0000-0000-0000-000000000003');
          raise exception 'Driver can inspect another Driver identity';
        exception when insufficient_privilege then null;end;
      end$$;
      set request.path='/rpc/own_driver_identity';
      select public.enforce_driver_document_access();
      select public.own_driver_identity();
      insert into storage.objects(bucket_id,name,metadata) values('driver-portraits',
        '${driver}/11111111-1111-1111-1111-111111111111.jpg','{"mimetype":"image/jpeg","size":2000}');
      select public.register_driver_portrait('${driver}/11111111-1111-1111-1111-111111111111.jpg');
      select public.register_driver_portrait('${driver}/11111111-1111-1111-1111-111111111111.jpg');
      do $$begin
        if not public.driver_has_required_photo() then raise exception 'Saved photo not ready';end if;
        if (public.own_driver_identity()->>'version')::integer<>1 then raise exception 'Photo retry changed version';end if;
      end$$;
      set request.path='/rpc/save_pickup_inspection';
      select public.enforce_driver_document_access();
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
      do $$begin
        if exists(select 1 from storage.objects where bucket_id='driver-portraits') then
          raise exception 'Another Driver can read portrait';end if;
        begin
          perform public.register_driver_portrait('${driver}/11111111-1111-1111-1111-111111111111.jpg');
          raise exception 'Another Driver can register portrait';
        exception when raise_exception then
          if sqlerrm='Another Driver can register portrait' then raise;end if;
        end;
      end$$;
      set request.jwt.claim.sub='${admin}';
      select public.issue_driver_company_id('${driver}',null,1);
      do $$declare s jsonb;begin
        s:=public.list_driver_identities();
        if not (s->>'canIssue')::boolean then raise exception 'Admin cannot issue';end if;
      end$$;
      set request.jwt.claim.sub='${driver}';
      do $$declare s jsonb;begin
        s:=public.own_driver_identity();
        if s->'card'->>'state'<>'active' or s->'card'->>'reference'!~'^UKOW-ID-[0-9]+$' then raise exception 'Issued card missing';end if;
        begin
          perform public.revoke_driver_company_id('${driver}','Tampering',2);
          raise exception 'Driver can revoke own company ID';
        exception when insufficient_privilege then null;end;
      end$$;
      insert into storage.objects(bucket_id,name,metadata) values('driver-portraits',
        '${driver}/22222222-2222-2222-2222-222222222222.jpg','{"mimetype":"image/jpeg","size":2000}');
      select public.register_driver_portrait('${driver}/22222222-2222-2222-2222-222222222222.jpg');
      do $$begin
        if public.own_driver_identity()->'card'->>'state'<>'revoked' then raise exception 'Photo replacement did not invalidate ID';end if;
      end$$;
      set request.jwt.claim.sub='${admin}';
      do $$begin
        begin
          perform public.issue_driver_company_id('${driver}',null,2);
          raise exception 'Stale HR update was allowed';
        exception when raise_exception then
          if sqlerrm='Stale HR update was allowed' then raise;end if;
        end;
      end$$;
      select public.issue_driver_company_id('${driver}',null,3);
      select public.revoke_driver_company_id('${driver}','Card no longer authorised',4);
      set request.jwt.claim.sub='${driver}';
      do $$begin if public.own_driver_identity()->'card'->>'state'<>'revoked' then raise exception 'HR revocation invisible';end if;end$$;
      reset role;
      -- ID expiry and account suspension override issued/active appearance.
      update public.driver_identities set revoked_at=null,valid_until='2000-01-01' where user_id='${driver}';
      set request.jwt.claim.sub='${driver}';
      do $$begin if public.own_driver_identity()->'card'->>'state'<>'expired' then raise exception 'Expired card active';end if;end$$;
      update public.driver_identities set valid_until=null where user_id='${driver}';
      update public.profiles set status='Inactive' where id='${driver}';
      do $$begin
        if public.driver_identity_snapshot('${driver}')->'card'->>'state'<>'suspended' then raise exception 'Inactive account ID active';end if;
      end$$;
    `);
    const hrPortrait=fs.readFileSync(path.join(root,"supabase/hr-driver-photo-upload.sql"),"utf8");
    sql(hrPortrait);sql(hrPortrait);
    sql(`
      update public.profiles set status='Active' where id='${driver}';
      set role authenticated;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
      insert into storage.objects(bucket_id,name,metadata) values('driver-portraits',
        '${driver}/33333333-3333-3333-3333-333333333333.jpg','{"mimetype":"image/jpeg","size":2000}');
      do $$declare before_version integer; snapshot jsonb;
      begin
        before_version:=(public.list_driver_identities()->'drivers'->0->>'version')::integer;
        -- Retrieve the target version without relying on directory ordering.
        select (r->>'version')::integer into before_version
          from jsonb_array_elements(public.list_driver_identities()->'drivers') r
          where r->>'user_id'='${driver}';
        snapshot:=public.register_hr_driver_portrait('${driver}',
          '${driver}/33333333-3333-3333-3333-333333333333.jpg',before_version);
        if snapshot->'card'->>'state'<>'revoked' then raise exception 'HR photo failed to invalidate ID';end if;
        if (snapshot->>'version')::integer<>before_version+1 then raise exception 'HR photo version incorrect';end if;
        snapshot:=public.register_hr_driver_portrait('${driver}',
          '${driver}/33333333-3333-3333-3333-333333333333.jpg',before_version);
        if (snapshot->>'version')::integer<>before_version+1 then raise exception 'Retry changed version';end if;
        begin
          perform public.register_hr_driver_portrait('${driver}',
            '${driver}/11111111-1111-1111-1111-111111111111.jpg',before_version);
          raise exception 'Stale HR photo accepted';
        exception when raise_exception then if sqlerrm='Stale HR photo accepted' then raise;end if;end;
        begin
          perform public.register_hr_driver_portrait('${driver}',
            '00000000-0000-0000-0000-000000000003/11111111-1111-1111-1111-111111111111.jpg',before_version+1);
          raise exception 'Wrong Driver photo accepted';
        exception when raise_exception then if sqlerrm='Wrong Driver photo accepted' then raise;end if;end;
      end$$;
      set request.jwt.claim.sub='${driver}';
      do $$begin
        if public.own_driver_identity()->>'photo_path'<>'${driver}/33333333-3333-3333-3333-333333333333.jpg' then
          raise exception 'HR photo missing from Driver portal';
        end if;
        begin
          perform public.register_hr_driver_portrait('${driver}',
            '${driver}/33333333-3333-3333-3333-333333333333.jpg',0);
          raise exception 'Driver used HR portrait writer';
        exception when insufficient_privilege then null;end;
      end$$;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
      do $$begin
        if public.driver_portrait_permission('${driver}/44444444-4444-4444-4444-444444444444.jpg',true) then
          raise exception 'Client can upload Driver portraits';
        end if;
      end$$;
      reset role;
    `);
    const uploadedID=fs.readFileSync(path.join(root,"supabase/driver-digital-id-upload.sql"),"utf8");
    sql(uploadedID);sql(uploadedID);
    sql(`
      set role authenticated;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
      insert into storage.objects(bucket_id,name,metadata) values
        ('driver-company-ids','${driver}/55555555-5555-5555-5555-555555555555.pdf','{"mimetype":"application/pdf","size":2000}'),
        ('driver-company-ids','${driver}/66666666-6666-6666-6666-666666666666.pdf','{"mimetype":"application/pdf","size":2000}');
      do $$declare v integer; snapshot jsonb;
      begin
        select (r->>'version')::integer into v from jsonb_array_elements(public.list_driver_identities()->'drivers') r
          where r->>'user_id'='${driver}';
        snapshot:=public.register_driver_company_id_file('${driver}',
          '${driver}/55555555-5555-5555-5555-555555555555.pdf','Company ID.pdf','application/pdf',null,v);
        if snapshot->'card'->>'source'<>'uploaded' or snapshot->'card'->>'state'<>'active'
          or snapshot->'card'->'document'->>'mime'<>'application/pdf' then raise exception 'Uploaded ID not active';end if;
        snapshot:=public.register_driver_company_id_file('${driver}',
          '${driver}/55555555-5555-5555-5555-555555555555.pdf','Company ID.pdf','application/pdf',null,v);
        if (snapshot->>'version')::integer<>v+1 then raise exception 'ID retry changed version';end if;
        begin
          perform public.register_driver_company_id_file('${driver}',
            '${driver}/66666666-6666-6666-6666-666666666666.pdf','Company ID.pdf','application/pdf',null,v);
          raise exception 'Stale ID file update accepted';
        exception when raise_exception then if sqlerrm='Stale ID file update accepted' then raise;end if;end;
        begin
          perform public.register_driver_company_id_file('${driver}',
            '${driver}/66666666-6666-6666-6666-666666666666.pdf','ID.html','text/html',null,v+1);
          raise exception 'HTML ID accepted';
        exception when raise_exception then if sqlerrm='HTML ID accepted' then raise;end if;end;
      end$$;
      set request.jwt.claim.sub='${driver}';
      do $$begin
        if public.own_driver_identity()->'card'->'document'->>'name'<>'Company ID.pdf'
          or not public.company_id_file_permission('${driver}/55555555-5555-5555-5555-555555555555.pdf',false) then
          raise exception 'Driver cannot see own uploaded ID';
        end if;
        if (select count(*) from storage.objects where bucket_id='driver-company-ids')<>1 then
          raise exception 'Driver can read another unregistered ID object';
        end if;
        begin
          insert into storage.objects(bucket_id,name,metadata) values('driver-company-ids',
            '${driver}/77777777-7777-7777-7777-777777777777.pdf','{"mimetype":"application/pdf","size":10}');
          raise exception 'Driver can upload own official ID';
        exception when insufficient_privilege then null;end;
        begin
          perform public.register_driver_company_id_file('${driver}',
            '${driver}/55555555-5555-5555-5555-555555555555.pdf','Company ID.pdf','application/pdf',null,0);
          raise exception 'Driver can issue uploaded ID';
        exception when insufficient_privilege then null;end;
      end$$;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
      do $$begin
        if exists(select 1 from storage.objects where bucket_id='driver-company-ids') then raise exception 'Other Driver can read ID';end if;
      end$$;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
      do $$begin
        if public.company_id_file_permission('${driver}/55555555-5555-5555-5555-555555555555.pdf',false)
          then raise exception 'Client can read company ID file';end if;
      end$$;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
      select public.revoke_driver_company_id('${driver}','No longer valid',
        (select (r->>'version')::integer from jsonb_array_elements(public.list_driver_identities()->'drivers') r where r->>'user_id'='${driver}'));
      set request.jwt.claim.sub='${driver}';
      do $$begin
        if exists(select 1 from storage.objects where bucket_id='driver-company-ids')
          then raise exception 'Driver can read revoked ID file';end if;
      end$$;
      reset role;
      update public.driver_identities set revoked_at=null,valid_until='2000-01-01' where user_id='${driver}';
      do $$begin
        if public.company_id_file_permission('${driver}/55555555-5555-5555-5555-555555555555.pdf',false)
          then raise exception 'Expired ID file readable';end if;
      end$$;
      update public.driver_identities set valid_until=null where user_id='${driver}';
      delete from storage.objects where bucket_id='driver-company-ids' and name='${driver}/55555555-5555-5555-5555-555555555555.pdf';
      do $$begin
        if public.own_driver_identity()->'card'->>'state'<>'suspended' then raise exception 'Missing ID file appeared active';end if;
      end$$;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
      select public.issue_driver_company_id('${driver}',null,
        (select (r->>'version')::integer from jsonb_array_elements(public.list_driver_identities()->'drivers') r where r->>'user_id'='${driver}'));
      do $$declare r jsonb;begin
        select r0 into r from jsonb_array_elements(public.list_driver_identities()->'drivers') r0 where r0->>'user_id'='${driver}';
        if r->'card'->>'source'<>'generated' or r->'card'->'document'<>'null'::jsonb then raise exception 'Legacy reissue retained uploaded file';end if;
      end$$;
    `);
  } finally {
    if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","-w","stop"],{encoding:"utf8"});
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
