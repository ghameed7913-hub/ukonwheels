-- Run after staff-daily-records.sql and staff-daily-spreadsheet.sql.
-- Adds a minimal employee roster and separate bonus/fuel entries. No data reset.
begin;

alter table public.staff_pay_people alter column email drop not null;
create or replace function public.save_staff_pay_person(p_id uuid,p_name text,p_email text,p_basis text,p_rate numeric)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare person public.staff_pay_people; mail text:=nullif(lower(trim(p_email)),'');
begin
 if not public.staff_daily_access(true) then raise exception 'Accounts or HR management access required' using errcode='42501'; end if;
 if p_id is null or nullif(trim(p_name),'') is null or length(trim(p_name))>200
 or (mail is not null and mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 or p_basis is null or p_basis not in ('monthly','daily') or p_rate is null
 or p_rate<0 or p_rate>9999999999.99 or p_rate<>round(p_rate,2) then
   raise exception 'Enter a name, valid pay basis and rate; email is optional but must be valid if supplied';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into person from public.staff_pay_people where id=p_id for update;
 if found then
   if person.name<>trim(p_name) or person.email is distinct from mail
   or person.pay_basis<>p_basis or person.rate<>p_rate then
     raise exception 'Saved employee details and pay terms cannot be changed here. Use the saved staff member';
   end if;
   return public.read_staff_daily_records();
 end if;
 insert into public.staff_pay_people(id,name,email,pay_basis,rate,created_by)
 values(p_id,trim(p_name),mail,p_basis,p_rate,auth.uid());
 return public.read_staff_daily_records();
end $$;

alter table public.staff_daily_entries drop constraint if exists staff_daily_entries_kind_check;
alter table public.staff_daily_entries add constraint staff_daily_entries_kind_check
 check(kind in ('work','overtime','expense','bonus','fuel','advance','payment'));

-- Accounts needs names/contact identity only, never the private vetting record.
create or replace function public.read_staff_pay_roster()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not public.staff_daily_access(false) then
   raise exception 'Accounts or HR access required' using errcode='42501';
 end if;
 with candidates as (
   select p.id::text id,coalesce(nullif(p.full_name,''),nullif(p.name,''),p.email) name,
     lower(trim(p.email)) email,p.role,'User'::text source,1 priority
   from public.profiles p
   where p.role in ('admin','staff','driver') and lower(coalesce(p.status,''))<>'deleted'
   union all
   select coalesce(u->>'id','user-'||lower(u->>'email')),
     coalesce(nullif(u->>'name',''),concat_ws(' ',u->>'firstName',u->>'lastName')),
     lower(trim(u->>'email')),coalesce(u->>'role','Staff'),'Create User',2
   from public.app_store s cross join lateral jsonb_array_elements(coalesce(s.data->'staffUsers','[]')) u
   where s.id='main' and lower(coalesce(u->>'role',''))<>'client'
     and lower(coalesce(u->>'status',''))<>'deleted'
   union all
   select h.id::text,concat_ws(' ',h.data->>'firstName',nullif(h.data->>'middleName',''),h.data->>'lastName'),
     lower(trim(coalesce(p.email,h.data->>'email'))),coalesce(p.role,'staff'),'HR',3
   from public.hr_employee_records h
   left join public.profiles p on p.id::text=h.data->>'portalUserId'
 ), ranked as (
   select *,row_number() over(
     partition by coalesce(nullif(email,''),'id:'||id) order by priority,id
   ) n from candidates where nullif(trim(name),'') is not null
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',id,'name',name,'email',coalesce(email,''),'role',role,'source',source
 ) order by lower(name)),'[]') into result from ranked where n=1;
 return jsonb_build_object('employees',result);
end $$;

create or replace function public.add_staff_daily_entry(
 p_id uuid,p_staff_id uuid,p_date date,p_kind text,p_amount numeric,p_notes text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare person public.staff_pay_people; existing public.staff_daily_entries; source jsonb;
begin
 if not public.staff_daily_access(true) then raise exception 'Accounts or HR management access required' using errcode='42501'; end if;
 if p_id is null or p_date is null or not isfinite(p_date) or p_date<'2000-01-01' or p_date>'2100-12-31'
 or p_kind is null or p_kind not in ('work','overtime','expense','bonus','fuel','advance','payment')
 or p_amount is null or p_amount<=0 or p_amount>9999999999.99 or p_amount<>round(p_amount,2)
 or length(coalesce(p_notes,''))>2000 then raise exception 'Enter a date, entry type and positive amount with up to two decimal places'; end if;
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
   raise exception 'This month has a generated payslip. Record its final payment using the payslip Paid status. Daily records for this month are closed';
 end if;
 if p_kind='work' and person.pay_basis<>'daily' then raise exception 'Monthly salary is counted once. Work entries are only for daily-paid staff'; end if;
 insert into public.staff_daily_entries(id,staff_id,entry_date,kind,amount,notes,created_by)
 values(p_id,p_staff_id,p_date,p_kind,p_amount,coalesce(p_notes,''),auth.uid());
 if p_kind in ('advance','payment') then
   source:=jsonb_set(source,'{expenses}',coalesce(source->'expenses','[]')||jsonb_build_array(jsonb_build_object(
    'id','STAFF-EXP-'||p_id,'source','staff-daily','staffEntryId',p_id,'date',p_date,
    'category',case when exists(select 1 from public.profiles p where lower(p.email)=person.email and p.role='driver') then 'Wages' else 'Salary' end,
    'amount',p_amount,'method','Not recorded','payee',person.name,
    'reference',p_id,'notes',initcap(p_kind)||' recorded in Staff Daily Record. '||coalesce(p_notes,''))));
   update public.app_store set data=source,updated_at=now() where id='main';
 end if;
 return public.read_staff_daily_records();
end $$;

-- Preserve the tested atomic sheet transaction and its batch-hash protection.
do $$
begin
 if to_regprocedure('ukow_staff_private.save_staff_daily_sheet(jsonb,uuid)') is null then
   alter function public.save_staff_daily_sheet(jsonb,uuid) set schema ukow_staff_private;
 end if;
end $$;
revoke all on function ukow_staff_private.save_staff_daily_sheet(jsonb,uuid) from public,anon,authenticated;

create or replace function public.save_staff_daily_sheet(p_rows jsonb,p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r jsonb; k text; amount numeric; row_number integer:=0;
begin
 if not public.staff_daily_access(true) then raise exception 'Accounts or HR management access required' using errcode='42501'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Send a list of spreadsheet rows'; end if;
 if jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'Save between 1 and 100 changed rows at a time'; end if;
 -- Original function locks the store and checks every old field and retry hash.
 perform ukow_staff_private.save_staff_daily_sheet(p_rows,p_batch_id);
 for r in select value from jsonb_array_elements(p_rows) loop
   row_number:=row_number+1;
   begin
     foreach k in array array['bonus','fuel'] loop
       if r ? k and jsonb_typeof(r->k) is distinct from 'number' then raise exception 'Enter a numeric % amount',k; end if;
       amount:=coalesce((r->>k)::numeric,0);
       if amount<0 or amount>9999999999.99 or amount<>round(amount,2) then raise exception 'Enter a valid % amount with up to two decimal places',k; end if;
       if amount>0 then
         perform public.add_staff_daily_entry((r->'entry_ids'->>k)::uuid,(r->>'person_id')::uuid,
           (r->>'date')::date,k,amount,coalesce(r->>'notes',''));
       end if;
     end loop;
   exception when others then raise exception 'Row %: %',row_number,sqlerrm;
   end;
 end loop;
 return public.read_staff_daily_records();
end $$;

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
 'bonus',coalesce(sum(amount) filter(where kind='bonus'),0),
 'fuel',coalesce(sum(amount) filter(where kind='fuel'),0),
 'otherExpenses',coalesce(sum(amount) filter(where kind='expense'),0),
 'advance',coalesce(sum(amount) filter(where kind in ('advance','payment')),0))
 into totals from public.staff_daily_entries where staff_id=p_staff_id and to_char(entry_date,'YYYY-MM')=p_month;
 return totals;
end $$;

create or replace function public.create_staff_record_payslip(p_staff_id uuid,p_payslip jsonb,p_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare person public.staff_pay_people; source jsonb; totals jsonb; slip jsonb;
 closed public.staff_pay_finalized; field text; tax_rate numeric; taxable numeric; extras numeric; tax numeric; net numeric;
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
 where p->>'id'=p_payslip->>'id' or (lower(p->>'email')=person.email and p->>'month'=p_payslip->>'month')) then
   raise exception 'A payslip already exists for this employee and month, or the reference is already used. View the existing payslip';
 end if;
 if person.email is null then raise exception 'An employee email is required before generating a payslip'; end if;
 if lower(coalesce(p_payslip->>'email',''))<>person.email then raise exception 'Selected employee does not match the daily record'; end if;
 totals:=public.staff_daily_totals(p_staff_id,p_payslip->>'month');
 foreach field in array array['basic','overtime','otherExpenses','advance','bonus','fuel'] loop
   if (p_payslip ? field and jsonb_typeof(p_payslip->field) is distinct from 'number')
   or coalesce((p_payslip->>field)::numeric,0)<>(totals->>field)::numeric then
     raise exception 'Daily records changed or payslip amounts were edited. Load the daily record again';
   end if;
 end loop;
 if coalesce((p_payslip->>'rate')::numeric,0)<>0 or coalesce((p_payslip->>'food')::numeric,0)<>0
 or coalesce((p_payslip->>'travel')::numeric,0)<>0 then raise exception 'Use only the loaded daily record amounts for this payslip'; end if;
 if jsonb_typeof(p_payslip->'taxEnabled') is distinct from 'boolean' then raise exception 'Choose whether tax applies'; end if;
 tax_rate:=case when (p_payslip->>'taxEnabled')::boolean then (p_payslip->>'taxPct')::numeric else 0 end;
 if tax_rate is null or tax_rate<0 or tax_rate>100 then raise exception 'Enter a valid tax rate'; end if;
 taxable:=(totals->>'basic')::numeric+(totals->>'overtime')::numeric;
 extras:=(totals->>'otherExpenses')::numeric+(totals->>'fuel')::numeric+(totals->>'bonus')::numeric;
 tax:=round(taxable*tax_rate/100,2);
 net:=taxable+extras-tax-(totals->>'advance')::numeric;
 slip:=p_payslip||totals||jsonb_build_object(
   'name',person.name,'role',case when exists(select 1 from public.profiles p where lower(p.email)=person.email and p.role='driver') then 'Driver' else 'Staff' end,'ledgerStaffId',person.id,
   'rate',0,'deliveredCount',0,'vehiclePay',0,'food',0,'travel',0,
   'taxPct',tax_rate,'taxablePay',taxable,'expensePayments',extras,'gross',taxable+extras,'taxAmount',tax,'net',net);
 perform ukow_staff_private.create_portal_payslip(slip,p_status);
 insert into public.staff_pay_finalized(staff_id,month,payslip_id,created_by)
 values(p_staff_id,slip->>'month',slip->>'id',auth.uid());
 return public.read_payroll_finances();
end $$;

revoke all on function public.read_staff_pay_roster(),public.save_staff_daily_sheet(jsonb,uuid) from public,anon;
grant execute on function public.read_staff_pay_roster(),public.save_staff_daily_sheet(jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
