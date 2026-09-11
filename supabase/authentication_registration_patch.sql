-- UK On Wheels public signup profile trigger
-- Paste this into Supabase SQL Editor even if the main production schema
-- has already been run. It is safe to run again.

begin;

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists account_type text default 'private';
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    full_name,
    phone,
    role,
    status,
    account_type,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'phone',
    'client',
    'Active',
    coalesce(new.raw_user_meta_data ->> 'account_type', 'private'),
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ukow on auth.users;
create trigger on_auth_user_created_ukow
  after insert on auth.users
  for each row execute procedure public.handle_new_portal_user();

commit;

-- Supabase Dashboard settings also required:
-- Authentication -> Providers -> Email -> Allow new users to sign up: ON
-- Authentication -> URL Configuration -> Site URL:
-- https://portal.ukonwheels.org
-- Authentication -> URL Configuration -> Redirect URLs:
-- https://portal.ukonwheels.org/