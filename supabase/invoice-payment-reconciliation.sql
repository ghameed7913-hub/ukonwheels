-- Run once after invoice-amendments.sql. No receipts, invoices or bookings deleted.
-- Reopening reverses the portal receipt only; it does not issue a real refund.
begin;
create table if not exists public.invoice_payment_history(
 id uuid primary key default gen_random_uuid(),
 invoice_no text not null,actor uuid not null,action text not null,
 before_value jsonb not null,after_value jsonb not null,
 changed_at timestamptz not null default now()
);
alter table public.invoice_payment_history enable row level security;
revoke all on public.invoice_payment_history from public,anon,authenticated;

create or replace function public.change_portal_invoice_payment(
 p_invoice_no text,p_expected jsonb,p_action text,p_payment jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare source jsonb; original jsonb; revised jsonb; items jsonb; receipts jsonb; patches jsonb;
 refs text[]; item_count integer; matches integer; amount numeric; total numeric; method text; paid_date date; reference text;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','staff') and lower(status)='active')
  or not (public.is_portal_admin() or public.has_portal_permission('accounts:manage')) then
  raise exception 'Active Accounts management permission required' using errcode='42501';
 end if;
 if p_action is null or p_action not in ('settle','reopen') then raise exception 'Choose settle or reopen'; end if;
 select data into source from public.app_store where id='main' for update;
 if source is null then raise exception 'Saved portal data is unavailable'; end if;
 select count(*) into matches from jsonb_array_elements(coalesce(source->'invoices','[]')) i where i->>'invoiceNo'=p_invoice_no;
 if matches<>1 then raise exception 'A unique saved invoice is required'; end if;
 select i into original from jsonb_array_elements(source->'invoices') i where i->>'invoiceNo'=p_invoice_no;
 if original is distinct from p_expected then raise exception 'This invoice changed. Refresh and reopen it before changing payment.' using errcode='40001'; end if;
 items:=original->'items';
 if jsonb_typeof(items) is distinct from 'array' then raise exception 'Invoice vehicles are required'; end if;
 select array_agg(it->>'ref'),count(*) into refs,item_count from jsonb_array_elements(items) it;
 if item_count=0 or exists(select 1 from unnest(refs) r where r is null or r='')
  or item_count<>(select count(distinct r) from unnest(refs) r) then raise exception 'Unique invoice vehicle references are required'; end if;
 if exists(select 1 from jsonb_array_elements(source->'invoices') i
   where i->>'invoiceNo'<>p_invoice_no and i->>'status'='Paid'
   and exists(select 1 from jsonb_array_elements(i->'items') it where it->>'ref'=any(refs))) then
  raise exception 'A vehicle is linked to another paid invoice. Resolve that conflict before changing payment.';
 end if;
 if p_action='settle' then
  if jsonb_typeof(p_payment) is distinct from 'object' then raise exception 'Payment details are required'; end if;
  amount:=(p_payment->>'amount')::numeric;total:=(original->>'total')::numeric;
  method:=p_payment->>'method';reference:=trim(coalesce(p_payment->>'reference',''));
  if amount is null or total is null or amount::text in ('NaN','Infinity','-Infinity')
   or total::text in ('NaN','Infinity','-Infinity') or total<=0 or amount<>round(amount,2)
   or amount<>round(total,2) then raise exception 'Enter the exact invoice total before marking it Paid'; end if;
  if method is null or method not in ('Bank Transfer','Cash','Card','Other')
   or (method='Bank Transfer' and reference='') then raise exception 'Choose a payment method and enter the bank reference if applicable'; end if;
  if coalesce(p_payment->>'date','') !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$' then raise exception 'Enter a valid payment date'; end if;
  paid_date:=(p_payment->>'date')::date;
  if to_char(paid_date,'YYYY-MM-DD')<>p_payment->>'date' then raise exception 'Enter a valid payment date'; end if;
  if original->>'status'='Paid' then
   if (original->>'paidAmount')::numeric=amount and original->>'paymentMethod'=method
    and (original->>'paymentDate')::date=paid_date and coalesce(original->>'paymentReference','')=reference then
    return jsonb_build_object('invoice',original,'transactions',coalesce(source->'transactions','[]'),'bookings','[]'::jsonb);
   end if;
   raise exception 'This invoice is already paid. Reopen it before replacing its payment.';
  end if;
  if item_count<>(select count(distinct r) from unnest(refs) r where
    exists(select 1 from public.bookings b where b.reference=r)
    or exists(select 1 from jsonb_array_elements(coalesce(source->'bookings','[]')) b where b->>'ref'=r)) then
   raise exception 'Every invoice vehicle must have a saved booking';
  end if;
  revised:=original||jsonb_build_object('status','Paid','paymentDate',paid_date,
   'paymentMethod',method,'paymentReference',reference,'paidAmount',amount,'paidAt',now());
 else
  revised:=original||jsonb_build_object('status','Unpaid','paymentDate','','paymentMethod','',
   'paymentReference','','paidAmount',0,'paidAt','','reopenedAt',now());
 end if;
 revised:=revised||jsonb_build_object('paymentRevision',coalesce((original->>'paymentRevision')::integer,0)+1);
 -- Keep original receipt attempts, but exclude all prior attempts from active totals.
 select coalesce(jsonb_agg(case when (t->>'bookingRef'=p_invoice_no or t->>'invoiceNo'=p_invoice_no
   or t->>'bookingRef'=any(refs)) and coalesce(t->>'status','')<>'Reversed'
  then t||jsonb_build_object('status','Reversed','reversedAt',now(),'reversedBy',auth.uid(),'reversalReason',p_action)
  else t end order by n),'[]'::jsonb) into receipts
 from jsonb_array_elements(coalesce(source->'transactions','[]')) with ordinality a(t,n);
 if p_action='settle' then
  receipts:=receipts||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'invoiceNo',p_invoice_no,
   'date',paid_date,'bookingRef',p_invoice_no,'business',original->>'business','method',method,'amount',amount,
   'bankReference',reference,'status','Cleared','type','Invoice Payment'));
 end if;
 update public.bookings b set payment_status=case when p_action='settle' then 'Paid' else 'Pending' end,
  updated_at=now() where b.reference=any(refs);
 select coalesce(jsonb_agg(jsonb_build_object('ref',it->>'ref','invoiceNo',p_invoice_no,
  'paymentStatus',case when p_action='settle' then 'Paid' else 'Pending' end,
  'paymentMethod',case when p_action='settle' then method else 'Invoice' end,
  'paidDate',case when p_action='settle' then to_char(paid_date,'YYYY-MM-DD') else '' end,
  'paidAmount',case when p_action='settle' then (it->>'charge')::numeric else 0 end)),'[]'::jsonb)
  into patches from jsonb_array_elements(items) it;
 source:=jsonb_set(source,'{bookings}',coalesce((
  select jsonb_agg(case when b->>'ref'=any(refs)
   then b||(select patch from jsonb_array_elements(patches) patch where patch->>'ref'=b->>'ref') else b end order by n)
  from jsonb_array_elements(coalesce(source->'bookings','[]')) with ordinality a(b,n)),'[]'::jsonb));
 source:=jsonb_set(source,'{transactions}',receipts);
 source:=jsonb_set(source,'{invoices}',(
  select jsonb_agg(case when i->>'invoiceNo'=p_invoice_no then revised else i end order by n)
  from jsonb_array_elements(source->'invoices') with ordinality a(i,n)));
 update public.app_store set data=source,updated_at=now() where id='main';
 insert into public.invoice_payment_history(invoice_no,actor,action,before_value,after_value)
  values(p_invoice_no,auth.uid(),p_action,original,revised);
 return jsonb_build_object('invoice',revised,'transactions',receipts,'bookings',patches);
end $$;
revoke all on function public.change_portal_invoice_payment(text,jsonb,text,jsonb) from public,anon;
grant execute on function public.change_portal_invoice_payment(text,jsonb,text,jsonb) to authenticated;

-- Keep the old endpoint compatible, but stop old tabs creating duplicate receipts.
create or replace function public.settle_portal_invoice(
 p_invoice_no text,p_amount numeric,p_date date,p_method text,p_reference text default ''
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare original jsonb; result jsonb;
begin
 select i into original from public.app_store s,
  lateral jsonb_array_elements(s.data->'invoices') i where s.id='main' and i->>'invoiceNo'=p_invoice_no;
 result:=public.change_portal_invoice_payment(p_invoice_no,original,'settle',
  jsonb_build_object('amount',p_amount,'date',p_date,'method',p_method,'reference',p_reference));
 return result->'invoice';
end $$;
revoke all on function public.settle_portal_invoice(text,numeric,date,text,text) from public,anon;
grant execute on function public.settle_portal_invoice(text,numeric,date,text,text) to authenticated;

create or replace function public.preserve_invoice_payment_state()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare invoice jsonb; entries jsonb; fields jsonb; invoice_refs text[]; old_receipts jsonb; protected_bookings jsonb;
begin
 if current_user in ('authenticated','anon') and new.id='main' then
  entries:=coalesce(new.data->'invoices','[]');
  for invoice in select i from jsonb_array_elements(coalesce(old.data->'invoices','[]')) i loop
   select coalesce(jsonb_object_agg(key,value),'{}') into fields from jsonb_each(invoice)
    where key in ('status','paymentDate','paymentMethod','paymentReference','paidAmount','paidAt','paymentRevision','reopenedAt');
   if exists(select 1 from jsonb_array_elements(entries) i where i->>'invoiceNo'=invoice->>'invoiceNo') then
    select jsonb_agg(case when i->>'invoiceNo'=invoice->>'invoiceNo'
      then (i-array['status','paymentDate','paymentMethod','paymentReference','paidAmount','paidAt','paymentRevision','reopenedAt'])||fields else i end order by n)
      into entries from jsonb_array_elements(entries) with ordinality a(i,n);
   else entries:=entries||jsonb_build_array(invoice);
   end if;
  end loop;
  select array_agg(i->>'invoiceNo') into invoice_refs from jsonb_array_elements(entries) i;
  select coalesce(jsonb_agg(t order by n),'[]') into old_receipts
   from jsonb_array_elements(coalesce(old.data->'transactions','[]')) with ordinality a(t,n)
   where t->>'bookingRef'=any(invoice_refs) or t->>'invoiceNo'=any(invoice_refs) or t->>'type'='Invoice Payment';
  new.data:=jsonb_set(new.data,'{transactions}',coalesce((
   select jsonb_agg(t order by n) from jsonb_array_elements(coalesce(new.data->'transactions','[]')) with ordinality a(t,n)
   where not (coalesce(t->>'bookingRef','')=any(coalesce(invoice_refs,array[]::text[]))
    or coalesce(t->>'invoiceNo','')=any(coalesce(invoice_refs,array[]::text[])) or coalesce(t->>'type','')='Invoice Payment')),'[]')||old_receipts);
  -- A stale shared snapshot must not restore the old Paid status on linked bookings.
  for invoice in select i from jsonb_array_elements(entries) i where coalesce((i->>'paymentRevision')::integer,0)>0 loop
   select coalesce(jsonb_agg(b),'[]') into protected_bookings from jsonb_array_elements(coalesce(old.data->'bookings','[]')) b
    where exists(select 1 from jsonb_array_elements(invoice->'items') it where it->>'ref'=b->>'ref');
   new.data:=jsonb_set(new.data,'{bookings}',coalesce((
    select jsonb_agg(case when p is not null then b||(select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(p)
     where key in ('invoiceNo','paymentStatus','paymentMethod','paidDate','paidAmount')) else b end order by n)
    from jsonb_array_elements(coalesce(new.data->'bookings','[]')) with ordinality a(b,n)
    left join lateral (select p as p from jsonb_array_elements(protected_bookings) p where p->>'ref'=b->>'ref' limit 1) linked on true),'[]'));
  end loop;
  new.data:=jsonb_set(new.data,'{invoices}',entries);
 end if;
 return new;
end $$;
drop trigger if exists ukow_invoice_receipt_guard on public.app_store;
create trigger ukow_invoice_receipt_guard before update on public.app_store
for each row execute function public.preserve_invoice_payment_state();
commit;
