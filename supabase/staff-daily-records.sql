-- Daily staff money records. Requires the existing payslip-payments.sql setup.
-- Does not migrate or remove existing employees, expenses or payslips.
begin;

create table if not exists public.staff_pay_people (
 id uuid primary key,
 name text not null check (length(trim(name)) between 1 and 200),
 email text not null check (length(email) between 3 and 320),
 pay_basis text not null check (pay_basis in ('monthly','daily')),
 rate numeric(12,2) not null check (rate>=0),
 created_by uuid not null,
 updated_at timestamptz not null default now()
);
create unique index if not exists staff_pay_people_email on public.staff_pay_people(lower(email));
create table if not exists public.staff_daily_entries (
 id uuid primary key,
 staff_id uuid not null references public.staff_pay_people(id),
 entry_date date not null,
 kind text not null check (kind in ('work','overtime','expense','advance','payment')),
 amount numeric(12,2) not null check (amount>0),
 notes text not null default '' check (length(notes)<=2000),
 created_by uuid not null,
 created_at timestamptz not null default now()
);
create index if not exists staff_daily_entries_person_date on public.staff_daily_entries(staff_id,entry_date);
create table if not exists public.staff_pay_finalized (
 staff_id uuid not null references public.staff_pay_people(id),
 month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 payslip_id text not null unique,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 primary key (staff_id,month)
);
alter table public.staff_pay_people enable row level security;
alter table public.staff_daily_entries enable row level security;
alter table public.staff_pay_finalized enable row level security;
revoke all on public.staff_pay_people,public.staff_daily_entries,public.staff_pay_finalized from public,anon,authenticated;

create or replace function public.staff_daily_access(p_write boolean default false)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active' and role in ('admin','staff'))
 and (public.is_portal_admin() or public.hr_screening_access(p_write)
 or public.has_portal_permission(case when p_write then 'accounts:manage' else 'accounts:view' end)
 or (not p_write and public.has_portal_permission('accounts:manage')))
$$;

create or replace function public.read_staff_daily_records()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare source jsonb;
begin
 if not public.staff_daily_access(false) then raise exception 'Accounts or HR access required' using errcode='42501'; end if;
 select data into source from public.app_store where id='main';
 return jsonb_build_object(
 'people',coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.name)) from public.staff_pay_people p),'[]'),
 'entries',coalesce((select jsonb_agg(to_jsonb(e) order by e.entry_date desc,e.created_at desc) from public.staff_daily_entries e),'[]'),
 'finalized',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object(
   'paymentStatus',coalesce(p->>'paymentStatus','Unpaid'),'net',p->'net'))
   from public.staff_pay_finalized f left join lateral (
     select x p from jsonb_array_elements(coalesce(source->'payslips','[]')) x where x->>'id'=f.payslip_id
   ) s on true),'[]'),
 'canManage',public.staff_daily_access(true),'finances',public.read_payroll_finances());
end $$;

create or replace function public.save_staff_pay_person(p_id uuid,p_name text,p_email text,p_basis text,p_rate numeric)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.staff_daily_access(true) then raise exception 'Accounts or HR management access required' using errcode='42501'; end if;
 if p_id is null or coalesce(length(trim(p_name)),0) not between 1 and 200
 or coalesce(trim(p_email),'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or length(p_email)>320 or p_basis is null or p_basis not in ('monthly','daily')
 or p_rate is null or p_rate<0 or p_rate>9999999999.99 or p_rate<>round(p_rate,2) then
 raise exception 'Enter a name, valid email, monthly/daily pay and a valid rate'; end if;
 -- Setup is create-only: do not silently overwrite pay terms from another tab.
 if exists(select 1 from public.staff_pay_people where id=p_id and
 (name<>trim(p_name) or email<>lower(trim(p_email)) or pay_basis<>p_basis or rate<>p_rate)) then
 raise exception 'This staff record already exists with different details'; end if;
 insert into public.staff_pay_people(id,name,email,pay_basis,rate,created_by)
 values(p_id,trim(p_name),lower(trim(p_email)),p_basis,p_rate,auth.uid()) on conflict(id) do nothing;
 return public.read_staff_daily_records();
end $$;

create or replace function public.add_staff_daily_entry(
 p_id uuid,p_staff_id uuid,p_date date,p_kind text,p_amount numeric,p_notes text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare person public.staff_pay_people; existing public.staff_daily_entries; source jsonb;
begin
 if not public.staff_daily_access(true) then raise exception 'Accounts or HR management access required' using errcode='42501'; end if;
 if p_id is null or p_date is null or not isfinite(p_date) or p_date<'2000-01-01' or p_date>'2100-12-31'
 or p_kind is null or p_kind not in ('work','overtime','expense','advance','payment')
 or p_amount is null or p_amount<=0 or p_amount>9999999999.99 or p_amount<>round(p_amount,2)
 or length(coalesce(p_notes,''))>2000 then raise exception 'Enter a date, entry type and positive amount with up to two decimal places'; end if;
 -- Consistent lock order with payslip generation: store, then employee.
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select * into person from public.staff_pay_people where id=p_staff_id for update;
 if not found then raise exception 'Choose a saved staff member'; end if;
 select * into existing from public.staff_daily_entries where id=p_id;
 if found then
   if existing.staff_id<>p_staff_id or existing.entry_date<>p_date or existing.kind<>p_kind
   or existing.amount<>p_amount or existing.notes<>coalesce(p_notes,'') then
     raise exception 'This entry reference was already used with different details';
   end if;
   return public.read_staff_daily_records();
 end if;
 if exists(select 1 from public.staff_pay_finalized where staff_id=p_staff_id and month=to_char(p_date,'YYYY-MM')) then
 raise exception 'This month has a generated payslip. Record its final payment using the payslip Paid status. Daily records for this month are closed'; end if;
 if p_kind='work' and person.pay_basis<>'daily' then raise exception 'Monthly salary is counted once. Work entries are only for daily-paid staff'; end if;
 insert into public.staff_daily_entries(id,staff_id,entry_date,kind,amount,notes,created_by)
 values(p_id,p_staff_id,p_date,p_kind,p_amount,coalesce(p_notes,''),auth.uid());
 if p_kind in ('advance','payment') then
   source:=jsonb_set(source,'{expenses}',coalesce(source->'expenses','[]')||jsonb_build_array(jsonb_build_object(
    'id','STAFF-EXP-'||p_id,'source','staff-daily','staffEntryId',p_id,'date',p_date,
    'category','Salary','amount',p_amount,'method','Not recorded','payee',person.name,
    'reference',p_id,'notes',initcap(p_kind)||' recorded in Staff Daily Record. '||coalesce(p_notes,''))));
   update public.app_store set data=source,updated_at=now() where id='main';
 end if;
 return public.read_staff_daily_records();
end $$;

-- Return a secure preview using the same calculation used when saving.
create or replace function public.staff_daily_totals(p_staff_id uuid,p_month text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare person public.staff_pay_people; totals jsonb;
begin
 if not public.staff_daily_access(false) then raise exception 'Accounts or HR access required' using errcode='42501'; end if;
 if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Choose a valid month'; end if;
 select * into person from public.staff_pay_people where id=p_staff_id;
 if not found then raise exception 'Staff record not found'; end if;
 select jsonb_build_object(
 'basic',case when person.pay_basis='monthly' then person.rate else coalesce(sum(amount) filter(where kind='work'),0) end,
 'overtime',coalesce(sum(amount) filter(where kind='overtime'),0),
 'otherExpenses',coalesce(sum(amount) filter(where kind='expense'),0),
 'advance',coalesce(sum(amount) filter(where kind in ('advance','payment')),0))
 into totals from public.staff_daily_entries where staff_id=p_staff_id and to_char(entry_date,'YYYY-MM')=p_month;
 return totals;
end $$;

-- Keep the established payment/expense transaction, but prevent the manual
-- payslip endpoint from bypassing daily-record deductions and period closing.
create schema if not exists ukow_staff_private;
revoke all on schema ukow_staff_private from public,anon,authenticated;
do $$
begin
 if to_regprocedure('ukow_staff_private.create_portal_payslip(jsonb,text)') is null then
   if to_regprocedure('public.create_portal_payslip(jsonb,text)') is null then
     raise exception 'Run payslip-payments.sql before the staff daily records setup';
   end if;
   alter function public.create_portal_payslip(jsonb,text) set schema ukow_staff_private;
 end if;
end $$;
revoke all on function ukow_staff_private.create_portal_payslip(jsonb,text) from public,anon,authenticated;

create or replace function public.create_portal_payslip(p_payslip jsonb,p_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
 if exists(select 1 from public.staff_pay_people where email=lower(p_payslip->>'email')) then
   raise exception 'This employee uses Staff Daily Record. Load that record and generate its payslip to include all payments and advances';
 end if;
 return ukow_staff_private.create_portal_payslip(p_payslip,p_status);
end $$;

create or replace function public.create_staff_record_payslip(p_staff_id uuid,p_payslip jsonb,p_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare person public.staff_pay_people; source jsonb; totals jsonb; slip jsonb;
 closed public.staff_pay_finalized; field text; tax_rate numeric; taxable numeric; expenses numeric; tax numeric; net numeric;
begin
 if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select * into person from public.staff_pay_people where id=p_staff_id for update;
 if not found then raise exception 'Staff record not found'; end if;
 select * into closed from public.staff_pay_finalized where staff_id=p_staff_id and month=p_payslip->>'month';
 if found then
   if closed.payslip_id=p_payslip->>'id' then return public.read_payroll_finances(); end if;
   raise exception 'This employee already has a daily-record payslip for this month. View the existing payslip';
 end if;
 if exists(select 1 from jsonb_array_elements(coalesce(source->'payslips','[]')) p
 where p->>'id'=p_payslip->>'id'
 or (lower(p->>'email')=person.email and p->>'month'=p_payslip->>'month')) then
 raise exception 'A payslip already exists for this employee and month, or the reference is already used. View the existing payslip'; end if;
 if lower(coalesce(p_payslip->>'email',''))<>person.email then raise exception 'Selected employee does not match the daily record'; end if;
 totals:=public.staff_daily_totals(p_staff_id,p_payslip->>'month');
 foreach field in array array['basic','overtime','otherExpenses','advance'] loop
   if jsonb_typeof(p_payslip->field) is distinct from 'number'
   or (p_payslip->>field)::numeric<>(totals->>field)::numeric then
    raise exception 'Daily records changed or payslip amounts were edited. Load the daily record again';
   end if;
 end loop;
 if coalesce((p_payslip->>'rate')::numeric,0)<>0 or coalesce((p_payslip->>'fuel')::numeric,0)<>0
 or coalesce((p_payslip->>'food')::numeric,0)<>0 or coalesce((p_payslip->>'travel')::numeric,0)<>0 then
 raise exception 'Use only the loaded daily record amounts for this payslip'; end if;
 if jsonb_typeof(p_payslip->'taxEnabled') is distinct from 'boolean' then raise exception 'Choose whether tax applies'; end if;
 tax_rate:=case when (p_payslip->>'taxEnabled')::boolean then (p_payslip->>'taxPct')::numeric else 0 end;
 if tax_rate is null or tax_rate<0 or tax_rate>100 then raise exception 'Enter a valid tax rate'; end if;
 taxable:=(totals->>'basic')::numeric+(totals->>'overtime')::numeric;
 expenses:=(totals->>'otherExpenses')::numeric;
 tax:=round(taxable*tax_rate/100,2);
 net:=taxable+expenses-tax-(totals->>'advance')::numeric;
 slip:=p_payslip||totals||jsonb_build_object(
   'name',person.name,'role','Staff','ledgerStaffId',person.id,
   'rate',0,'deliveredCount',0,'vehiclePay',0,'fuel',0,'food',0,'travel',0,
   'taxPct',tax_rate,'taxablePay',taxable,'expensePayments',expenses,'gross',taxable+expenses,'taxAmount',tax,'net',net);
 perform ukow_staff_private.create_portal_payslip(slip,p_status);
 insert into public.staff_pay_finalized(staff_id,month,payslip_id,created_by)
 values(p_staff_id,slip->>'month',slip->>'id',auth.uid());
 return public.read_payroll_finances();
end $$;

-- Old shared-snapshot saves cannot remove or forge daily-record payment expenses.
create or replace function public.protect_staff_daily_expenses()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare expenses jsonb;
begin
 if current_user not in ('authenticated','anon') or new.id<>'main' then return new; end if;
 select coalesce(jsonb_agg(e),'[]') into expenses from jsonb_array_elements(coalesce(new.data->'expenses','[]')) e
 where coalesce(e->>'source','')<>'staff-daily';
 new.data:=jsonb_set(new.data,'{expenses}',expenses||coalesce((
 select jsonb_agg(e) from jsonb_array_elements(coalesce(old.data->'expenses','[]')) e where e->>'source'='staff-daily'),'[]'));
 return new;
end $$;
drop trigger if exists protect_staff_daily_expenses on public.app_store;
create trigger protect_staff_daily_expenses before update on public.app_store
for each row execute function public.protect_staff_daily_expenses();

revoke all on function public.staff_daily_access(boolean),public.read_staff_daily_records(),
 public.create_portal_payslip(jsonb,text),
 public.save_staff_pay_person(uuid,text,text,text,numeric),
 public.add_staff_daily_entry(uuid,uuid,date,text,numeric,text),public.staff_daily_totals(uuid,text),
 public.create_staff_record_payslip(uuid,jsonb,text) from public,anon;
grant execute on function public.staff_daily_access(boolean),public.read_staff_daily_records(),
 public.create_portal_payslip(jsonb,text),
 public.save_staff_pay_person(uuid,text,text,text,numeric),
 public.add_staff_daily_entry(uuid,uuid,date,text,numeric,text),public.staff_daily_totals(uuid,text),
 public.create_staff_record_payslip(uuid,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
