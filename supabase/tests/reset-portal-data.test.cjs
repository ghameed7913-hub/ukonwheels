/* Destructive SQL is exercised ONLY in a new temporary local PostgreSQL cluster.
 * This test never accepts DATABASE_URL, production credentials or a remote host.
 */
const {test, before, beforeEach, after} = require("node:test");
const assert = require("node:assert/strict");
const {spawnSync} = require("node:child_process");
const {mkdtempSync, readFileSync, rmSync} = require("node:fs");
const {tmpdir} = require("node:os");
const {join, resolve} = require("node:path");

const root = resolve(__dirname, "..");
const resetSource = readFileSync(join(root, "admin/reset-portal-data.sql"), "utf8");
const core = readFileSync(join(root, "ukow_production_architecture.sql"), "utf8");
const incidents = readFileSync(join(root, "incident_reports_patch.sql"), "utf8");
const workflow = readFileSync(join(root, "portal_workflow_patch.sql"), "utf8");
const admin = "00000000-0000-4000-8000-000000000001";
const client = "00000000-0000-4000-8000-000000000002";
const driver = "00000000-0000-4000-8000-000000000003";
const newClient = "00000000-0000-4000-8000-000000000004";
const biz = "10000000-0000-4000-8000-000000000001";
const booking = "20000000-0000-4000-8000-000000000001";
const report = "30000000-0000-4000-8000-000000000001";
const tables = [
  "booking_events", "booking_evidence", "booking_inspections", "bookings",
  "business_memberships", "businesses", "driver_profiles", "holiday_requests",
  "incident_report_photos", "incident_reports", "invoices", "notifications",
  "payments", "role_upgrade_requests", "staff_profiles", "user_permissions"
];
let directory, running = false;
function run(command, args, input) {
  const result = spawnSync(command, args, {input, encoding: "utf8", timeout: 30000});
  if (result.error) throw result.error;
  return result;
}
function sql(text, success = true) {
  const result = run("psql", [
    "-h", directory, "-p", "55439", "-U", "postgres", "-d", "postgres",
    "-X", "-qAt", "-v", "ON_ERROR_STOP=1"
  ], text);
  if (success) assert.equal(result.status, 0, result.stderr);
  return result;
}
function scalar(text) { return sql(text).stdout.trim(); }
function configured(email = "admin@example.invalid") {
  return resetSource.replace("'REPLACE_WITH_ADMIN_EMAIL'", `'${email}'`)
    .replace("'NOT_CONFIRMED'", "'ERASE_PORTAL_DATA_KEEP_ONE_ADMIN'");
}
function asUser(id, statement, role = "authenticated") {
  return `begin; set local role ${role};
    set local request.jwt.claim.sub = '${id}';
    ${statement};
    commit;`;
}
function stillPopulated() {
  assert.equal(scalar("select count(*) from auth.users"), "3");
  assert.equal(scalar("select count(*) from public.bookings"), "1");
  assert.equal(scalar("select count(*) from public.incident_report_photos"), "1");
  assert.equal(scalar("select data->'bookings'->0->>'ref' from public.app_store where id='main'"), "OLD");
}

// Uses the same disposable cluster, never the application's database.
function installSafety() {
  const functions=[...core.matchAll(/create or replace function public\.\w+\([\s\S]*?\n\$\$;/g)]
    .map(match=>match[0]);
  const needed=["current_profile_role","is_portal_admin","has_portal_permission",
    "is_business_member","create_portal_booking","admin_set_user_role"];
  sql(`
    alter table auth.users add column raw_user_meta_data jsonb default '{}',
      add column updated_at timestamptz,add column email_change text,
      add column email_change_token_new text,add column email_change_token_current text,
      add column email_change_sent_at timestamptz,add column email_change_confirm_status integer;
    create table auth.identities(user_id uuid references auth.users(id),
      provider text,identity_data jsonb,updated_at timestamptz);
    insert into auth.identities(user_id,provider,identity_data)
      select id,'email',jsonb_build_object('email',email) from auth.users;
    ${needed.map(name=>{
      const fn=functions.find(text=>text.startsWith("create or replace function public."+name+"("));
      assert.ok(fn,name);return fn;
    }).join("\n")}
    update public.profiles set name=case when id='${driver}' then 'Synthetic Driver' else 'Synthetic Client' end,
      full_name=case when id='${driver}' then 'Synthetic Driver' else 'Synthetic Client' end;
    update public.profiles set account_type='business',business_id='${biz}' where id='${client}';
    update public.app_store set data='{
      "_resetGeneration":"synthetic-generation",
      "bookings":[{"ref":"OLD"},{"ref":"OTHER"}],
      "staffUsers":[{"id":"${driver}","name":"Synthetic Driver","email":"driver@example.invalid","role":"Driver","status":"Active","password":"DO-NOT-RETURN"}],
      "payslips":[{"email":"driver@example.invalid","net":500},{"email":"another@example.invalid","net":999}],
      "holidays":[],
      "invoices":[
        {"invoiceNo":"OWN","business":"Synthetic business","total":120,"items":[{"ref":"OLD","charge":100}]},
        {"invoiceNo":"FOREIGN","business":"Synthetic business","total":300,"items":[{"ref":"OTHER","charge":250}]},
        {"invoiceNo":"MIXED","items":[{"ref":"OLD"},{"ref":"OTHER"}]},
        {"invoiceNo":"EMPTY","items":[]}
      ],
      "invoiceSettings":{"companyName":"Synthetic company","internalSecret":"MUST-NOT-RETURN"}
    }' where id='main';
  `);
  sql(readFileSync(join(root,"portal-safety-fixes.sql"),"utf8"));
}

test("Safety: Clients cannot read/write the operations row and only see invoices for their own vehicles",()=>{
  installSafety();
  const own=JSON.parse(scalar(asUser(client,"select public.read_own_portal_store();")));
  assert.deepEqual(own.invoices.map(i=>i.invoiceNo),["OWN"]);
  assert.deepEqual(own.staffUsers,[]);assert.deepEqual(own.payslips,[]);
  assert.equal(own.invoiceSettings.internalSecret,undefined);
  assert.equal(scalar(asUser(client,"select count(*) from public.app_store;")),"0");
  assert.equal(scalar(asUser(client,"with changed as (update public.app_store set data='{}' returning id) select count(*) from changed;")),"0");
  const ownDriver=JSON.parse(scalar(asUser(driver,"select public.read_own_portal_store();")));
  assert.equal(ownDriver.payslips.length,1);assert.equal(ownDriver.payslips[0].net,500);
  assert.equal(ownDriver.staffUsers[0].password,undefined);
  assert.deepEqual(ownDriver.invoices,[]);
});

test("Safety: account edits update Auth, email identity, profile and cached HR record without changing the password",()=>{
  installSafety();
  const input=JSON.stringify({firstName:"Changed",middleName:"",lastName:"Driver",email:"changed@example.invalid",phone:"07000000000",role:"Driver",status:"Inactive"});
  sql(asUser(admin,`select public.admin_edit_portal_user('${driver}','${input}',array[]::text[]);`));
  assert.equal(scalar(`select email from auth.users where id='${driver}'`),"changed@example.invalid");
  assert.equal(scalar(`select identity_data->>'email' from auth.identities where user_id='${driver}'`),"changed@example.invalid");
  assert.equal(scalar(`select email||':'||status||':'||full_name from public.profiles where id='${driver}'`),"changed@example.invalid:Inactive:Changed Driver");
  assert.equal(scalar(`select password_marker from auth.users where id='${driver}'`),"synthetic-unchanged-credential");
  assert.equal(scalar("select data->'staffUsers'->0->>'email' from public.app_store where id='main'"),"changed@example.invalid");
  assert.equal(scalar("select data->>'_resetGeneration' from public.app_store where id='main'"),"synthetic-generation");
  sql(`update public.profiles set status='Active' where id='${driver}'`);
  const own=JSON.parse(scalar(asUser(driver,"select public.read_own_portal_store();")));
  assert.equal(own.payslips.length,1);assert.equal(own.payslips[0].profileId,driver);
});

test("Safety: account edits reject non-Admins, duplicate emails and changing a Driver with active jobs",()=>{
  installSafety();
  const payload=email=>JSON.stringify({firstName:"Changed",lastName:"Name",email,role:"Staff",status:"Active"});
  for(const [actor,email] of [[client,"new@example.invalid"],[admin,"client@example.invalid"],[admin,"new@example.invalid"]]){
    assert.notEqual(sql(asUser(actor,`select public.admin_edit_portal_user('${driver}','${payload(email)}');`),false).status,0);
  }
  assert.equal(scalar(`select email from auth.users where id='${driver}'`),"driver@example.invalid");
});

test("Safety: invoice settlement rejects underpayment, commits atomically and is retry-safe",()=>{
  installSafety();
  const settle=(actor,amount)=>asUser(actor,`select public.settle_portal_invoice('OWN',${amount},'2030-03-04','Cash','');`);
  assert.notEqual(sql(settle(admin,1),false).status,0);
  assert.notEqual(scalar(`select payment_status from public.bookings where id='${booking}'`),"Paid");
  assert.notEqual(sql(settle(client,120),false).status,0);
  sql(settle(admin,120));sql(settle(admin,120));
  assert.equal(scalar(`select payment_status from public.bookings where id='${booking}'`),"Paid");
  assert.equal(scalar("select data->'invoices'->0->>'status' from public.app_store where id='main'"),"Paid");
  assert.equal(scalar("select jsonb_array_length(data->'transactions') from public.app_store where id='main'"),"1");
  assert.equal(scalar("select data->>'_resetGeneration' from public.app_store where id='main'"),"synthetic-generation");
});

test("Safety: Client booking dates, miles, drop-off deadline and notes survive a database reload and retry",()=>{
  installSafety();
  const reference="UKOW-2030-"+"A".repeat(32);
  const data=JSON.stringify({customerType:"Business",_businessId:biz,vehicle:"Ford Focus",reg:"AB12XYZ",
    pickup:"Synthetic pickup",destination:"Synthetic destination",receiver:"Synthetic receiver",receiverMobile:"07000000000",
    bookingDate:"2030-03-04",deliveryDate:"2030-03-05",dropoffTill:"17:00",miles:88,amount:0,notes:"Detailed synthetic notes"});
  const create=asUser(client,`select public.client_create_bulk_booking('${reference}','${data}');`);
  sql(create);sql(create);
  assert.equal(scalar(`select count(*) from public.bookings where reference='${reference}'`),"1");
  assert.equal(scalar(`select booking_date||'|'||requested_delivery_date||'|'||miles||'|'||dropoff_deadline||'|'||client_notes from public.bookings where reference='${reference}'`),
    "2030-03-04|2030-03-05|88.00|17:00|Detailed synthetic notes");
});

test("Safety: Driver holiday requests retain HR functionality without granting shared-store access",()=>{
  installSafety();
  const request=JSON.stringify({from:"2030-04-01",to:"2030-04-02",status:"Approved",email:"client@example.invalid",name:"Forged"});
  const response=JSON.parse(scalar(asUser(driver,`select public.request_own_driver_holiday('${request}');`)));
  assert.equal(response.status,"Pending");assert.equal(response.profileId,driver);assert.equal(response.email,"driver@example.invalid");
  assert.notEqual(sql(asUser(client,`select public.request_own_driver_holiday('${request}');`),false).status,0);
  assert.equal(scalar("select jsonb_array_length(data->'holidays') from public.app_store where id='main'"),"1");
});

test("Safety: the upgrade can be applied again without deleting portal data",()=>{
  installSafety();
  sql(readFileSync(join(root,"portal-safety-fixes.sql"),"utf8"));
  assert.equal(scalar("select count(*) from auth.users"),"3");
  assert.equal(scalar("select count(*) from public.bookings"),"1");
});

test("Safety: a late account-save failure rolls back the Auth email and profile changes",()=>{
  installSafety();
  sql(`create function public.reject_safety_write() returns trigger language plpgsql as
    $$begin raise exception 'Synthetic late failure'; end$$;
    create trigger reject_safety_write before update on public.app_store
    for each row execute function public.reject_safety_write();`);
  const data=JSON.stringify({firstName:"Changed",lastName:"Driver",email:"changed@example.invalid",role:"Driver",status:"Active"});
  assert.notEqual(sql(asUser(admin,`select public.admin_edit_portal_user('${driver}','${data}');`),false).status,0);
  assert.equal(scalar(`select email from auth.users where id='${driver}'`),"driver@example.invalid");
  assert.equal(scalar(`select email from public.profiles where id='${driver}'`),"driver@example.invalid");
});

test("Safety: a late payment-save failure leaves booking payment status unchanged",()=>{
  installSafety();
  sql(`create function public.reject_safety_write() returns trigger language plpgsql as
    $$begin raise exception 'Synthetic late failure'; end$$;
    create trigger reject_safety_write before update on public.app_store
    for each row execute function public.reject_safety_write();`);
  assert.notEqual(sql(asUser(admin,"select public.settle_portal_invoice('OWN',120,'2030-03-04','Cash','');"),false).status,0);
  assert.notEqual(scalar(`select payment_status from public.bookings where id='${booking}'`),"Paid");
});

function installInvoiceSettings() {
  installSafety();
  sql(`alter table storage.buckets add column name text,add column public boolean,
      add column file_size_limit bigint,add column allowed_mime_types text[];
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant insert on storage.objects to authenticated;`);
  sql(readFileSync(join(root,"invoice-settings-patch.sql"),"utf8"));
}
test("Invoice defaults: save once, read in another session, preserve unrelated portal data",()=>{
  installInvoiceSettings();
  const settings={companyName:"Shared Company",bankAccountNumber:"12345678",showLogo:false,internalSecret:"not allowed"};
  const saved=JSON.parse(scalar(asUser(admin,`select public.save_invoice_company_settings('${JSON.stringify(settings)}');`)));
  assert.ok(saved.savedAt);assert.equal(saved.internalSecret,undefined);
  const read=JSON.parse(scalar(asUser(admin,"select public.get_invoice_company_settings();")));
  assert.equal(read.bankAccountNumber,"12345678");assert.equal(read.showLogo,false);
  assert.equal(scalar("select jsonb_array_length(data->'invoices') from public.app_store where id='main'"),"4");
  assert.equal(scalar("select data->>'_resetGeneration' from public.app_store where id='main'"),"synthetic-generation");
});
test("Invoice defaults: stale whole-store writes cannot overwrite saved company or bank details",()=>{
  installInvoiceSettings();
  sql(asUser(admin,`select public.save_invoice_company_settings('{"companyName":"Shared","bankAccountNumber":"12345678"}');`));
  sql(asUser(admin,`update public.app_store set data=jsonb_set(jsonb_set(data,'{invoiceSettings}',
    '{"companyName":"Stale","bankAccountNumber":"99999999"}'),'{unrelated}','"kept"') where id='main';`));
  assert.equal(scalar("select data->'invoiceSettings'->>'bankAccountNumber' from public.app_store where id='main'"),"12345678");
  assert.equal(scalar("select data->>'unrelated' from public.app_store where id='main'"),"kept");
});
test("Invoice defaults: Clients may read their own invoice settings but cannot save defaults or read another Client's",()=>{
  installInvoiceSettings();
  sql(asUser(admin,`select public.save_invoice_company_settings('{"companyName":"Shared","bankAccountNumber":"12345678"}');`));
  const own=JSON.parse(scalar(asUser(client,"select public.get_invoice_company_settings('OWN');")));
  assert.equal(own.bankAccountNumber,"12345678");
  assert.notEqual(sql(asUser(client,"select public.get_invoice_company_settings('FOREIGN');"),false).status,0);
  assert.notEqual(sql(asUser(client,"select public.get_invoice_company_settings();"),false).status,0);
  assert.notEqual(sql(asUser(driver,"select public.get_invoice_company_settings('OWN');"),false).status,0);
  assert.notEqual(sql(asUser(client,`select public.save_invoice_company_settings('{"companyName":"Forged"}');`),false).status,0);
});
test("Invoice defaults: historic snapshots remain unchanged when global defaults change",()=>{
  installInvoiceSettings();
  sql(`update public.app_store set data=jsonb_set(data,'{invoices,0,companyDetails}',
    '{"companyName":"Historic","bankAccountNumber":"11111111","showLogo":false}') where id='main';`);
  sql(asUser(admin,`select public.save_invoice_company_settings('{"companyName":"Future","bankAccountNumber":"22222222"}');`));
  const own=JSON.parse(scalar(asUser(client,"select public.get_invoice_company_settings('OWN');")));
  assert.equal(own.companyName,"Historic");assert.equal(own.bankAccountNumber,"11111111");
});
test("Invoice logos: only authorized Operations can upload; setup is repeatable without touching evidence",()=>{
  installInvoiceSettings();
  const logo="logos/00000000-0000-4000-8000-000000000001.png";
  assert.notEqual(sql(asUser(client,`insert into storage.objects(bucket_id,name) values('invoice-branding','${logo}');`),false).status,0);
  sql(asUser(admin,`insert into storage.objects(bucket_id,name) values('invoice-branding','${logo}');`));
  sql(asUser(admin,`select public.save_invoice_company_settings('{"companyName":"Company","logoPath":"${logo}"}');`));
  assert.notEqual(sql(asUser(admin,`select public.save_invoice_company_settings('{"companyName":"Company","logoPath":"logos/missing.png"}');`),false).status,0);
  sql(readFileSync(join(root,"invoice-settings-patch.sql"),"utf8"));
  assert.equal(scalar("select count(*) from auth.users"),"3");
  assert.equal(scalar("select count(*) from storage.objects where bucket_id='invoice-branding'"),"1");
  assert.equal(scalar("select count(*) from storage.buckets where id in ('booking-evidence','incident-evidence','profile-documents')"),"3");
});

function installHR() {
  installInvoiceSettings();
  sql("grant select on storage.objects to authenticated;");
  sql(readFileSync(join(root,"hr-screening-patch.sql"),"utf8"));
}
const hrId="40000000-0000-4000-8000-000000000001";
function hrInput(overrides={}) {
  return {id:hrId,version:0,data:{firstName:"Synthetic",lastName:"Employee",email:"hr@example.invalid",
    addressHistory:"2021-2026: synthetic address",employmentGaps:"None",references:"Synthetic referee"},
    checks:{},decision:"Draft",decisionNote:"",...overrides};
}
function saveHR(input,actor=admin,success=true) {
  return sql(asUser(actor,`select public.save_hr_employee('${JSON.stringify(input).replaceAll("'","''")}'::jsonb);`),success);
}
test("HR: separate employee drafts persist without creating sign-ins or changing the shared store",()=>{
  installHR();
  const before=scalar("select data from public.app_store where id='main'");
  const saved=JSON.parse(saveHR(hrInput()).stdout.trim());
  assert.match(saved.reference,/^HR-\d{4}-\d{6,}$/);
  assert.equal(saved.checks.identity.status,"Pending");
  assert.equal(saved.reviewed_by,null);
  assert.equal(scalar("select count(*) from auth.users"),"3");
  assert.equal(scalar("select data from public.app_store where id='main'"),before);
  const reload=JSON.parse(scalar(asUser(admin,`select to_jsonb(r) from public.hr_employee_records r where id='${hrId}'`)));
  assert.equal(reload.data.references,"Synthetic referee");
  const other=JSON.parse(saveHR(hrInput({id:"40000000-0000-4000-8000-000000000002"})).stdout.trim());
  assert.notEqual(saved.reference,other.reference);
});
test("HR: required checks and review notes gate approval; server stamps reviewers",()=>{
  installHR();saveHR(hrInput());
  assert.notEqual(saveHR(hrInput({version:1,decision:"Approved",decisionNote:"Reviewed"}),admin,false).status,0);
  const checks=Object.fromEntries(["identity","rightToWork","addressHistory","employmentHistory","references","dvla","qualifications","dbs"]
    .map(k=>[k,{status:"Passed",required:true,notes:"Manually checked",reviewedBy:driver,reviewedAt:"2000-01-01"}]));
  const saved=JSON.parse(saveHR(hrInput({version:1,checks,decision:"Approved",decisionNote:"Reviewed and approved"})).stdout.trim());
  assert.equal(saved.reviewed_by,admin);assert.equal(saved.checks.identity.reviewedBy,admin);
  assert.ok(saved.checks.identity.reviewedAt.startsWith(new Date().getFullYear().toString()));
  assert.equal(saved.decision,"Approved");
  const reopened=JSON.parse(saveHR(hrInput({version:2,checks,decision:"Draft"})).stdout.trim());
  assert.equal(reopened.reviewed_at,null);assert.equal(reopened.decision,"Draft");
});
test("HR: failed, blank-note and non-applicable checks cannot silently approve an employee",()=>{
  installHR();
  const checks=Object.fromEntries(["identity","rightToWork","addressHistory","employmentHistory","references","dvla","qualifications","dbs"]
    .map(k=>[k,{status:"Passed",required:true,notes:"Checked"}]));
  for (const change of [{status:"Failed",required:true,notes:"Failed check"},{status:"Passed",required:true,notes:""},{status:"Pending",required:false,notes:""}]) {
    assert.notEqual(saveHR(hrInput({checks:{...checks,identity:change},decision:"Approved",decisionNote:"Review"}),admin,false).status,0);
  }
  assert.equal(scalar("select count(*) from public.hr_employee_records"),"0");
});
test("HR: Clients, Drivers, inactive accounts and unrelated Staff cannot access private records or files",()=>{
  installHR();saveHR(hrInput());
  const path=hrId+"/50000000-0000-4000-8000-000000000001.pdf";
  sql(`insert into storage.objects(bucket_id,name) values('hr-screening','${path}')`);
  for (const actor of [client,driver]) {
    assert.equal(scalar(asUser(actor,"select count(*) from public.hr_employee_records")),"0");
    assert.equal(scalar(asUser(actor,"select count(*) from storage.objects where bucket_id='hr-screening'")),"0");
    assert.notEqual(saveHR(hrInput({version:1}),actor,false).status,0);
  }
  sql(`update public.profiles set role='staff' where id='${client}'`);
  assert.equal(scalar(asUser(client,"select public.hr_screening_access(false)")),"f");
  sql(`update public.profiles set status='Inactive' where id='${admin}'`);
  assert.notEqual(saveHR(hrInput({version:1}),admin,false).status,0);
});
test("HR: HR-view Staff can read but only HR-manage Staff can edit or upload",()=>{
  installHR();saveHR(hrInput());
  sql(`update public.profiles set role='staff' where id='${client}';
    insert into public.user_permissions(profile_id,permission_key,granted_by) values('${client}','hr:view','${admin}')`);
  assert.equal(scalar(asUser(client,"select count(*) from public.hr_employee_records")),"1");
  assert.notEqual(saveHR(hrInput({version:1}),client,false).status,0);
  const path=hrId+"/50000000-0000-4000-8000-000000000001.pdf";
  assert.notEqual(sql(asUser(client,`insert into storage.objects(bucket_id,name) values('hr-screening','${path}')`),false).status,0);
  sql(`insert into public.user_permissions(profile_id,permission_key,granted_by) values('${client}','hr:manage','${admin}')`);
  assert.equal(saveHR(hrInput({version:1}),client).status,0);
  assert.equal(sql(asUser(client,`insert into storage.objects(bucket_id,name) values('hr-screening','${path}')`)).status,0);
});
test("HR: stale saves are rejected and uploaded documents stay private with versioned metadata",()=>{
  installHR();saveHR(hrInput());
  saveHR(hrInput({version:1,data:{firstName:"Updated",lastName:"Employee",email:"hr@example.invalid"}}));
  assert.notEqual(saveHR(hrInput({version:1}),admin,false).status,0);
  assert.equal(scalar(`select data->>'firstName' from public.hr_employee_records where id='${hrId}'`),"Updated");
  const path=hrId+"/50000000-0000-4000-8000-000000000001.pdf";
  const register=asUser(admin,`select public.register_hr_employee_document('${hrId}','${path}','evidence.pdf','Identity',2);`);
  assert.notEqual(sql(register,false).status,0);
  sql(asUser(admin,`insert into storage.objects(bucket_id,name) values('hr-screening','${path}')`));
  const doc=JSON.parse(sql(register).stdout.trim());
  assert.equal(doc.recordVersion,3);assert.equal(doc.created_by,admin);
  assert.equal(scalar("select public from storage.buckets where id='hr-screening'"),"f");
  assert.equal(scalar(asUser(client,"select count(*) from public.hr_employee_documents")),"0");
  assert.notEqual(saveHR(hrInput({version:2}),admin,false).status,0);
  sql(readFileSync(join(root,"hr-screening-patch.sql"),"utf8"));
  assert.equal(scalar("select count(*) from public.hr_employee_documents"),"1");
  assert.equal(scalar("select count(*) from auth.users"),"3");
});

before(() => {
  directory = mkdtempSync(join(tmpdir(), "ukow-reset-isolated-"));
  const initialized = run("initdb", [
    "-D", join(directory, "data"), "-U", "postgres", "--auth=trust",
    "--encoding=UTF8", "--no-locale"
  ]);
  assert.equal(initialized.status, 0, initialized.stderr);
  const started = run("pg_ctl", [
    "-D", join(directory, "data"), "-l", join(directory, "postgres.log"),
    "-o", `-k ${directory} -p 55439 -c listen_addresses='' -c fsync=off`,
    "-w", "start"
  ]);
  assert.equal(started.status, 0, started.stderr);
  running = true;
  // Prove this is our own disposable cluster before any fixture cleanup.
  assert.equal(scalar("show data_directory"), join(directory, "data"));
  sql("create role anon; create role authenticated;");
});
after(() => {
  if (running) run("pg_ctl", ["-D", join(directory, "data"), "-m", "immediate", "-w", "stop"]);
  if (directory) rmSync(directory, {recursive: true, force: true});
});
beforeEach(() => {
  assert.equal(scalar("show data_directory"), join(directory, "data"));
  const coreTables = core.slice(
    core.indexOf("create table if not exists public.profiles"),
    core.indexOf("-- Reusable authorization helpers")
  );
  const incidentTables = incidents.slice(
    incidents.indexOf("create table if not exists public.incident_reports"),
    incidents.indexOf("create or replace function public.is_active_incident_driver")
  );
  const inspectionTable = workflow.match(/create table if not exists public\.booking_inspections \([\s\S]*?\n\);/)[0];
  sql(`
    drop schema if exists unrelated cascade;
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    drop schema if exists storage cascade;
    create schema public; create schema auth; create schema storage;
    create table auth.users (
      id uuid primary key, email text unique,
      password_marker text default 'synthetic-unchanged-credential'
    );
    create table auth.sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references auth.users(id) on delete cascade
    );
    create table auth.refresh_tokens (
      user_id uuid references auth.users(id) on delete cascade
    );
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets (id text primary key);
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id), name text,
      owner_id uuid references auth.users(id)
    );
    ${coreTables}
    ${incidentTables}
    ${inspectionTable}
    create table public.app_store (
      id text primary key, data jsonb not null,
      updated_at timestamptz not null default now()
    );
    alter table public.app_store enable row level security;
    create policy original_access on public.app_store
      for all to anon, authenticated using (true) with check (true);
    alter table public.profiles enable row level security;
    create policy own_profile on public.profiles
      for select to authenticated using (id=auth.uid());
    grant usage on schema public,auth to anon,authenticated;
    grant select,insert,update,delete on public.app_store to anon,authenticated;
    grant select on public.profiles to authenticated;
    insert into auth.users(id,email) values
      ('${admin}','admin@example.invalid'),
      ('${client}','client@example.invalid'),
      ('${driver}','driver@example.invalid');
    insert into auth.sessions(user_id) select id from auth.users;
    insert into auth.refresh_tokens(user_id) select id from auth.users;
    insert into public.profiles(id,email,role,status) values
      ('${admin}','admin@example.invalid','admin','Active'),
      ('${client}','client@example.invalid','client','Active'),
      ('${driver}','driver@example.invalid','driver','Active');
    insert into public.businesses(id,legal_name,created_by)
      values ('${biz}','Synthetic business','${admin}');
    update public.profiles set business_id='${biz}',business_name='Old business',
      avatar_path='old-avatar.jpg' where id='${admin}';
    insert into public.business_memberships(business_id,profile_id)
      values ('${biz}','${client}');
    insert into public.staff_profiles(user_id) values ('${driver}');
    insert into public.driver_profiles(user_id) values ('${driver}');
    insert into public.user_permissions(profile_id,permission_key,granted_by)
      values ('${driver}','booking','${admin}');
    insert into public.role_upgrade_requests(requested_by,requested_role)
      values ('${client}','driver');
    insert into public.holiday_requests(user_id,start_date,end_date)
      values ('${driver}',current_date,current_date);
    insert into public.bookings(id,reference,business_id,created_by,driver_id,
      vehicle_registration,pickup_address,destination_address)
      values ('${booking}','OLD','${biz}','${client}','${driver}',
      'AB12CDE','Collection','Delivery');
    insert into public.booking_events(booking_id,event_type,created_by)
      values ('${booking}','created','${client}');
    insert into public.booking_evidence(booking_id,evidence_type,storage_path,captured_by)
      values ('${booking}','pickup','synthetic.jpg','${driver}');
    insert into public.booking_inspections(booking_id,condition,odometer_mileage,fuel_level,inspected_by)
      values ('${booking}','Good',10,'Half','${driver}');
    insert into public.incident_reports(id,driver_id,booking_id)
      values ('${report}','${driver}','${booking}');
    insert into public.incident_report_photos(report_id,storage_path,category,
      file_name,mime_type,file_bytes,uploaded_by)
      values ('${report}','incident.jpg','incident','incident.jpg','image/jpeg',10,'${driver}');
    insert into public.invoices(invoice_number,business_id,booking_id,created_by)
      values ('OLD-INVOICE','${biz}','${booking}','${admin}');
    insert into public.payments(invoice_id,business_id,amount,recorded_by)
      select id,'${biz}',10,'${admin}' from public.invoices;
    insert into public.notifications(recipient_id,business_id,title,message,created_by)
      values ('${admin}','${biz}','Old notification','Old text','${client}');
    insert into public.app_store(id,data) values
      ('main','{"bookings":[{"ref":"OLD"}],"staffUsers":[{"name":"Old"}],
        "payslips":[{"name":"Old"}],"invoiceSettings":{"old":"settings"},
        "messagingSettings":{"old":"settings"}}'),
      ('old-copy','{"bookings":[{"ref":"OLD-COPY"}]}');
    insert into storage.buckets(id) values
      ('booking-evidence'),('incident-evidence'),('profile-documents');
    select nextval('public.booking_reference_seq');
  `);
});

test("disabled defaults and a wrong/non-Admin email cannot erase records", () => {
  for (const source of [resetSource, configured("missing@example.invalid"), configured("client@example.invalid")]) {
    assert.notEqual(sql(source, false).status, 0);
    stillPopulated();
  }
});
test("remaining uploaded files stop the reset before any records are deleted", () => {
  sql(`insert into storage.objects(bucket_id,name,owner_id)
    values ('booking-evidence','synthetic.jpg','${driver}')`);
  const result = sql(configured(), false);
  assert.match(result.stderr, /Uploaded files remain/);
  stillPopulated();
  assert.equal(scalar("select count(*) from storage.objects"), "1");
});
test("unexpected public tables, storage buckets or outside dependencies stop the reset", () => {
  sql("create table public.unexpected(id int)");
  assert.match(sql(configured(), false).stderr, /Unexpected public tables/);
  stillPopulated();
  sql("drop table public.unexpected; insert into storage.buckets values ('other-app')");
  assert.match(sql(configured(), false).stderr, /Unexpected storage buckets/);
  stillPopulated();
  sql(`delete from storage.buckets where id='other-app';
    create schema unrelated; create table unrelated.attachment
    (booking_id uuid references public.bookings(id) on delete cascade);`);
  assert.match(sql(configured(), false).stderr, /unrelated table depends/);
  stillPopulated();
});
test("missing shared-store policies stop the reset without changing data", () => {
  sql("alter table public.app_store disable row level security");
  assert.match(sql(configured(), false).stderr, /access policies need review/);
  stillPopulated();
});
test("the entire relational reset rolls back if a later deletion fails", () => {
  sql(`create function public.synthetic_delete_failure() returns trigger
    language plpgsql as $$ begin raise exception 'Synthetic downstream failure'; end $$;
    create trigger synthetic_failure before delete on auth.users
    for each row execute function public.synthetic_delete_failure();`);
  assert.match(sql(configured(), false).stderr, /Synthetic downstream failure/);
  stillPopulated();
  assert.equal(scalar("select count(*) from public.businesses"), "1");
});
test("all portal records clear while Admin sign-in, sessions, buckets and sequence survive", () => {
  sql(configured());
  assert.equal(scalar("select id from auth.users"), admin);
  assert.equal(scalar("select password_marker from auth.users"), "synthetic-unchanged-credential");
  assert.equal(scalar("select id from public.profiles"), admin);
  assert.equal(scalar("select role||':'||status from public.profiles"), "admin:Active");
  assert.equal(scalar("select business_id is null and avatar_path is null from public.profiles"), "t");
  assert.equal(scalar("select count(*) from auth.sessions"), "1");
  assert.equal(scalar("select user_id from auth.refresh_tokens"), admin);
  for (const table of tables) assert.equal(scalar(`select count(*) from public.${table}`), "0", table);
  assert.equal(scalar("select count(*) from storage.buckets"), "3");
  assert.equal(scalar("select count(*) from storage.objects"), "0");
  assert.equal(scalar("select count(*) from public.app_store"), "1");
  const shared = JSON.parse(scalar("select data from public.app_store"));
  assert.match(shared._resetGeneration, /^[a-f0-9-]{36}$/);
  assert.equal(shared.demoDataRemoved, true);
  assert.equal(shared.invoiceSettings, undefined);
  assert.equal(shared.messagingSettings, undefined);
  for (const [key,value] of Object.entries(shared)) {
    if (!["_resetGeneration","demoDataRemoved"].includes(key)) assert.deepEqual(value, [], key);
  }
  assert.equal(scalar("select nextval('public.booking_reference_seq')"), "1001");
});
test("stale Admin snapshots cannot resurrect old data; a fresh Admin save still works", () => {
  sql(configured());
  const stale = sql(asUser(admin,
    `update public.app_store set data='{"bookings":[{"ref":"OLD"}]}' where id='main';`), false);
  assert.match(stale.stderr, /portal was reset/);
  assert.equal(scalar("select jsonb_array_length(data->'bookings') from public.app_store"), "0");
  sql(asUser(admin,
    `update public.app_store set data=jsonb_set(data,'{bookings}','[{"ref":"NEW"}]') where id='main';`));
  assert.equal(scalar("select data->'bookings'->0->>'ref' from public.app_store"), "NEW");
  assert.match(sql(asUser(admin, "delete from public.app_store where id='main';"), false).stderr,
    /cannot be deleted through the portal/);
});
test("deleted user JWTs and anonymous requests cannot access the new shared data", () => {
  sql(configured());
  for (const [id,role] of [[client,"authenticated"],["","anon"]]) {
    assert.equal(sql(asUser(id,"select count(*) from public.app_store;",role)).stdout.trim(), "0");
    sql(asUser(id,`update public.app_store set data='{}' where id='main';`,role));
  }
  assert.equal(scalar("select jsonb_array_length(data->'bookings') from public.app_store"), "0");
});
test("a newly created active Client retains the existing shared-store permissions", () => {
  sql(configured());
  sql(`insert into auth.users(id,email) values ('${newClient}','new@example.invalid');
    insert into public.profiles(id,role,status) values ('${newClient}','client','Active');`);
  assert.equal(sql(asUser(newClient,"select count(*) from public.app_store;")).stdout.trim(), "1");
  sql(asUser(newClient,
    "update public.app_store set data=jsonb_set(data,'{messageLog}','[]') where id='main';"));
});
test("repeat manual reset remains guarded, preserves Admin and advances reset generation", () => {
  sql(configured());
  const generation = scalar("select data->>'_resetGeneration' from public.app_store");
  sql(configured());
  assert.equal(scalar("select count(*) from auth.users"), "1");
  assert.notEqual(scalar("select data->>'_resetGeneration' from public.app_store"), generation);
  assert.equal(scalar("select password_marker from auth.users"), "synthetic-unchanged-credential");
});
