-- Non-destructive portal safety upgrade. Run in Supabase SQL Editor before
-- releasing the matching portal code. Keeps existing users, jobs and files.
begin;

alter table public.bookings add column if not exists dropoff_deadline text;
alter table public.bookings add column if not exists client_id uuid references public.profiles(id) on delete set null;

-- Restrictive policies AND with existing permissive policies: an older broad
-- policy cannot reopen this operations-only row to Clients, Drivers or anon.
alter table public.app_store enable row level security;
drop policy if exists ukow_operations_store_only on public.app_store;
create policy ukow_operations_store_only on public.app_store as restrictive
for all to anon, authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid()
  and lower(p.status)='active' and p.role in ('admin','staff')))
with check (exists(select 1 from public.profiles p where p.id=auth.uid()
  and lower(p.status)='active' and p.role in ('admin','staff')));

create or replace function public.read_own_portal_store()
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.profiles; source jsonb; own_refs text[]; result jsonb;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or lower(actor.status)<>'active'
     or actor.role not in ('client','driver') then
    raise exception 'An active Client or Driver account is required';
  end if;
  select data into source from public.app_store where id='main';
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  result:=jsonb_build_object('businesses','[]'::jsonb,'drivers','[]'::jsonb,
    'bookings','[]'::jsonb,'notifications','[]'::jsonb,'invoices','[]'::jsonb,
    'staffUsers','[]'::jsonb,'payslips','[]'::jsonb,'holidays','[]'::jsonb);
  if actor.role='client' then
    select coalesce(array_agg(b.reference),array[]::text[]) into own_refs
    from public.bookings b where b.client_id=actor.id or b.created_by=actor.id
      or (b.business_id is not null and public.is_business_member(b.business_id));
    -- Never authorize invoices by a display name. Every vehicle on an invoice
    -- must belong to this Client; empty/mixed/unknown-reference invoices stay hidden.
    result:=result||jsonb_build_object('invoices',coalesce((
      select jsonb_agg(i) from jsonb_array_elements(coalesce(source->'invoices','[]')) x(i)
      where case when jsonb_typeof(i->'items')='array' then jsonb_array_length(i->'items') else 0 end>0
      and not exists(select 1 from jsonb_array_elements(
        case when jsonb_typeof(i->'items')='array' then i->'items' else '[]'::jsonb end) y(item)
        where item->>'ref' is null or not ((item->>'ref')=any(own_refs)))
    ),'[]'::jsonb));
    -- Only the company information actually printed on customer invoices.
    result:=result||jsonb_build_object('invoiceSettings',coalesce((
      select jsonb_object_agg(key,value) from jsonb_each(coalesce(source->'invoiceSettings','{}'))
      where key=any(array['companyName','companyAddress','companyPostcode','companyEmail',
        'companyPhone','vatNumber','companyRegistration','bankName','bankAccountName',
        'bankSortCode','bankAccountNumber','iban','paymentTermsDays','latePaymentText'])
    ),'{}'::jsonb));
  else
    result:=result||jsonb_build_object(
      'staffUsers',coalesce((select jsonb_agg(u-'password') from
        jsonb_array_elements(coalesce(source->'staffUsers','[]')) x(u)
        where u->>'id'=actor.id::text),'[]'::jsonb),
      'payslips',coalesce((select jsonb_agg(p) from
        jsonb_array_elements(coalesce(source->'payslips','[]')) x(p)
        where p->>'profileId'=actor.id::text
           or (not (p ? 'profileId') and lower(p->>'email')=lower(actor.email))),'[]'::jsonb),
      'holidays',coalesce((select jsonb_agg(h) from
        jsonb_array_elements(coalesce(source->'holidays','[]')) x(h)
        where h->>'profileId'=actor.id::text
           or (not (h ? 'profileId') and lower(h->>'email')=lower(actor.email))),'[]'::jsonb)
    );
  end if;
  return result;
end;
$$;

create or replace function public.request_own_driver_holiday(p_request jsonb)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare actor public.profiles; request jsonb; source jsonb;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or actor.role<>'driver' or lower(actor.status)<>'active' then
    raise exception 'An active Driver account is required';
  end if;
  if nullif(p_request->>'from','') is null or nullif(p_request->>'to','') is null
     or (p_request->>'to')::date < (p_request->>'from')::date then
    raise exception 'Select valid holiday dates';
  end if;
  select data into source from public.app_store where id='main' for update;
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  request:=jsonb_build_object('id',gen_random_uuid()::text,'profileId',actor.id,
    'email',actor.email,'name',coalesce(actor.full_name,actor.name),'role','Driver',
    'from',(p_request->>'from')::date,'to',(p_request->>'to')::date,
    'type',coalesce(nullif(p_request->>'type',''),'Annual Leave'),
    'notes',coalesce(p_request->>'notes',''),'requestedBy',coalesce(actor.full_name,actor.name),
    'requestedAt',now(),'status','Pending');
  update public.app_store set data=jsonb_set(source,'{holidays}',
    coalesce(source->'holidays','[]')||jsonb_build_array(request)),updated_at=now()
  where id='main';
  return request;
end;
$$;

create or replace function public.admin_edit_portal_user(
  p_user_id uuid,p_details jsonb,p_permissions text[] default array[]::text[]
)
returns public.profiles language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.profiles; changed public.profiles; source jsonb;
  email_value text:=lower(trim(p_details->>'email'));
  name_value text:=trim(concat_ws(' ',nullif(trim(p_details->>'firstName'),''),
    nullif(trim(p_details->>'middleName'),''),nullif(trim(p_details->>'lastName'),'')));
  role_value text:=lower(p_details->>'role'); status_value text:=p_details->>'status';
  safe_details jsonb; users jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Admin access required'; end if;
  select * into target from public.profiles where id=p_user_id for update;
  if target.id is null or target.role not in ('staff','driver')
     or target.status='Deleted' then raise exception 'Choose a saved Staff or Driver account'; end if;
  if role_value not in ('staff','driver') or status_value not in ('Active','Inactive')
     or role_value is null or status_value is null then raise exception 'Invalid role or status'; end if;
  if nullif(trim(p_details->>'firstName'),'') is null
     or nullif(trim(p_details->>'lastName'),'') is null
     or email_value is null or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'First name, last name and a valid email are required';
  end if;
  if exists(select 1 from auth.users where id<>p_user_id and lower(email)=email_value) then
    raise exception 'Another account already uses this email address';
  end if;
  if target.role='driver' and role_value<>'driver'
     and exists(select 1 from public.bookings where driver_id=p_user_id
       and status<>'Delivered' and delivered_at is null) then
    raise exception 'Reassign this Driver''s active jobs before changing their role';
  end if;
  select data into source from public.app_store where id='main' for update;
  if source is null then raise exception 'Saved portal data is unavailable'; end if;
  -- Update Auth and its email identity atomically with the portal profile.
  -- Password hashes, verification state and non-email identities are unchanged.
  update auth.users set email=email_value,
    email_change='',email_change_token_new='',email_change_token_current='',
    email_change_sent_at=null,email_change_confirm_status=0,
    raw_user_meta_data=coalesce(raw_user_meta_data,'{}')||jsonb_build_object(
      'name',name_value,'full_name',name_value,'first_name',trim(p_details->>'firstName'),
      'middle_name',trim(p_details->>'middleName'),'last_name',trim(p_details->>'lastName'),
      'phone',trim(p_details->>'phone')),updated_at=now()
  where id=p_user_id;
  if not found then raise exception 'The sign-in account could not be found'; end if;
  update auth.identities set identity_data=coalesce(identity_data,'{}')||
    jsonb_build_object('email',email_value),updated_at=now()
    where user_id=p_user_id and provider='email';
  perform public.admin_set_user_role(p_user_id,role_value,
    case when role_value='staff' then 'Staff' else null end,
    case when role_value='staff' then p_permissions else array[]::text[] end);
  update public.profiles set name=name_value,full_name=name_value,email=email_value,
    phone=trim(p_details->>'phone'),status=status_value,updated_at=now()
  where id=p_user_id returning * into changed;
  select coalesce(jsonb_object_agg(key,value),'{}') into safe_details
  from jsonb_each(p_details) where key=any(array[
    'firstName','middleName','lastName','phone','permissions','currentAddress',
    'currentPostcode','yearsAtCurrentAddress','previousAddress','previousPostcode',
    'emergencyName','emergencyNumber','emergencyAddress','emergencyPostcode',
    'drivingLicenceNo','drivingShareCode','licenceType','licenceCountry','passportNo',
    'visaType','rightToWorkShareCode','homeOfficeRef','safetyCertificate',
    'passportPicture','dvlaPicture','visaCard']);
  safe_details:=safe_details||jsonb_build_object('id',p_user_id,'name',name_value,
    'email',email_value,'role',initcap(role_value),'status',status_value,'updatedAt',now());
  select coalesce(jsonb_agg(case when u->>'id'=p_user_id::text
    then (u-'password')||safe_details else u end),'[]') into users
    from jsonb_array_elements(coalesce(source->'staffUsers','[]')) x(u);
  if not exists(select 1 from jsonb_array_elements(users) x(u) where u->>'id'=p_user_id::text)
    then users:=users||jsonb_build_array(safe_details); end if;
  -- Bind historic HR records to the stable account ID before changing an email,
  -- so the same Driver still owns their previous holidays and payslips.
  source:=jsonb_set(source,'{staffUsers}',users);
  source:=jsonb_set(source,'{payslips}',coalesce((
    select jsonb_agg(case when r->>'profileId'=p_user_id::text
      or (not (r ? 'profileId') and lower(r->>'email')=lower(target.email))
      then r||jsonb_build_object('profileId',p_user_id,'email',email_value) else r end)
    from jsonb_array_elements(coalesce(source->'payslips','[]')) x(r)
  ),'[]'::jsonb));
  source:=jsonb_set(source,'{holidays}',coalesce((
    select jsonb_agg(case when r->>'profileId'=p_user_id::text
      or (not (r ? 'profileId') and lower(r->>'email')=lower(target.email))
      then r||jsonb_build_object('profileId',p_user_id,'email',email_value) else r end)
    from jsonb_array_elements(coalesce(source->'holidays','[]')) x(r)
  ),'[]'::jsonb));
  update public.app_store set data=source,updated_at=now() where id='main';
  return changed;
end;
$$;

create or replace function public.settle_portal_invoice(
  p_invoice_no text,p_amount numeric,p_date date,p_method text,p_reference text default ''
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare source jsonb; invoice jsonb; updated_invoice jsonb; invoices jsonb;
  items jsonb; item_count integer; total_value numeric; refs text[];
begin
  if not (public.is_portal_admin() or public.has_portal_permission('accounts:manage'))
     or not exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active') then
    raise exception 'Active Accounts permission required';
  end if;
  select data into source from public.app_store where id='main' for update;
  select i into invoice from jsonb_array_elements(coalesce(source->'invoices','[]')) x(i)
    where i->>'invoiceNo'=p_invoice_no;
  if invoice is null then raise exception 'Invoice not found'; end if;
  total_value:=(invoice->>'total')::numeric;
  if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
     or total_value is null or total_value<=0
     or total_value::text in ('NaN','Infinity','-Infinity')
     or round(p_amount,2)<round(total_value,2) then
    raise exception 'The full invoice amount must be paid before marking it Paid';
  end if;
  if p_date is null or p_method is null or p_method not in ('Bank Transfer','Cash','Card','Other')
     or (p_method='Bank Transfer' and nullif(trim(p_reference),'') is null) then
    raise exception 'Payment date, method and bank reference are required';
  end if;
  if invoice->>'status'='Paid' then
    if (invoice->>'paidAmount')::numeric=p_amount and (invoice->>'paymentDate')::date=p_date
       and invoice->>'paymentMethod'=p_method and coalesce(invoice->>'paymentReference','')=coalesce(p_reference,'')
      then return invoice; end if;
    raise exception 'This invoice is already paid. Reload it before making changes';
  end if;
  items:=invoice->'items';
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)=0 then
    raise exception 'The invoice has no booked vehicles';
  end if;
  select array_agg(item->>'ref'),count(*) into refs,item_count from jsonb_array_elements(items) x(item);
  if item_count<>(select count(distinct r) from unnest(refs) r)
     or item_count<>(select count(*) from public.bookings where reference=any(refs)) then
    raise exception 'Every invoice vehicle must have a unique saved booking';
  end if;
  update public.bookings set payment_status='Paid',updated_at=now() where reference=any(refs);
  updated_invoice:=invoice||jsonb_build_object('status','Paid','paymentDate',p_date,
    'paymentMethod',p_method,'paymentReference',coalesce(p_reference,''),
    'paidAmount',p_amount,'paidAt',now());
  select jsonb_agg(case when i->>'invoiceNo'=p_invoice_no then updated_invoice else i end)
    into invoices from jsonb_array_elements(source->'invoices') x(i);
  source:=jsonb_set(source,'{invoices}',invoices);
  source:=jsonb_set(source,'{bookings}',coalesce((
    select jsonb_agg(case when b->>'ref'=any(refs) then b||jsonb_build_object(
      'paymentStatus','Paid','paymentMethod',p_method,'paidDate',p_date,
      'paidAmount',(select item->'charge' from jsonb_array_elements(items) x(item) where item->>'ref'=b->>'ref'),
      'invoiceNo',p_invoice_no) else b end)
    from jsonb_array_elements(coalesce(source->'bookings','[]')) x(b)
  ),'[]'::jsonb));
  source:=jsonb_set(source,'{transactions}',coalesce(source->'transactions','[]')||jsonb_build_array(
    jsonb_build_object('date',p_date,'bookingRef',p_invoice_no,'business',invoice->>'business',
      'method',p_method,'amount',p_amount,'bankReference',coalesce(p_reference,''),
      'status','Cleared','type','Invoice Payment')));
  update public.app_store set data=source,updated_at=now() where id='main';
  return updated_invoice;
end;
$$;

-- Same rich, ownership-checked booking contract for single and Excel bookings.
create or replace function public.client_create_bulk_booking(p_reference text,p_booking jsonb)
returns public.bookings language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare actor public.profiles; existing public.bookings; saved public.bookings;
  business uuid; customer_type text; registration text; vehicle text;
  make text; model text; miles_value numeric; service_value text;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or actor.role<>'client' or lower(actor.status)<>'active' then
    raise exception 'An active Client account is required'; end if;
  if p_reference is null or p_reference !~ '^UKOW-[0-9]{4}-[A-F0-9]{32}$' then
    raise exception 'A valid bulk booking reference is required'; end if;
  if p_booking is null or jsonb_typeof(p_booking)<>'object' then
    raise exception 'Booking details are required'; end if;
  if lower(actor.account_type)='business' then
    business:=nullif(p_booking->>'_businessId','')::uuid;
    if business is null or not public.is_business_member(business)
       or not exists(select 1 from public.businesses where id=business and lower(status)='active') then
      raise exception 'An active linked business is required'; end if;
    customer_type:='Business';
  else
    if nullif(p_booking->>'_businessId','') is not null then raise exception 'A Private Client cannot book for a business'; end if;
    customer_type:='Private';
  end if;
  if coalesce(nullif(p_booking->>'customerType',''),customer_type)<>customer_type then raise exception 'Use your own Client account type'; end if;
  if coalesce(nullif(p_booking->>'amount','')::numeric,0)<>0 then raise exception 'Only Operations can set customer charges'; end if;
  miles_value:=coalesce(nullif(p_booking->>'miles','')::numeric,0);
  if miles_value<0 or miles_value::text in ('NaN','Infinity','-Infinity') then raise exception 'Estimated miles must be zero or more'; end if;
  vehicle:=trim(coalesce(p_booking->>'vehicle',''));
  registration:=upper(regexp_replace(coalesce(p_booking->>'reg',''),'[\s-]','','g'));
  if vehicle='' or registration='' or trim(coalesce(p_booking->>'pickup',''))=''
     or trim(coalesce(p_booking->>'destination',''))='' or trim(coalesce(p_booking->>'receiver',''))=''
     or trim(coalesce(p_booking->>'receiverMobile',''))='' then
    raise exception 'Complete vehicle, registration, collection, delivery and receiver details'; end if;
  service_value:=coalesce(nullif(p_booking->>'service',''),'Vehicle Delivery');
  if service_value not in ('Vehicle Delivery','Vehicle Collection & Delivery','Recovery / AA') then raise exception 'Choose a valid service type'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
  select * into existing from public.bookings where reference=p_reference;
  if existing.id is not null then
    if existing.created_by is distinct from auth.uid() or existing.client_id is distinct from auth.uid()
       or existing.business_id is distinct from business
       or upper(regexp_replace(existing.vehicle_registration,'[\s-]','','g'))<>registration then
      raise exception 'This reference cannot be used for this booking'; end if;
    return existing;
  end if;
  make:=split_part(vehicle,' ',1); model:=nullif(trim(substr(vehicle,length(make)+1)),'');
  saved:=public.create_portal_booking(customer_type,business,make,model,registration,null,service_value,
    trim(p_booking->>'pickup'),null,trim(p_booking->>'destination'),null,
    trim(p_booking->>'receiver'),trim(p_booking->>'receiverMobile'),
    nullif(p_booking->>'deliveryDate','')::date,nullif(p_booking->>'notes',''));
  update public.bookings set reference=p_reference,client_id=auth.uid(),
    booking_date=coalesce(nullif(p_booking->>'bookingDate','')::date,current_date),
    miles=miles_value,dropoff_deadline=nullif(p_booking->>'dropoffTill',''),
    status='New Booked Vehicle',payment_status='Pending',updated_at=now()
  where id=saved.id returning * into saved;
  return saved;
end;
$$;

revoke all on function public.read_own_portal_store() from public, anon;
revoke all on function public.request_own_driver_holiday(jsonb) from public, anon;
revoke all on function public.admin_edit_portal_user(uuid,jsonb,text[]) from public, anon;
revoke all on function public.settle_portal_invoice(text,numeric,date,text,text) from public, anon;
revoke all on function public.client_create_bulk_booking(text,jsonb) from public, anon;
grant execute on function public.read_own_portal_store() to authenticated;
grant execute on function public.request_own_driver_holiday(jsonb) to authenticated;
grant execute on function public.admin_edit_portal_user(uuid,jsonb,text[]) to authenticated;
grant execute on function public.settle_portal_invoice(text,numeric,date,text,text) to authenticated;
grant execute on function public.client_create_bulk_booking(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
