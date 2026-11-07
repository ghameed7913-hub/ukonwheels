\set ON_ERROR_STOP on
-- Isolated database only. Do not run this fixture in the user's Supabase project.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table public.profiles(id uuid primary key,role text,status text);
create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
create function public.is_portal_admin() returns boolean language sql stable as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
create function public.has_portal_permission(text) returns boolean language sql stable as $$select current_setting('test.accounts',true)='yes'$$;
insert into public.profiles values('11111111-1111-1111-1111-111111111111','admin','active'),('22222222-2222-2222-2222-222222222222','client','active');
select set_config('test.uid','11111111-1111-1111-1111-111111111111',false);
\ir ../invoice-amendments.sql
insert into public.app_store values('main','{"invoices":[{"invoiceNo":"INV-TEST","business":"Movex","date":"2026-11-01","dueDate":"","status":"Unpaid","items":[{"ref":"JOB","charge":100,"vehicle":"Ford"}],"vatEnabled":true,"vatPct":20,"vatAmount":20,"subtotal":100,"total":120,"extraPhrasal":0,"otherCharges":0,"companyDetails":{"bankAccountNumber":"original"}}],"transactions":[{"amount":123}],"bookings":[{"ref":"JOB","amount":100}]}',now());
create function pg_temp.changes() returns jsonb language sql as $$select '{"date":"2026-11-02","dueDate":"2026-12-02","charges":[110.10],"vatEnabled":false,"vatPct":0,"extraPhrasal":5,"otherCharges":0,"otherDescription":"Corrected","reason":"Wrong charge","billTo":{"name":"Movex","address":"Correct address","postcode":"","email":"","phone":"","vatNumber":"","companyReg":""}}'::jsonb$$;
do $$
declare original jsonb; revised jsonb; current_invoice jsonb; bad jsonb; rejected boolean;
begin
 select data->'invoices'->0 into original from public.app_store where id='main';
 revised:=public.amend_portal_invoice('INV-TEST',original,pg_temp.changes());
 if (revised->>'total')::numeric<>115.10 or revised->>'invoiceNo'<>'INV-TEST' or revised->>'amendmentRevision'<>'1'
  or revised->'companyDetails' is distinct from original->'companyDetails' then raise exception 'Incorrect amendment'; end if;
 if (select count(*) from public.invoice_amendment_history)<>1 then raise exception 'Missing history'; end if;
 if (select data->'bookings'->0->>'amount' from public.app_store)<>'100' then raise exception 'Booking revenue was changed'; end if;
 if (select data->'transactions'->0->>'amount' from public.app_store)<>'123' then raise exception 'Transactions changed'; end if;
 rejected:=false;
 begin perform public.amend_portal_invoice('INV-TEST',original,pg_temp.changes()); exception when sqlstate '40001' then rejected:=true; end;
 if not rejected then raise exception 'Stale edit accepted'; end if;
 perform set_config('test.uid','22222222-2222-2222-2222-222222222222',false);
 rejected:=false;
 begin perform public.amend_portal_invoice('INV-TEST',revised,pg_temp.changes()); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Client edit accepted'; end if;
 perform set_config('test.uid','11111111-1111-1111-1111-111111111111',false);
 foreach bad in array array[
  jsonb_set(pg_temp.changes(),'{charges}','[-1]'),jsonb_set(pg_temp.changes(),'{charges}','[0.001]'),
  jsonb_set(pg_temp.changes(),'{charges}','[]'),jsonb_set(pg_temp.changes(),'{vatPct}','101')||'{"vatEnabled":true}',
  jsonb_set(pg_temp.changes(),'{reason}','""'),jsonb_set(pg_temp.changes(),'{dueDate}','"2020-01-01"')
 ] loop
  rejected:=false;
  begin perform public.amend_portal_invoice('INV-TEST',revised,bad); exception when others then rejected:=true; end;
  if not rejected then raise exception 'Invalid changes accepted: %',bad; end if;
 end loop;
 -- A paid invoice keeps payment records and permits only non-financial corrections.
 revised:=revised||'{"status":"Paid","paidAmount":115.10,"paymentReference":"BANK"}';
 update public.app_store set data=jsonb_set(data,'{invoices,0}',revised) where id='main';
 rejected:=false;
 begin perform public.amend_portal_invoice('INV-TEST',revised,jsonb_set(pg_temp.changes(),'{charges}','[200]'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Paid financial edit accepted'; end if;
 current_invoice:=public.amend_portal_invoice('INV-TEST',revised,jsonb_set(pg_temp.changes(),'{billTo,address}','"Corrected again"'));
 if current_invoice->>'status'<>'Paid' or current_invoice->>'paymentReference'<>'BANK'
  or (current_invoice->>'paidAmount')::numeric<>115.10 then raise exception 'Payment metadata changed'; end if;
end $$;
grant usage on schema public to authenticated;
grant select,update on public.app_store to authenticated;
-- An older whole-store save must not revert the amended total or billing details.
set role authenticated;
update public.app_store set data=jsonb_set(data,'{invoices,0,total}','999') where id='main';
reset role;
do $$begin
 if (select data->'invoices'->0->>'total' from public.app_store)::numeric<>115.10 then raise exception 'Snapshot reverted invoice'; end if;
 if (select count(*) from public.invoice_amendment_history)<>2 then raise exception 'Unexpected audit history'; end if;
end $$;
select 'Invoice amendment SQL checks passed' as result;
