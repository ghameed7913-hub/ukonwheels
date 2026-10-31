-- Run after staff-simple-sheet.sql. Display roles only; no payroll/access changes.
begin;
create or replace function public.read_staff_pay_roster()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not public.staff_daily_access(false) then
   raise exception 'Accounts or HR access required' using errcode='42501';
 end if;
 with candidates as (
   select p.id::text id,coalesce(nullif(p.full_name,''),nullif(p.name,''),p.email) name,
     lower(trim(p.email)) email,p.role,'User'::text source,1 priority,p.staff_role,
     (coalesce(p.permissions,'[]'::jsonb) ?| array['hr','hr:view','hr:manage','portal:hr']
       or exists(select 1 from public.user_permissions u where u.profile_id=p.id
         and u.permission_key in ('hr:view','hr:manage','portal:hr'))) hr_access
   from public.profiles p
   where p.role in ('admin','staff','driver') and lower(coalesce(p.status,''))<>'deleted'
   union all
   select coalesce(u->>'id','user-'||lower(u->>'email')),
     coalesce(nullif(u->>'name',''),concat_ws(' ',u->>'firstName',u->>'lastName')),
     lower(trim(u->>'email')),coalesce(u->>'role','Staff'),'Create User',2,
     coalesce(u->>'staffRole',u->>'staff_role'),
     coalesce(u->'permissions','[]'::jsonb) ?| array['hr','hr:view','hr:manage','portal:hr']
   from public.app_store s cross join lateral jsonb_array_elements(coalesce(s.data->'staffUsers','[]')) u
   where s.id='main' and lower(coalesce(u->>'role',''))<>'client'
     and lower(coalesce(u->>'status',''))<>'deleted'
   union all
   select h.id::text,concat_ws(' ',h.data->>'firstName',nullif(h.data->>'middleName',''),h.data->>'lastName'),
     lower(trim(coalesce(p.email,h.data->>'email'))),coalesce(p.role,'staff'),'HR',3,p.staff_role,
     (coalesce(p.permissions,'[]'::jsonb) ?| array['hr','hr:view','hr:manage','portal:hr']
       or exists(select 1 from public.user_permissions u where u.profile_id=p.id
         and u.permission_key in ('hr:view','hr:manage','portal:hr')))
   from public.hr_employee_records h
   left join lateral (
     select x.* from public.profiles x
     where x.id::text=h.data->>'portalUserId'
       or lower(x.email)=lower(h.data->>'email')
     order by (x.id::text=h.data->>'portalUserId') desc nulls last,x.id limit 1
   ) p on true
 ), ranked as (
   select *,row_number() over(
     partition by coalesce(nullif(email,''),'id:'||id) order by priority,id
   ) n from candidates where nullif(trim(name),'') is not null
 ), labeled as (
   select *,case
     when lower(role) in ('admin','super admin','super_admin') then 'Admin'
     when lower(role)='driver' then 'Driver'
     when lower(role) in ('unassigned','not assigned') or lower(coalesce(staff_role,''))='unassigned' then 'Unassigned'
     when lower(role) in ('hr','human resources')
       or lower(trim(coalesce(staff_role,''))) in ('hr','human resources') then 'HR'
     when nullif(trim(staff_role),'') is not null and lower(trim(staff_role))<>'staff' then trim(staff_role)
     when hr_access then 'HR'
     when lower(role)='staff' then 'Other Staff'
     else role end role_label
   from ranked where n=1
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',id,'name',name,'email',coalesce(email,''),'role',role,
   'roleLabel',role_label,'source',source
 ) order by lower(name)),'[]') into result from labeled;
 return jsonb_build_object('employees',result);
end $$;
revoke all on function public.read_staff_pay_roster() from public,anon;
grant execute on function public.read_staff_pay_roster() to authenticated;
notify pgrst,'reload schema';
commit;
