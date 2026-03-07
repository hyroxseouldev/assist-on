alter table if exists public.profiles
add column if not exists account_status text;

alter table if exists public.profiles
add column if not exists deactivated_at timestamptz;

update public.profiles
set account_status = 'active'
where account_status is null;

alter table if exists public.profiles
alter column account_status set default 'active';

alter table if exists public.profiles
alter column account_status set not null;

alter table if exists public.profiles
drop constraint if exists profiles_account_status_check;

alter table if exists public.profiles
add constraint profiles_account_status_check
check (account_status in ('active', 'deactivated'));
