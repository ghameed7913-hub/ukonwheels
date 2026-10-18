-- Atomic payslip payment status + linked expense. No historical data is deleted.
begin;

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
    'expenses',coalesce(source->'expenses','[]'),'canManage',public.hr_screening_access(true));
end $$;

create or replace function public.apply_payslip_payment(
  source jsonb,p_id text,p_status text,p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare slip jsonb; updated_slip jsonb; expense jsonb; expenses jsonb; amount numeric;
  category text; version integer; paid_date date:=(now() at time zone 'Europe/London')::date;
begin
  if p_status is null or p_status not in ('Paid','Unpaid') then raise exception 'Choose Paid or Unpaid'; end if;
  if (select count(*) from jsonb_array_elements(coalesce(source->'payslips','[]')) x where x->>'id'=p_id)<>1 then
    raise exception 'Payslip not found or reference is duplicated';
  end if;
  select x into slip from jsonb_array_elements(source->'payslips') x where x->>'id'=p_id;
  version:=coalesce((slip->>'paymentVersion')::integer,0);
  -- A lost-response retry is a no-op, not a second expense or payment.
  if coalesce(slip->>'paymentStatus','Unpaid')=p_status then return source; end if;
  if p_expected_version is distinct from version then
    raise exception 'This payslip changed. Refresh before changing its payment status';
  end if;
  select coalesce(jsonb_agg(e),'[]') into expenses
    from jsonb_array_elements(coalesce(source->'expenses','[]')) e
    where e->>'source' is distinct from 'payslip' or e->>'payslipId' is distinct from p_id;
  updated_slip:=(slip-'paidAt'-'paidBy'-'paidOn'-'expenseId')||
    jsonb_build_object('paymentStatus',p_status,'paymentVersion',version+1);
  if p_status='Paid' then
    if jsonb_typeof(slip->'net') is distinct from 'number' then raise exception 'Payslip net pay is invalid'; end if;
    amount:=(slip->>'net')::numeric;
    if amount<0 or amount>90071992547409.91 or amount<>round(amount,2) then
      raise exception 'A payslip with a negative balance or invalid net pay cannot be marked Paid';
    end if;
    if nullif(trim(slip->>'role'),'') is null or lower(trim(slip->>'role'))='client' then
      raise exception 'The payslip needs a valid employee role before recording payment';
    end if;
    category:=case when lower(trim(slip->>'role'))='driver' then 'Wages' else 'Salary' end;
    expense:=jsonb_build_object('id','PAY-EXP-'||p_id,'source','payslip','payslipId',p_id,
      'date',paid_date,'category',category,'amount',amount,'method','Not recorded',
      'reference',p_id,'payee',slip->>'name',
      'notes','Paid payslip for '||coalesce(slip->>'month','')||' (net after tax and advances)');
    expenses:=expenses||jsonb_build_array(expense);
    updated_slip:=updated_slip||jsonb_build_object('paidAt',now(),'paidBy',auth.uid(),
      'paidOn',paid_date,'expenseId','PAY-EXP-'||p_id);
  end if;
  source:=jsonb_set(source,'{payslips}',(select jsonb_agg(
    case when p->>'id'=p_id then updated_slip else p end order by n)
    from jsonb_array_elements(source->'payslips') with ordinality x(p,n)));
  return jsonb_set(source,'{expenses}',expenses);
end $$;
revoke all on function public.apply_payslip_payment(jsonb,text,text,integer) from public,anon,authenticated;

create or replace function public.create_portal_payslip(p_payslip jsonb,p_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare source jsonb; slip jsonb; key text; value numeric;
begin
  if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
  if nullif(p_payslip->>'id','') is null or length(p_payslip->>'id')>150
    or nullif(trim(p_payslip->>'name'),'') is null or nullif(trim(p_payslip->>'email'),'') is null
    or coalesce(p_payslip->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or jsonb_typeof(p_payslip->'net') is distinct from 'number'
    or abs((p_payslip->>'net')::numeric)>90071992547409.91 then raise exception 'Invalid payslip details'; end if;
  if p_status is null or p_status not in ('Paid','Unpaid') then raise exception 'Choose Paid or Unpaid'; end if;
  foreach key in array array['deliveredCount','rate','basic','overtime','fuel','food','travel',
    'advance','vehiclePay','taxablePay','expensePayments','gross','taxPct','taxAmount']
  loop
    if p_payslip ? key then
      if jsonb_typeof(p_payslip->key) is distinct from 'number' then raise exception 'Invalid numeric payslip field: %',key; end if;
      value:=(p_payslip->>key)::numeric;
      if value<0 or value>90071992547409.91
        or (key='deliveredCount' and value<>trunc(value))
        or (key='taxPct' and value>100) then raise exception 'Invalid payslip amount: %',key; end if;
    end if;
  end loop;
  select data into source from public.app_store where id='main' for update;
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(source->'payslips','[]')) p where p->>'id'=p_payslip->>'id') then
    return public.read_payroll_finances();
  end if;
  slip:=(p_payslip-'paidAt'-'paidBy'-'paidOn'-'expenseId')||
    jsonb_build_object('paymentStatus','Unpaid','paymentVersion',0,'createdAt',now());
  source:=jsonb_set(source,'{payslips}',coalesce(source->'payslips','[]')||jsonb_build_array(slip));
  source:=public.apply_payslip_payment(source,slip->>'id',p_status,0);
  update public.app_store set data=source,updated_at=now() where id='main';
  return public.read_payroll_finances();
end $$;

create or replace function public.set_payslip_payment_status(
  p_id text,p_status text,p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare source jsonb;
begin
  if not public.hr_screening_access(true) then raise exception 'HR management access required' using errcode='42501'; end if;
  select data into source from public.app_store where id='main' for update;
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  source:=public.apply_payslip_payment(source,p_id,p_status,p_expected_version);
  update public.app_store set data=source,updated_at=now() where id='main';
  return public.read_payroll_finances();
end $$;

-- Preserve authoritative payroll when an older tab saves a whole shared snapshot.
-- Definer RPCs run as their owner; ordinary authenticated REST writes do not.
create or replace function public.protect_payroll_snapshot()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare expenses jsonb;
begin
  if current_user not in ('authenticated','anon') or new.id<>'main' then return new; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(new.data->'payslips','[]')) p
    where not exists(select 1 from jsonb_array_elements(coalesce(old.data->'payslips','[]')) o where o->>'id'=p->>'id')) then
    raise exception 'Reload the portal and use the updated payslip form to save payslips';
  end if;
  new.data:=jsonb_set(new.data,'{payslips}',coalesce(old.data->'payslips','[]'));
  select coalesce(jsonb_agg(e),'[]') into expenses
    from jsonb_array_elements(coalesce(new.data->'expenses','[]')) e where coalesce(e->>'source','')<>'payslip';
  new.data:=jsonb_set(new.data,'{expenses}',expenses||coalesce((
    select jsonb_agg(e) from jsonb_array_elements(coalesce(old.data->'expenses','[]')) e where e->>'source'='payslip'),'[]'));
  return new;
end $$;
drop trigger if exists protect_payroll_snapshot on public.app_store;
create trigger protect_payroll_snapshot before update on public.app_store
for each row execute function public.protect_payroll_snapshot();

revoke all on function public.read_payroll_finances(),public.create_portal_payslip(jsonb,text),
  public.set_payslip_payment_status(text,text,integer) from public,anon;
grant execute on function public.read_payroll_finances(),public.create_portal_payslip(jsonb,text),
  public.set_payslip_payment_status(text,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
