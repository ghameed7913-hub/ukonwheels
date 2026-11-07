-- Run after bulk-expenses.sql and expense-types.sql. No existing expenses deleted.
begin;
create table if not exists public.expense_change_history(
 id uuid primary key default gen_random_uuid(),
 actor uuid not null,
 expense_id text not null,
 action text not null check(action in ('edit','delete')),
 before_value jsonb not null,
 after_value jsonb,
 changed_at timestamptz not null default now()
);
alter table public.expense_change_history enable row level security;
revoke all on public.expense_change_history from public,anon,authenticated;
create index if not exists expense_deleted_history on public.expense_change_history(expense_id) where action='delete';

create or replace function public.correct_portal_expense(
 p_id text,p_expected jsonb,p_action text,p_values jsonb default null
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare source jsonb; original jsonb; replacement jsonb; entries jsonb;
 expense_date date; amount numeric; field text; matches integer;
begin
 if not exists(select 1 from public.profiles where id=auth.uid()
   and lower(status)='active' and role in ('admin','staff'))
   or not (public.is_portal_admin() or public.has_portal_permission('accounts:manage')) then
  raise exception 'Accounts management access required' using errcode='42501';
 end if;
 if p_id is null or p_action is null or p_action not in ('edit','delete') then
  raise exception 'Choose an expense and edit or delete action' using errcode='22023';
 end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select count(*) into matches from jsonb_array_elements(coalesce(source->'expenses','[]')) e where e->>'id'=p_id;
 if matches<>1 then raise exception 'Expense missing or ambiguous. Refresh the register before continuing.' using errcode='40001'; end if;
 select e into original from jsonb_array_elements(source->'expenses') e where e->>'id'=p_id;
 if original is distinct from p_expected then
  raise exception 'This expense has changed. Refresh the register before continuing.' using errcode='40001';
 end if;
 if original->>'source'='payslip' or nullif(original->>'payslipId','') is not null then
  raise exception 'Correct this linked expense through its payslip to keep payroll consistent' using errcode='22023';
 end if;
 if p_action='edit' then
  if jsonb_typeof(p_values) is distinct from 'object'
    or jsonb_typeof(p_values->'amount') is distinct from 'number' then
   raise exception 'Enter valid expense fields' using errcode='22023';
  end if;
  amount:=(p_values->>'amount')::numeric;
  if amount<=0 or amount>90071992547409.91 or amount<>round(amount,2) then
   raise exception 'Enter a positive amount with up to two decimal places' using errcode='22023';
  end if;
  if coalesce(p_values->>'date','') !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$' then
   raise exception 'Enter a valid expense date' using errcode='22023';
  end if;
  expense_date:=(p_values->>'date')::date;
  if to_char(expense_date,'YYYY-MM-DD')<>p_values->>'date' then raise exception 'Enter a valid expense date'; end if;
  if coalesce(p_values->>'category','') not in ('Wages','Salary','Fuel','Rent','Office','Entertainment',
    'Utility Bills','Rider Fuel','Staff Fuel','Hotel Expense','Vehicle Recovery Expenses','Insurance','Other Expenses')
    and not exists(select 1 from public.expense_types where name=p_values->>'category')
    and p_values->>'category' is distinct from original->>'category' then
   raise exception 'Choose a saved expense type' using errcode='22023';
  end if;
  if coalesce(p_values->>'method','') not in ('Cash','Bank Transfer','Card') then
   raise exception 'Choose a payment method' using errcode='22023';
  end if;
  foreach field in array array['payee','reference','notes'] loop
   if p_values ? field and jsonb_typeof(p_values->field) not in ('string','null') then
    raise exception 'Supplier, reference and notes must be text' using errcode='22023';
   end if;
  end loop;
  if length(coalesce(p_values->>'payee',''))>500 or length(coalesce(p_values->>'reference',''))>120
    or length(coalesce(p_values->>'notes',''))>2000 then
   raise exception 'Supplier, reference or notes are too long' using errcode='22023';
  end if;
  replacement:=original||jsonb_build_object('date',expense_date,'category',p_values->>'category',
   'amount',amount,'method',p_values->>'method','payee',trim(coalesce(p_values->>'payee','')),
   'reference',trim(coalesce(p_values->>'reference','')),'notes',trim(coalesce(p_values->>'notes','')),
   'updatedBy',auth.uid(),'updatedAt',now());
 end if;
 select coalesce(jsonb_agg(case when e->>'id'=p_id then replacement else e end order by ord),'[]'::jsonb)
 into entries from jsonb_array_elements(source->'expenses') with ordinality a(e,ord)
 where p_action<>'delete' or e->>'id' is distinct from p_id;
 update public.app_store set data=jsonb_set(source,'{expenses}',entries),updated_at=now() where id='main';
 insert into public.expense_change_history(actor,expense_id,action,before_value,after_value)
 values(auth.uid(),p_id,p_action,original,replacement);
 return jsonb_build_object('expense_id',p_id,'action',p_action,'expenses',entries);
end $$;
revoke all on function public.correct_portal_expense(text,jsonb,text,jsonb) from public,anon;
grant execute on function public.correct_portal_expense(text,jsonb,text,jsonb) to authenticated;

-- Expenses now have dedicated authorised RPCs. A stale whole-portal save must
-- never undo a correction or resurrect a deleted expense.
create or replace function public.preserve_authoritative_expenses()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if current_user in ('authenticated','anon') and new.id='main' then
  new.data:=jsonb_set(new.data,'{expenses}',coalesce(old.data->'expenses','[]'::jsonb));
 end if;
 return new;
end $$;
drop trigger if exists aa_preserve_authoritative_expenses on public.app_store;
create trigger aa_preserve_authoritative_expenses before update on public.app_store
for each row execute function public.preserve_authoritative_expenses();
-- Even an old atomic batch retry cannot recreate an intentionally deleted ID.
create or replace function public.prevent_deleted_expense_restore()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.id='main' and exists(
  select 1 from jsonb_array_elements(coalesce(new.data->'expenses','[]')) e
  join public.expense_change_history h on h.expense_id=e->>'id' and h.action='delete'
 ) then
  raise exception 'A deleted expense cannot be restored by an old save. Refresh the register.' using errcode='40001';
 end if;
 return new;
end $$;
drop trigger if exists zz_prevent_deleted_expense_restore on public.app_store;
create trigger zz_prevent_deleted_expense_restore before update on public.app_store
for each row execute function public.prevent_deleted_expense_restore();
notify pgrst,'reload schema';
commit;
