-- NON-DESTRUCTIVE: shared invoice defaults and durable invoice logos.
-- Run once before releasing the matching invoice/PDF portal update.
begin;

create or replace function public.invoice_company_fields(p_settings jsonb)
returns jsonb language sql immutable set search_path=pg_catalog,public as $$
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
  from jsonb_each(coalesce(p_settings,'{}'::jsonb))
  where key=any(array['companyName','companyAddress','companyPostcode','companyEmail',
    'companyPhone','vatNumber','companyRegistration','bankName','bankAccountName',
    'bankSortCode','bankAccountNumber','iban','paymentTermsDays','latePaymentText',
    'showLogo','logoPath','savedAt'])
$$;

create or replace function public.get_invoice_company_settings(p_invoice_no text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; settings jsonb; own_invoice jsonb;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or lower(actor.status)<>'active' then raise exception 'Active sign-in required'; end if;
  if actor.role in ('admin','staff') and
     (public.is_portal_admin() or public.has_portal_permission('accounts:manage')
       or public.has_portal_permission('accounts:view')) then
    select data->'invoiceSettings' into settings from public.app_store where id='main';
  elsif actor.role='client' and p_invoice_no is not null then
    select i into own_invoice from jsonb_array_elements(public.read_own_portal_store()->'invoices') x(i)
      where i->>'invoiceNo'=p_invoice_no;
    if own_invoice is null then raise exception 'This invoice is not available to your account'; end if;
    select coalesce(own_invoice->'companyDetails',data->'invoiceSettings') into settings
      from public.app_store where id='main';
  else
    raise exception 'Accounts access or ownership of this invoice is required';
  end if;
  if settings is null then return null; end if;
  return public.invoice_company_fields(settings);
end;
$$;

-- Prevent an older browser's whole-store save from reverting the global defaults.
-- Trusted SQL maintenance (no JWT identity), including the guarded reset, is unaffected.
create or replace function public.keep_invoice_company_settings()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if old.id='main' and auth.uid() is not null
     and coalesce(current_setting('ukow.invoice_settings_write',true),'')<>'on' then
    if old.data ? 'invoiceSettings' then
      new.data:=jsonb_set(new.data,'{invoiceSettings}',old.data->'invoiceSettings');
    else new.data:=new.data-'invoiceSettings'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists ukow_keep_invoice_company_settings on public.app_store;
create trigger ukow_keep_invoice_company_settings before update on public.app_store
for each row execute function public.keep_invoice_company_settings();

create or replace function public.save_invoice_company_settings(p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.profiles; settings jsonb; logo text;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or lower(actor.status)<>'active' or actor.role not in ('admin','staff')
     or not (public.is_portal_admin() or public.has_portal_permission('accounts:manage')) then
    raise exception 'Active Accounts permission required';
  end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object'
     or nullif(trim(p_settings->>'companyName'),'') is null then raise exception 'Company name is required'; end if;
  settings:=public.invoice_company_fields(p_settings)||jsonb_build_object(
    'companyName',trim(p_settings->>'companyName'),'savedAt',now(),
    'showLogo',coalesce((p_settings->>'showLogo')::boolean,true));
  logo:=nullif(settings->>'logoPath','');
  if logo is not null then
    if logo !~ '^logos/[a-f0-9-]{36}\.(png|jpg)$'
       or not exists(select 1 from storage.objects where bucket_id='invoice-branding' and name=logo) then
      raise exception 'Upload a valid invoice logo before saving';
    end if;
  end if;
  perform set_config('ukow.invoice_settings_write','on',true);
  update public.app_store set data=jsonb_set(data,'{invoiceSettings}',settings),updated_at=now() where id='main';
  if not found then raise exception 'Saved portal data is unavailable'; end if;
  perform set_config('ukow.invoice_settings_write','off',true);
  return settings;
end;
$$;

-- Logos are public company branding, NOT booking or incident evidence.
-- Immutable filenames retain logos referenced by older invoices.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('invoice-branding','invoice-branding',true,2097152,array['image/png','image/jpeg'])
on conflict(id) do update set public=true,file_size_limit=2097152,
  allowed_mime_types=array['image/png','image/jpeg'];

drop policy if exists ukow_invoice_logo_insert on storage.objects;
create policy ukow_invoice_logo_insert on storage.objects for insert to authenticated
with check(bucket_id='invoice-branding' and name ~ '^logos/[a-f0-9-]{36}\.(png|jpg)$'
  and exists(select 1 from public.profiles p where p.id=auth.uid()
    and lower(p.status)='active' and p.role in ('admin','staff'))
  and (public.is_portal_admin() or public.has_portal_permission('accounts:manage')));
-- No update/delete grant: replacing a logo must not break historic invoices.

revoke all on function public.invoice_company_fields(jsonb) from public,anon,authenticated;
revoke all on function public.get_invoice_company_settings(text) from public,anon;
revoke all on function public.save_invoice_company_settings(jsonb) from public,anon;
grant execute on function public.get_invoice_company_settings(text) to authenticated;
grant execute on function public.save_invoice_company_settings(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
