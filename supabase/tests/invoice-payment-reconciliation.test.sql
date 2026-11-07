\set ON_ERROR_STOP on
-- Isolated database fixture only; never run this test in production.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create table public.profiles(id uuid primary key,role text,status text);
create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
create table public.bookings(id uuid primary key default gen_random_uuid(),reference text,payment_status text,updated_at timestamptz);
create function public.is_portal_admin() returns boolean language sql stable as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
create function public.has_portal_permission(text) returns boolean language sql stable as $$select false$$;
insert into public.profiles values('11111111-1111-1111-1111-111111111111','admin','active'),('22222222-2222-2222-2222-222222222222','client','active');
select set_config('test.uid','11111111-1111-1111-1111-111111111111',false);
\ir ../invoice-amendments.sql
\ir ../invoice-payment-reconciliation.sql
insert into public.bookings(reference,payment_status) values('JOB','Paid');
insert into public.app_store values('main','{"invoices":[{"invoiceNo":"INV-TEST","business":"Movex","date":"2026-11-01","status":"Paid","paidAmount":120,"paymentMethod":"Bank Transfer","paymentReference":"OLD","paymentDate":"2026-11-01","total":120,"vatEnabled":true,"vatPct":20,"subtotal":100,"extraPhrasal":0,"otherCharges":0,"items":[{"ref":"JOB","charge":100}]}],"bookings":[{"ref":"JOB","invoiceNo":"INV-TEST","amount":100,"paymentStatus":"Paid"}],"transactions":[{"bookingRef":"INV-TEST","method":"Bank Transfer","amount":120,"status":"Cleared","type":"Invoice Payment"},{"bookingRef":"INV-TEST","method":"Bank Transfer","amount":120,"status":"Cleared","type":"Invoice Payment"},{"bookingRef":"MANUAL","method":"Cash","amount":10,"status":"Cleared"}]}',now());
do $$
declare original jsonb; result jsonb; reopened jsonb; amended jsonb; paid jsonb; rejected boolean;
begin
 select data->'invoices'->0 into original from public.app_store;
 result:=public.change_portal_invoice_payment('INV-TEST',original,'reopen');
 reopened:=result->'invoice';
 if reopened->>'status'<>'Unpaid' or (reopened->>'paidAmount')::numeric<>0 then raise exception 'Reopen failed'; end if;
 if (select payment_status from public.bookings where reference='JOB')<>'Pending' then raise exception 'Normalised booking not reopened'; end if;
 if (select data->'bookings'->0->>'paymentStatus' from public.app_store)<>'Pending' then raise exception 'Snapshot booking not reopened'; end if;
 if (select count(*) from jsonb_array_elements(result->'transactions') t where t->>'bookingRef'='INV-TEST' and t->>'status'<>'Reversed')<>0 then raise exception 'Old bank receipt still active'; end if;
 if (select count(*) from jsonb_array_elements(result->'transactions') t where t->>'bookingRef'='MANUAL')<>1 then raise exception 'Manual receipt lost'; end if;
 amended:=public.amend_portal_invoice('INV-TEST',reopened,
 '{"date":"2026-11-02","dueDate":"","charges":[80],"vatEnabled":false,"vatPct":0,"extraPhrasal":5,"otherCharges":0,"otherDescription":"Corrected","reason":"Correct price","billTo":{"name":"Movex","address":"","postcode":"","email":"","phone":"","vatNumber":"","companyReg":""}}');
 if (amended->>'total')::numeric<>85 then raise exception 'Amendment wrong'; end if;
 rejected:=false;
 begin perform public.change_portal_invoice_payment('INV-TEST',reopened,'settle','{"amount":120,"date":"2026-11-07","method":"Cash"}'); exception when sqlstate '40001' then rejected:=true; end;
 if not rejected then raise exception 'Stale payment accepted'; end if;
 rejected:=false;
 begin perform public.change_portal_invoice_payment('INV-TEST',amended,'settle','{"amount":120,"date":"2026-11-07","method":"Cash"}'); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Excess amount accepted'; end if;
 result:=public.change_portal_invoice_payment('INV-TEST',amended,'settle','{"amount":85,"date":"2026-11-07","method":"Cash"}');
 paid:=result->'invoice';
 if paid->>'status'<>'Paid' or paid->>'paymentMethod'<>'Cash' or (paid->>'paidAmount')::numeric<>85 then raise exception 'Repayment wrong'; end if;
 if (select sum((t->>'amount')::numeric) from jsonb_array_elements(result->'transactions') t where t->>'bookingRef'='INV-TEST' and t->>'status'='Cleared')<>85 then raise exception 'Wrong active receipt total'; end if;
 if (select payment_status from public.bookings where reference='JOB')<>'Paid' then raise exception 'Booking not paid'; end if;
 result:=public.change_portal_invoice_payment('INV-TEST',paid,'settle','{"amount":85,"date":"2026-11-07","method":"Cash"}');
 if (select count(*) from jsonb_array_elements(result->'transactions') t where t->>'bookingRef'='INV-TEST' and t->>'status'='Cleared')<>1 then raise exception 'Retry duplicated receipt'; end if;
 result:=public.change_portal_invoice_payment('INV-TEST',paid,'reopen');
 paid:=public.settle_portal_invoice('INV-TEST',85,'2026-11-08','Bank Transfer','NEW');
 if paid->>'paymentMethod'<>'Bank Transfer' then raise exception 'Legacy endpoint failed'; end if;
 perform set_config('test.uid','22222222-2222-2222-2222-222222222222',false);
 rejected:=false;
 begin perform public.change_portal_invoice_payment('INV-TEST',paid,'reopen'); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Client reopened invoice'; end if;
 perform set_config('test.uid','11111111-1111-1111-1111-111111111111',false);
 if (select data->'bookings'->0->>'amount' from public.app_store)<>'100' then raise exception 'Earned revenue changed'; end if;
end $$;
grant usage on schema public to authenticated;
grant select,update on public.app_store to authenticated;
set role authenticated;
-- Simulate an old browser trying to restore a previous invoice and transaction snapshot.
update public.app_store set data=jsonb_set(jsonb_set(jsonb_set(data,'{invoices,0,status}','"Unpaid"'),
 '{invoices,0,paidAmount}','999'),'{transactions}','[{"bookingRef":"INV-TEST","method":"Cash","amount":999,"status":"Cleared","type":"Invoice Payment"},{"bookingRef":"MANUAL","method":"Cash","amount":10,"status":"Cleared"}]');
reset role;
do $$begin
 if (select data->'invoices'->0->>'status' from public.app_store)<>'Paid' then raise exception 'Stale save reset status'; end if;
 if (select data->'invoices'->0->>'paidAmount' from public.app_store)::numeric<>85 then raise exception 'Stale save reset payment'; end if;
 if (select sum((t->>'amount')::numeric) from public.app_store s,lateral jsonb_array_elements(s.data->'transactions') t where t->>'bookingRef'='INV-TEST' and t->>'status'='Cleared')<>85 then raise exception 'Stale receipt counted'; end if;
 if (select count(*) from public.invoice_payment_history)<>4 then raise exception 'Missing payment history'; end if;
 if exists(select 1 from public.app_store s,lateral jsonb_array_elements(s.data->'transactions') t
   where t->>'bookingRef'='INV-TEST' and (t->>'amount')::numeric=120
   and t->>'reversalReason'<>'reopen') then raise exception 'Original reversal history was overwritten'; end if;
end $$;
select 'Invoice receipt reconciliation checks passed' as result;
