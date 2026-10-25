-- Saved, shared expense types. Requires the existing bulk-expenses.sql setup.
-- Safe to rerun; does not delete or alter any saved expenses.
begin;
create table if not exists public.expense_types(
 name text primary key check(length(name) between 1 and 80 and name=btrim(name) and name!~'[[:cntrl:]]'),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create unique index if not exists expense_types_name_ci on public.expense_types(lower(name));
alter table public.expense_types enable row level security;
revoke all on public.expense_types from public,anon,authenticated;

create or replace function public.read_expense_types()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active' and role in ('admin','staff'))
  or not (public.is_portal_admin() or public.has_portal_permission('accounts:view') or public.has_portal_permission('accounts:manage')) then
  raise exception 'Accounts access required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(name order by lower(name)) from public.expense_types),'[]'::jsonb);
end $$;

create or replace function public.add_expense_type(p_name text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare cleaned text:=regexp_replace(btrim(p_name),'[[:space:]]+',' ','g');
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active' and role in ('admin','staff'))
  or not (public.is_portal_admin() or public.has_portal_permission('accounts:manage')) then
  raise exception 'Accounts management access required' using errcode='42501';
 end if;
 if cleaned is null or length(cleaned) not between 1 and 80 or p_name~'[[:cntrl:]]' then
  raise exception 'Enter an expense type between 1 and 80 characters' using errcode='22023';
 end if;
 -- Built-in names and case-insensitive duplicates are already valid types.
 if lower(cleaned) not in ('wages','salary','fuel','rent','office','entertainment','utility bills',
  'rider fuel','staff fuel','hotel expense','vehicle recovery expenses','insurance','other expenses') then
  insert into public.expense_types(name,created_by) values(cleaned,auth.uid()) on conflict do nothing;
 end if;
 return public.read_expense_types();
end $$;

-- Extend only the category predicate in the installed, retry-safe batch function.
-- All its existing date, amount, role, idempotency and snapshot guards stay intact.
do $migration$
declare definition text; original text; replacement text;
begin
 if to_regprocedure('public.save_expense_batch(uuid,jsonb)') is null then
  raise exception 'Run supabase/bulk-expenses.sql first';
 end if;
 definition:=pg_get_functiondef('public.save_expense_batch(uuid,jsonb)'::regprocedure);
 if position('public.expense_types' in definition)>0 then return; end if;
 original:=$old$coalesce(row->>'category','') not in ('Wages','Salary','Fuel','Rent','Office','Entertainment',
      'Utility Bills','Rider Fuel','Staff Fuel','Hotel Expense','Vehicle Recovery Expenses','Insurance','Other Expenses')$old$;
 replacement:='('||original||' and not exists(select 1 from public.expense_types t where t.name=row->>''category''))';
 if position(original in definition)=0 then
  raise exception 'Expense batch function differs from the expected setup. No changes were applied; ask for an updated patch.';
 end if;
 execute replace(definition,original,replacement);
end $migration$;

revoke all on function public.read_expense_types() from public,anon;
revoke all on function public.add_expense_type(text) from public,anon;
grant execute on function public.read_expense_types() to authenticated;
grant execute on function public.add_expense_type(text) to authenticated;
notify pgrst,'reload schema';
commit;
