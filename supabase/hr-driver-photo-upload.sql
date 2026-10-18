-- Additive: allow HR managers to upload a Driver's portrait, without issuing an ID.
-- Requires driver-company-id.sql. No records or existing files are deleted.
begin;

create or replace function public.driver_portrait_permission(p_path text,p_write boolean)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select (not p_write and public.hr_screening_access(false))
    or exists(
      select 1 from public.profiles p
      where p.role='driver'
        and p_path ~ ('^'||p.id::text||'/[a-f0-9-]{36}\.jpg$')
        and ((p.id=auth.uid() and lower(p.status)='active')
          or (p_write and public.hr_screening_access(true)))
    )
$$;
revoke all on function public.driver_portrait_permission(text,boolean) from public,anon;
grant execute on function public.driver_portrait_permission(text,boolean) to authenticated;

create or replace function public.register_hr_driver_portrait(
  p_user_id uuid,p_path text,p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare previous public.driver_identities;
begin
  if not public.hr_screening_access(true) then
    raise exception 'HR management access required' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and role='driver') then
    raise exception 'Choose an existing Driver account';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('driver-identity:'||p_user_id::text,0));
  if p_path !~ ('^'||p_user_id::text||'/[a-f0-9-]{36}\.jpg$')
    or not exists(
      select 1 from storage.objects
      where bucket_id='driver-portraits' and name=p_path
        and metadata->>'mimetype'='image/jpeg'
        and (metadata->>'size')::bigint between 1 and 2097152
    ) then
    raise exception 'Upload a valid portrait for this Driver first';
  end if;
  select * into previous from public.driver_identities where user_id=p_user_id for update;
  -- An identical retry is safe even if the response to the first save was lost.
  if previous.photo_path=p_path then return public.driver_identity_snapshot(p_user_id); end if;
  if coalesce(previous.version,0) is distinct from p_expected_version then
    raise exception 'This Driver record changed. Refresh before replacing the portrait';
  end if;
  insert into public.driver_identities(user_id,photo_path,photo_updated_at)
    values(p_user_id,p_path,now())
  on conflict(user_id) do update set
    photo_path=excluded.photo_path,photo_updated_at=now(),
    revoked_at=case when driver_identities.card_reference is not null then now() end,
    revoked_by=case when driver_identities.card_reference is not null then auth.uid() end,
    revoke_reason=case when driver_identities.card_reference is not null then 'Portrait changed by HR: reissue required' end,
    version=driver_identities.version+1;
  return public.driver_identity_snapshot(p_user_id);
end $$;

revoke all on function public.register_hr_driver_portrait(uuid,text,integer) from public,anon;
grant execute on function public.register_hr_driver_portrait(uuid,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
