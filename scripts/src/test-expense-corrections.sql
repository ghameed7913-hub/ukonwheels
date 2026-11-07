-- Isolated local PostgreSQL fixture only; never run against a real portal.
\set ON_ERROR_STOP on
create role authenticated;
create role anon;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('test.actor',true),'')::uuid
$$;
create table public.profiles(id uuid primary key,role text,status text);
create table public.app_store(id text primary key,data jsonb,updated_at timestamptz);
create function public.is_portal_admin() returns boolean language sql stable as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin')
$$;
create function public.has_portal_permission(text) returns boolean language sql stable as $$
 select coalesce(current_setting('test.manage',true),'false')='true'
$$;
create function public.hr_screening_access(boolean) returns boolean language sql as $$select false$$;
\ir ../../supabase/bulk-expenses.sql
\ir ../../supabase/expense-types.sql
\ir ../../supabase/expense-corrections.sql
insert into public.profiles values
 ('00000000-0000-0000-0000-000000000001','admin','active'),
 ('00000000-0000-0000-0000-000000000002','staff','active'),
 ('00000000-0000-0000-0000-000000000003','driver','active');
insert into public.app_store values('main','{"expenses":[],"other":"preserve"}',now());
select set_config('test.actor','00000000-0000-0000-0000-000000000001',false);
select public.save_expense_batch('00000000-0000-0000-0000-000000000010',
 '[{"date":"2026-11-01","category":"Fuel","amount":12.50,"method":"Cash"},
   {"date":"2026-11-02","category":"Rent","amount":100,"method":"Card"}]');
do $$
declare old jsonb; r jsonb; body jsonb; rejected boolean;
begin
 select data->'expenses'->0 into old from public.app_store where id='main';
 body:=old||'{"amount":25,"notes":"corrected"}'::jsonb;
 r:=public.correct_portal_expense(old->>'id',old,'edit',body);
 assert (r->'expenses'->0->>'amount')::numeric=25;
 assert jsonb_array_length(r->'expenses')=2;
 assert (select data->>'other'='preserve' from public.app_store where id='main');
 rejected:=false;
 begin perform public.correct_portal_expense(old->>'id',old,'delete');
 exception when serialization_failure then rejected:=true; end;
 assert rejected,'Stale snapshot must be rejected';
 old:=r->'expenses'->0;
 foreach body in array array[old||'{"amount":0}'::jsonb,old||'{"amount":1.001}'::jsonb,
  old||'{"date":"2026-02-30"}'::jsonb,old||'{"method":"invalid"}'::jsonb,
  old||'{"category":"unsaved"}'::jsonb] loop
  rejected:=false;
  begin perform public.correct_portal_expense(old->>'id',old,'edit',body);
  exception when others then rejected:=true; end;
  assert rejected,'Invalid expense must be rejected';
 end loop;
 perform set_config('test.actor','00000000-0000-0000-0000-000000000002',false);
 rejected:=false;
 begin perform public.correct_portal_expense(old->>'id',old,'delete');
 exception when insufficient_privilege then rejected:=true; end;
 assert rejected,'Staff without manage permission must be denied';
 perform set_config('test.manage','true',false);
 perform public.correct_portal_expense(old->>'id',old,'delete');
 assert (select jsonb_array_length(data->'expenses')=1 from public.app_store where id='main');
 perform set_config('test.actor','00000000-0000-0000-0000-000000000003',false);
 rejected:=false;
 begin perform public.correct_portal_expense(old->>'id',old,'delete');
 exception when insufficient_privilege then rejected:=true; end;
 assert rejected,'Driver cannot manage expenses even with permission flag';
 assert (select count(*)=2 from public.expense_change_history),'Audit both successful corrections';
end $$;
-- Repeated setup must preserve data and audit history.
\ir ../../supabase/expense-corrections.sql
-- Stale authenticated whole-store writes must not resurrect deleted entries.
grant usage on schema public to authenticated;
grant select,update on public.app_store to authenticated;
set role authenticated;
update public.app_store set data='{"expenses":[{"id":"stale","source":"expense-batch","amount":9}],"other":"updated"}' where id='main';
reset role;
do $$begin
 assert (select jsonb_array_length(data->'expenses')=1 and data->'expenses'->0->>'category'='Rent' from public.app_store where id='main');
 assert (select data->>'other'='updated' from public.app_store where id='main');
end $$;
-- Even an owner-level stale retry cannot reinsert an intentionally deleted ID.
do $$declare rejected boolean:=false; begin
 begin
  update public.app_store set data=jsonb_set(data,'{expenses}',(data->'expenses')||
   '[{"id":"EXP-00000000-0000-0000-0000-000000000010-1","source":"expense-batch","amount":12.5}]'::jsonb) where id='main';
 exception when serialization_failure then rejected:=true; end;
 assert rejected,'Deleted IDs must not be recreated by a late batch retry';
end $$;
-- Payroll entries have their own correction path.
update public.app_store set data=jsonb_set(data,'{expenses}',(data->'expenses')||'[{"id":"PAY-one","source":"payslip","amount":500}]'::jsonb) where id='main';
select set_config('test.actor','00000000-0000-0000-0000-000000000001',false);
do $$declare old jsonb; rejected boolean:=false; begin
 select data->'expenses'->1 into old from public.app_store where id='main';
 begin perform public.correct_portal_expense('PAY-one',old,'delete');
 exception when invalid_parameter_value then rejected:=true; end;
 assert rejected,'Payslip expense must stay managed through payroll';
end $$;
-- A real authenticated caller can correct manual entries, but not write audit history.
set role authenticated;
do $$declare old jsonb; r jsonb; rejected boolean:=false; begin
 select data->'expenses'->0 into old from public.app_store where id='main';
 r:=public.correct_portal_expense(old->>'id',old,'edit',old||'{"amount":105}'::jsonb);
 assert (r->'expenses'->0->>'amount')::numeric=105,'Security definer RPC must work as authenticated';
 begin perform 1 from public.expense_change_history;
 exception when insufficient_privilege then rejected:=true; end;
 assert rejected,'Audit history must not be readable directly';
end $$;
reset role;
