update public.profiles
set platform_role = 'user'
where platform_role is null;

alter table public.profiles
alter column platform_role set default 'user';

alter table public.profiles
alter column platform_role set not null;

alter table public.profiles
drop constraint if exists profiles_platform_role_check;

alter table public.profiles
add constraint profiles_platform_role_check
check (platform_role in ('user', 'admin'));
