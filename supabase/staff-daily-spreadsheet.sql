-- Spreadsheet entry uses the existing staff ledger; no records are deleted.
-- Run after staff-daily-records.sql. Do not rerun payslip-payments.sql.
begin;

create table if not exists public.staff_daily_sheet_batches (
 id uuid primary key,
 content_hash text not null,
 created_by uuid not null,
 created_at timestamptz not null default now()
);
alter table public.staff_daily_sheet_batches enable row level security;
revoke all on public.staff_daily_sheet_batches
 from public,anon,authenticated;

create or replace function public.save_staff_daily_sheet(
 p_rows jsonb,p_batch_id uuid
)
returns jsonb
language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare
 row_data jsonb;
 row_number integer:=0;
 person_id uuid;
 entry_id uuid;
 entry_date date;
 entry_kind text;
 entry_amount numeric;
 saved_store jsonb;
 saved_batch public.staff_daily_sheet_batches;
begin
 if not public.staff_daily_access(true) then
   raise exception 'Accounts or HR management access required'
     using errcode='42501';
 end if;
 if jsonb_typeof(p_rows) is distinct from 'array' then
   raise exception 'Send a list of spreadsheet rows';
 end if;
 if jsonb_array_length(p_rows) not between 1 and 100 then
   raise exception 'Save between 1 and 100 rows at a time';
 end if;
 if p_batch_id is null then
   raise exception 'Missing retry-safe spreadsheet reference';
 end if;

 -- All rows are one transaction. Use the payroll lock order throughout.
 select data into saved_store from public.app_store
 where id='main' for update;
 if saved_store is null then
   raise exception 'Saved portal data is unavailable';
 end if;
 select * into saved_batch from public.staff_daily_sheet_batches
 where id=p_batch_id;
 if found then
   if saved_batch.created_by<>auth.uid()
   or saved_batch.content_hash<>md5(p_rows::text) then
     raise exception 'This save was already completed with different values. Refresh saved records before starting a new batch';
   end if;
   return public.read_staff_daily_records();
 end if;

 for row_data in select value from jsonb_array_elements(p_rows) loop
   row_number:=row_number+1;
   begin
     if jsonb_typeof(row_data) is distinct from 'object'
     or jsonb_typeof(row_data->'rate') is distinct from 'number'
     or coalesce(row_data->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or length(coalesce(row_data->>'notes',''))>2000 then
       raise exception 'Enter a valid date, rate and notes up to 2000 characters';
     end if;
     person_id:=(row_data->>'person_id')::uuid;
     entry_date:=(row_data->>'date')::date;
     if person_id is null or not isfinite(entry_date)
     or entry_date<'2000-01-01' or entry_date>'2100-12-31' then
       raise exception 'Enter a staff reference and a date between 2000 and 2100';
     end if;

     perform public.save_staff_pay_person(
       person_id,row_data->>'name',row_data->>'email',
       row_data->>'pay_basis',(row_data->>'rate')::numeric
     );
     if exists(
       select 1 from public.staff_pay_finalized
       where staff_id=person_id and month=to_char(entry_date,'YYYY-MM')
     ) then
       raise exception 'This employee month is closed by a payslip';
     end if;

     foreach entry_kind in array array[
       'work','overtime','expense','advance','payment'
     ] loop
       if jsonb_typeof(row_data->entry_kind) is distinct from 'number' then
         raise exception 'Enter a numeric % amount (zero if unused)',entry_kind;
       end if;
       entry_amount:=(row_data->>entry_kind)::numeric;
       if entry_amount<0 or entry_amount>9999999999.99
       or entry_amount<>round(entry_amount,2) then
         raise exception '% must be zero or positive, with up to two decimal places',entry_kind;
       end if;
       if entry_kind='work' and entry_amount>0
       and row_data->>'pay_basis'='monthly' then
         raise exception 'Monthly salary is counted once; leave daily work at zero';
       end if;
       if entry_amount>0 then
         entry_id:=(row_data->'entry_ids'->>entry_kind)::uuid;
         if entry_id is null then
           raise exception 'Missing retry-safe reference for %',entry_kind;
         end if;
         perform public.add_staff_daily_entry(
           entry_id,person_id,entry_date,entry_kind,entry_amount,
           coalesce(row_data->>'notes','')
         );
       end if;
     end loop;
   exception when others then
     raise exception 'Row %: %',row_number,sqlerrm;
   end;
 end loop;

 insert into public.staff_daily_sheet_batches(id,content_hash,created_by)
 values(p_batch_id,md5(p_rows::text),auth.uid());
 return public.read_staff_daily_records();
end $$;

revoke all on function public.save_staff_daily_sheet(jsonb,uuid)
 from public,anon;
grant execute on function public.save_staff_daily_sheet(jsonb,uuid)
 to authenticated;

notify pgrst,'reload schema';
commit;
