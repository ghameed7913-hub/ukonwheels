-- Non-destructive. Run once in Supabase SQL Editor before using Edit Invoice.
-- Booking charges/revenue and recorded payments are not changed by amendments.
begin;
create table if not exists public.invoice_amendment_history(
 id uuid primary key default gen_random_uuid(),
 invoice_no text not null,
 actor uuid not null,
 reason text not null,
 before_value jsonb not null,
 after_value jsonb not null,
 changed_at timestamptz not null default now()
);
alter table public.invoice_amendment_history enable row level security;
revoke all on public.invoice_amendment_history from public,anon,authenticated;

create or replace function public.amend_portal_invoice(p_invoice_no text,p_expected jsonb,p_values jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare source jsonb; original jsonb; replacement jsonb; items jsonb:='[]'::jsonb;
 item jsonb; charge numeric; subtotal numeric:=0; vat_pct numeric; vat numeric;
 extra numeric; other numeric; total numeric; enabled boolean; issue_date date; due_date date;
 bill jsonb:='{}'::jsonb; company jsonb; field text; reason text; count_matches integer; idx integer:=0;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active' and role in ('admin','staff'))
   or not (public.is_portal_admin() or public.has_portal_permission('accounts:manage')) then
  raise exception 'Accounts management permission required' using errcode='42501';
 end if;
 if jsonb_typeof(p_values) is distinct from 'object' then raise exception 'Invoice changes are required'; end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select count(*) into count_matches from jsonb_array_elements(coalesce(source->'invoices','[]')) i where i->>'invoiceNo'=p_invoice_no;
 if count_matches<>1 then raise exception 'A unique saved invoice is required'; end if;
 select i into original from jsonb_array_elements(source->'invoices') i where i->>'invoiceNo'=p_invoice_no;
 if original is distinct from p_expected then
  raise exception 'This invoice changed since you opened it. Close, refresh and reopen before editing.' using errcode='40001';
 end if;
 if coalesce(p_values->>'date','') !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$' then raise exception 'Enter a valid invoice date'; end if;
 issue_date:=(p_values->>'date')::date;
 if to_char(issue_date,'YYYY-MM-DD')<>p_values->>'date' then raise exception 'Enter a valid invoice date'; end if;
 if nullif(p_values->>'dueDate','') is not null then
  if p_values->>'dueDate' !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$' then raise exception 'Enter a valid due date'; end if;
  due_date:=(p_values->>'dueDate')::date;
  if to_char(due_date,'YYYY-MM-DD')<>p_values->>'dueDate' or due_date<issue_date then raise exception 'The due date cannot be before the invoice date'; end if;
 end if;
 if jsonb_typeof(p_values->'charges') is distinct from 'array'
   or jsonb_typeof(original->'items') is distinct from 'array' then raise exception 'Invoice vehicles are required'; end if;
 if jsonb_array_length(original->'items')=0 or jsonb_array_length(p_values->'charges')<>jsonb_array_length(original->'items') then
  raise exception 'The invoice vehicles cannot be changed in this editor';
 end if;
 for item in select value from jsonb_array_elements(original->'items') loop
  charge:=(p_values->'charges'->>idx)::numeric;
  if charge is null or charge::text in ('NaN','Infinity','-Infinity') or charge<0 or charge>100000000 or charge<>round(charge,2) then
   raise exception 'Vehicle charges must be zero or more, with up to two decimal places';
  end if;
  items:=items||jsonb_build_array(item||jsonb_build_object('charge',charge));
  subtotal:=subtotal+charge;idx:=idx+1;
 end loop;
 if jsonb_typeof(p_values->'vatEnabled') is distinct from 'boolean' then raise exception 'Choose whether VAT applies'; end if;
 enabled:=(p_values->>'vatEnabled')::boolean;
 vat_pct:=case when enabled then (p_values->>'vatPct')::numeric else 0 end;
 extra:=(p_values->>'extraPhrasal')::numeric;other:=(p_values->>'otherCharges')::numeric;
 if vat_pct is null or extra is null or other is null
   or vat_pct::text in ('NaN','Infinity','-Infinity') or extra::text in ('NaN','Infinity','-Infinity') or other::text in ('NaN','Infinity','-Infinity')
   or vat_pct<0 or vat_pct>100 or extra<0 or other<0 or extra>100000000 or other>100000000
   or vat_pct<>round(vat_pct,2) or extra<>round(extra,2) or other<>round(other,2) then raise exception 'Enter valid VAT and extra charges'; end if;
 vat:=case when enabled then round(subtotal*vat_pct/100,2) else 0 end;
 total:=subtotal+vat+extra+other;
 if jsonb_typeof(p_values->'billTo') is distinct from 'object' then raise exception 'Billing details are required'; end if;
 foreach field in array array['name','address','postcode','email','phone','vatNumber','companyReg'] loop
  if jsonb_typeof(p_values->'billTo'->field) is distinct from 'string' or length(p_values->'billTo'->>field)>500 then
   raise exception 'Billing details must be text, up to 500 characters per field';
  end if;
  bill:=bill||jsonb_build_object(field,trim(p_values->'billTo'->>field));
 end loop;
 if nullif(bill->>'name','') is null then raise exception 'Enter the billing name'; end if;
 -- Amend only the invoice snapshot, never the company-wide defaults or logo.
 if p_values ? 'companyDetails' then
  if jsonb_typeof(p_values->'companyDetails') is distinct from 'object' then raise exception 'Company details are required'; end if;
  company:=coalesce(nullif(original->'companyDetails','null'::jsonb),nullif(source->'invoiceSettings','null'::jsonb),'{}'::jsonb);
  foreach field in array array['companyName','companyAddress','companyPostcode','companyEmail','companyPhone','companyRegistration','vatNumber','bankName','bankAccountName','bankSortCode','bankAccountNumber','iban'] loop
   if jsonb_typeof(p_values->'companyDetails'->field) is distinct from 'string' or length(p_values->'companyDetails'->>field)>500 then
    raise exception 'Company details must be text, up to 500 characters per field';
   end if;
   company:=company||jsonb_build_object(field,trim(p_values->'companyDetails'->>field));
  end loop;
  if nullif(company->>'companyName','') is null then raise exception 'Enter the company name'; end if;
 end if;
 reason:=trim(p_values->>'reason');
 if reason is null or reason='' or length(reason)>1000 then raise exception 'Enter an amendment reason, up to 1000 characters'; end if;
 if jsonb_typeof(p_values->'otherDescription') is distinct from 'string' or length(p_values->>'otherDescription')>2000 then raise exception 'Enter a description up to 2000 characters'; end if;
 if original->>'status'='Paid' and (
   exists(select 1 from jsonb_array_elements(original->'items') with ordinality x(it,n)
     where (it->>'charge')::numeric is distinct from (p_values->'charges'->>(n::integer-1))::numeric)
   or (coalesce(original->>'extraPhrasal','0'))::numeric<>extra
   or (coalesce(original->>'otherCharges','0'))::numeric<>other
   or coalesce((original->>'vatEnabled')::boolean,true)<>enabled
   or (coalesce(original->>'vatPct','0'))::numeric<>vat_pct
   or (original->>'total')::numeric is distinct from total) then
  raise exception 'This invoice is paid. Recorded charges and VAT cannot be changed; only dates, billing details and the description can be amended.';
 end if;
 replacement:=original||jsonb_build_object('date',issue_date,'dueDate',coalesce(to_char(due_date,'YYYY-MM-DD'),''),
  'billTo',bill,'items',items,'vehicleCount',jsonb_array_length(items),'subtotal',subtotal,
  'vatEnabled',enabled,'vatPct',vat_pct,'vatAmount',vat,'extraPhrasal',extra,'otherCharges',other,
  'extraTotal',extra+other,'otherDescription',trim(p_values->>'otherDescription'),'total',total,
  'amendmentRevision',coalesce((original->>'amendmentRevision')::integer,0)+1,'amendedBy',auth.uid(),'amendedAt',now());
 if company is not null then replacement:=replacement||jsonb_build_object('companyDetails',company); end if;
 select jsonb_set(source,'{invoices}',jsonb_agg(case when i->>'invoiceNo'=p_invoice_no then replacement else i end order by n))
 into source from jsonb_array_elements(source->'invoices') with ordinality a(i,n);
 update public.app_store set data=source,updated_at=now() where id='main';
 insert into public.invoice_amendment_history(invoice_no,actor,reason,before_value,after_value)
 values(p_invoice_no,auth.uid(),reason,original,replacement);
 return replacement;
end $$;
revoke all on function public.amend_portal_invoice(text,jsonb,jsonb) from public,anon;
grant execute on function public.amend_portal_invoice(text,jsonb,jsonb) to authenticated;

-- Existing general portal saves can add invoices and update payment metadata,
-- but cannot revert an amendment or remove an amended invoice.
create or replace function public.preserve_amended_invoices()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare old_invoice jsonb; entries jsonb; payment jsonb;
begin
 if current_user in ('authenticated','anon') and new.id='main' then
  entries:=coalesce(new.data->'invoices','[]'::jsonb);
  for old_invoice in select i from jsonb_array_elements(coalesce(old.data->'invoices','[]')) i
    where coalesce((i->>'amendmentRevision')::integer,0)>0 loop
   select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into payment
   from jsonb_each(coalesce((select i from jsonb_array_elements(entries) i where i->>'invoiceNo'=old_invoice->>'invoiceNo' limit 1),'{}'::jsonb))
   where key in ('status','paymentDate','paymentMethod','paymentReference','paidAmount','paidAt');
   if exists(select 1 from jsonb_array_elements(entries) i where i->>'invoiceNo'=old_invoice->>'invoiceNo') then
    select jsonb_agg(case when i->>'invoiceNo'=old_invoice->>'invoiceNo' then old_invoice||payment else i end order by n)
     into entries from jsonb_array_elements(entries) with ordinality a(i,n);
   else entries:=entries||jsonb_build_array(old_invoice);
   end if;
  end loop;
  new.data:=jsonb_set(new.data,'{invoices}',entries);
 end if;
 return new;
end $$;
drop trigger if exists ukow_preserve_amended_invoices on public.app_store;
create trigger ukow_preserve_amended_invoices before update on public.app_store
for each row execute function public.preserve_amended_invoices();
commit;
