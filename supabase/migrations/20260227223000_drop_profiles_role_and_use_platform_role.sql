create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.platform_role = 'admin'
  );
$$;

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

  insert into public.profiles (id, full_name, platform_role)
  values (new.id, v_full_name, 'user')
  on conflict (id) do update
  set
    full_name = coalesce(nullif(trim(public.profiles.full_name), ''), excluded.full_name),
    platform_role = coalesce(public.profiles.platform_role, 'user');

  return new;
end;
$$;

alter table public.profiles drop column if exists role;
