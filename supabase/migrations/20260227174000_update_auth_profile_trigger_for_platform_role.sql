alter table if exists public.profiles
add column if not exists platform_role text;

update public.profiles
set platform_role = case when role = 'admin' then 'admin' else 'user' end
where platform_role is null;

alter table if exists public.profiles
alter column platform_role set default 'user';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Member'
  );

  insert into public.profiles (id, full_name, role, platform_role)
  values (new.id, v_full_name, 'user', 'user')
  on conflict (id) do update
  set
    full_name = coalesce(nullif(trim(public.profiles.full_name), ''), excluded.full_name),
    platform_role = coalesce(public.profiles.platform_role, 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
