-- Atomic, retry-safe manual expense batches. No existing records are deleted.
begin;

create or replace function public.save_expense_batch(p_batch_id uuid,p_expenses jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare source jsonb; entries jsonb:='[]'; row jsonb; item jsonb; existing jsonb;
  fingerprint text; existing_count integer; n integer:=0; amount numeric; total numeric:=0;
  expense_date date; canonical jsonb:='[]'; field text;
begin
  if not exists(select 1 from public.profiles where id=auth.uid()
    and lower(status)='active' and role in ('admin','staff'))
    or not (public.is_portal_admin() or public.has_portal_permission('accounts:manage')) then
    raise exception 'Accounts management access required' using errcode='42501';
  end if;
  if p_batch_id is null or jsonb_typeof(p_expenses) is distinct from 'array' then
    raise exception 'An expense batch and its rows are required' using errcode='22023';
  end if;
  if jsonb_array_length(p_expenses) not between 1 and 200 then
    raise exception 'Enter between 1 and 200 expenses' using errcode='22023';
  end if;
  for row in select value from jsonb_array_elements(p_expenses) loop
    n:=n+1;
    if jsonb_typeof(row) is distinct from 'object'
      or jsonb_typeof(row->'amount') is distinct from 'number' then
      raise exception 'Row %: a valid amount is required',n using errcode='22023';
    end if;
    amount:=(row->>'amount')::numeric;
    if amount<=0 or amount>90071992547409.91 or amount<>round(amount,2) then
      raise exception 'Row %: enter a positive amount with no more than two decimal places',n using errcode='22023';
    end if;
    total:=total+amount;
    if total>90071992547409.91 then raise exception 'Batch total is too large' using errcode='22023'; end if;
    if coalesce(row->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Row %: enter a valid expense date',n using errcode='22023';
    end if;
    begin expense_date:=(row->>'date')::date;
    exception when others then raise exception 'Row %: enter a valid expense date',n using errcode='22023'; end;
    if to_char(expense_date,'YYYY-MM-DD')<>row->>'date' then
      raise exception 'Row %: enter a valid expense date',n using errcode='22023';
    end if;
    if coalesce(row->>'category','') not in ('Wages','Salary','Fuel','Rent','Office','Entertainment',
      'Utility Bills','Rider Fuel','Staff Fuel','Hotel Expense','Vehicle Recovery Expenses','Insurance','Other Expenses')
      or coalesce(row->>'method','') not in ('Cash','Bank Transfer','Card') then
      raise exception 'Row %: choose a valid expense type and payment method',n using errcode='22023';
    end if;
    foreach field in array array['payee','reference','notes'] loop
      if row ? field and jsonb_typeof(row->field) not in ('string','null') then
        raise exception 'Row %: % must be text',n,field using errcode='22023';
      end if;
    end loop;
    if length(coalesce(row->>'payee',''))>500 or length(coalesce(row->>'reference',''))>120
      or length(coalesce(row->>'notes',''))>2000 then
      raise exception 'Row %: supplier, reference or notes are too long',n using errcode='22023';
    end if;
    canonical:=canonical||jsonb_build_array(jsonb_build_object('date',expense_date,
      'category',row->>'category','amount',amount,'method',row->>'method',
      'payee',trim(coalesce(row->>'payee','')),'reference',trim(coalesce(row->>'reference','')),
      'notes',trim(coalesce(row->>'notes',''))));
  end loop;
  fingerprint:=encode(sha256(convert_to(canonical::text,'UTF8')),'hex');
  select data into source from public.app_store where id='main' for update;
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  select e into existing from jsonb_array_elements(coalesce(source->'expenses','[]')) e
    where e->>'source'='expense-batch' and e->>'batchId'=p_batch_id::text limit 1;
  if existing is not null then
    select count(*) into existing_count from jsonb_array_elements(source->'expenses') e
      where e->>'source'='expense-batch' and e->>'batchId'=p_batch_id::text;
    if existing->>'createdBy' is distinct from auth.uid()::text then
      raise exception 'This batch belongs to another account' using errcode='42501';
    end if;
    if existing->>'batchFingerprint' is distinct from fingerprint or existing_count<>n then
      raise exception 'This batch has already been saved with different rows. Reload the register before making another batch' using errcode='22023';
    end if;
    return jsonb_build_object('batch_id',p_batch_id,'saved_count',n,'expenses',source->'expenses');
  end if;
  n:=0;
  for item in select value from jsonb_array_elements(canonical) loop
    n:=n+1;
    entries:=entries||jsonb_build_array(item||jsonb_build_object(
      'id','EXP-'||p_batch_id::text||'-'||n,'source','expense-batch','batchId',p_batch_id,
      'batchFingerprint',fingerprint,'createdBy',auth.uid(),'createdAt',now()));
  end loop;
  source:=jsonb_set(source,'{expenses}',coalesce(source->'expenses','[]')||entries);
  update public.app_store set data=source,updated_at=now() where id='main';
  return jsonb_build_object('batch_id',p_batch_id,'saved_count',n,'expenses',source->'expenses');
end $$;

-- Older whole-portal saves must not erase or rewrite a committed expense batch.
-- This composes with the existing payslip-protection trigger.
create or replace function public.protect_expense_batch_snapshot()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare entries jsonb;
begin
  if current_user not in ('authenticated','anon') or new.id<>'main' then return new; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(new.data->'expenses','[]')) e
    where e->>'source'='expense-batch' and not exists(
      select 1 from jsonb_array_elements(coalesce(old.data->'expenses','[]')) o
      where o->>'source'='expense-batch' and o->>'id'=e->>'id')) then
    raise exception 'Use Bulk Expense to save new expense batches';
  end if;
  select coalesce(jsonb_agg(e),'[]') into entries
    from jsonb_array_elements(coalesce(new.data->'expenses','[]')) e
    where coalesce(e->>'source','')<>'expense-batch';
  new.data:=jsonb_set(new.data,'{expenses}',entries||coalesce((
    select jsonb_agg(e) from jsonb_array_elements(coalesce(old.data->'expenses','[]')) e
    where e->>'source'='expense-batch'),'[]'));
  return new;
end $$;
drop trigger if exists protect_expense_batch_snapshot on public.app_store;
create trigger protect_expense_batch_snapshot before update on public.app_store
for each row execute function public.protect_expense_batch_snapshot();

create or replace function public.read_payroll_finances()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare source jsonb; hr boolean:=public.hr_screening_access(false);
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active'
    and role in ('admin','staff')) or not (hr or public.is_portal_admin()
    or public.has_portal_permission('accounts:view') or public.has_portal_permission('accounts:manage')) then
    raise exception 'HR or Accounts access required' using errcode='42501';
  end if;
  select data into source from public.app_store where id='main';
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  return jsonb_build_object('payslips',case when hr then coalesce(source->'payslips','[]') end,
    'expenses',coalesce(source->'expenses','[]'),'canManage',public.hr_screening_access(true),
    'canManageExpenses',public.is_portal_admin() or public.has_portal_permission('accounts:manage'));
end $$;

revoke all on function public.save_expense_batch(uuid,jsonb) from public,anon;
grant execute on function public.save_expense_batch(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
