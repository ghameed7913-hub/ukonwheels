-- Private vehicle-trading ledger. Existing bookings, expenses and payslips are unchanged.
begin;
create table if not exists public.vehicle_trades(
  id uuid primary key,
  payload jsonb not null,
  version integer not null default 1 check(version>0),
  last_mutation_id uuid not null,
  last_mutation_hash text not null,
  created_by uuid not null,
  last_modified_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function public.vehicle_trade_access(manage boolean default false)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active'
   and role in ('admin','staff')) and
   (public.is_portal_admin() or public.has_portal_permission('accounts:manage')
     or (not manage and public.has_portal_permission('accounts:view')))
$$;
alter table public.vehicle_trades enable row level security;
drop policy if exists vehicle_trades_read on public.vehicle_trades;
create policy vehicle_trades_read on public.vehicle_trades for select to authenticated
using(public.vehicle_trade_access(false));
revoke all on public.vehicle_trades from public,anon,authenticated;
grant select on public.vehicle_trades to authenticated;

create or replace function public.read_vehicle_trades()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare rows jsonb;
begin
 if not public.vehicle_trade_access(false) then
   raise exception 'Accounts access required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(payload||jsonb_build_object('id',id,'version',version,
   'createdAt',created_at,'updatedAt',updated_at) order by created_at desc,id),'[]') into rows
 from public.vehicle_trades;
 return jsonb_build_object('trades',rows,'canManage',public.vehicle_trade_access(true));
end $$;

create or replace function public.save_vehicle_trade(
 p_id uuid,p_expected_version integer,p_mutation_id uuid,p_trade jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_row public.vehicle_trades; saved public.vehicle_trades; canonical jsonb;
 bought date; source_kind text; seller text; reg text; make_name text; model_name text;
 key text; amount numeric; cost numeric:=0; sale numeric:=null; miles numeric;
 fingerprint text; day_name text;
begin
 if not public.vehicle_trade_access(true) then
   raise exception 'Accounts management access required' using errcode='42501';
 end if;
 if p_id is null or p_mutation_id is null or p_expected_version is null or p_expected_version<0
   or jsonb_typeof(p_trade) is distinct from 'object' then
   raise exception 'A vehicle, version and save identifier are required' using errcode='22023';
 end if;
 if coalesce(p_trade->>'purchaseDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
   raise exception 'Enter a valid purchase date' using errcode='22023';
 end if;
 begin bought:=(p_trade->>'purchaseDate')::date;
 exception when others then raise exception 'Enter a valid purchase date' using errcode='22023';end;
 if to_char(bought,'YYYY-MM-DD')<>p_trade->>'purchaseDate' then
   raise exception 'Enter a valid purchase date' using errcode='22023';
 end if;
 source_kind:=p_trade->>'purchaseSource';
 seller:=trim(coalesce(p_trade->>'sellerName',''));
 reg:=upper(trim(coalesce(p_trade->>'registration','')));
 make_name:=trim(coalesce(p_trade->>'make',''));model_name:=trim(coalesce(p_trade->>'model',''));
 if source_kind is null or source_kind not in ('private','auction') or seller='' or length(seller)>300
   or reg !~ '^[A-Z0-9][A-Z0-9 -]{0,19}$' or make_name='' or length(make_name)>120
   or model_name='' or length(model_name)>120 then
   raise exception 'Complete the seller name, registration, make and model' using errcode='22023';
 end if;
 foreach key in array array['sellerName','registration','make','model'] loop
   if jsonb_typeof(p_trade->key) is distinct from 'string' then
     raise exception '% must be text',key using errcode='22023';
   end if;
 end loop;
 if jsonb_typeof(p_trade->'mileage') is distinct from 'number' then
   raise exception 'Enter the mileage as a whole number' using errcode='22023';
 end if;
 miles:=(p_trade->>'mileage')::numeric;
 if miles<0 or miles>1000000000 or miles<>trunc(miles) then
   raise exception 'Enter a valid whole-number mileage' using errcode='22023';
 end if;
 if coalesce(p_trade->>'serviceHistory','') not in ('Full','Partial','None','Unknown')
   or coalesce(p_trade->>'logBook','') not in ('Yes','No','Awaiting') then
   raise exception 'Choose service history and log book status' using errcode='22023';
 end if;
 canonical:=jsonb_build_object('purchaseDate',bought,'purchaseSource',source_kind,
   'sellerName',seller,'registration',reg,'make',make_name,'model',model_name,
   'mileage',miles,'serviceHistory',p_trade->>'serviceHistory','logBook',p_trade->>'logBook');
 foreach key in array array['purchaseAmount','fuel','motCharges','roadTax','auctionCharges'] loop
   if jsonb_typeof(p_trade->key) is distinct from 'number' then
     raise exception '% must be a valid amount',key using errcode='22023';
   end if;
   amount:=(p_trade->>key)::numeric;
   if amount<0 or amount>999999999.99 or amount<>round(amount,2)
     or (key='purchaseAmount' and amount=0) then
     raise exception 'Enter valid costs with no more than two decimal places' using errcode='22023';
   end if;
   cost:=cost+amount;canonical:=canonical||jsonb_build_object(key,round(amount,2));
 end loop;
 if cost>999999999.99 then raise exception 'Total cost is too large' using errcode='22023';end if;
 if p_trade ? 'soldFor' and jsonb_typeof(p_trade->'soldFor')<>'null' then
   if jsonb_typeof(p_trade->'soldFor') is distinct from 'number' then
     raise exception 'Sold for must be a valid amount or left blank' using errcode='22023';
   end if;
   sale:=(p_trade->>'soldFor')::numeric;
   if sale<0 or sale>999999999.99 or sale<>round(sale,2) then
     raise exception 'Enter a valid sold price with no more than two decimal places' using errcode='22023';
   end if;
 end if;
 day_name:=(array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[extract(dow from bought)::int+1];
 canonical:=canonical||jsonb_build_object('soldFor',sale,'totalCost',round(cost,2),
   'profit',case when sale is not null then round(sale-cost,2) end,'day',day_name);
 fingerprint:=encode(sha256(convert_to(canonical::text,'UTF8')),'hex');
 -- Serialize both first-create retries and later updates for this vehicle.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into current_row from public.vehicle_trades where id=p_id for update;
 if current_row.id is not null and current_row.last_mutation_id=p_mutation_id then
   if current_row.last_modified_by<>auth.uid() or current_row.last_mutation_hash<>fingerprint then
     raise exception 'This save identifier was already used with different details' using errcode='22023';
   end if;
   saved:=current_row;
 else
   if (current_row.id is null and p_expected_version<>0)
     or (current_row.id is not null and current_row.version<>p_expected_version) then
     raise exception 'This vehicle changed since you opened it. Reload its latest details before saving' using errcode='40001';
   end if;
   if current_row.id is null then
     insert into public.vehicle_trades(id,payload,last_mutation_id,last_mutation_hash,created_by,last_modified_by)
       values(p_id,canonical,p_mutation_id,fingerprint,auth.uid(),auth.uid()) returning * into saved;
   else
     update public.vehicle_trades set payload=canonical,version=version+1,last_mutation_id=p_mutation_id,
       last_mutation_hash=fingerprint,last_modified_by=auth.uid(),updated_at=now()
       where id=p_id returning * into saved;
   end if;
 end if;
 return jsonb_build_object('trade',saved.payload||jsonb_build_object('id',saved.id,'version',saved.version,
   'createdAt',saved.created_at,'updatedAt',saved.updated_at),'canManage',true);
end $$;
revoke all on function public.vehicle_trade_access(boolean) from public,anon;
grant execute on function public.vehicle_trade_access(boolean) to authenticated;
revoke all on function public.read_vehicle_trades() from public,anon;
grant execute on function public.read_vehicle_trades() to authenticated;
revoke all on function public.save_vehicle_trade(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function public.save_vehicle_trade(uuid,integer,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
