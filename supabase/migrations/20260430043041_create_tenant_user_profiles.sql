create table if not exists public.tenant_user_profiles (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  gender text,
  tenant_status text not null default 'active',
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  constraint tenant_user_profiles_gender_check check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  constraint tenant_user_profiles_status_check check (tenant_status in ('active', 'deactivated')),
  constraint tenant_user_profiles_deactivated_check check (
    (tenant_status = 'active' and deactivated_at is null)
    or (tenant_status = 'deactivated' and deactivated_at is not null)
  )
);

create index if not exists idx_tenant_user_profiles_status on public.tenant_user_profiles(tenant_id, tenant_status);
create index if not exists idx_tenant_user_profiles_user_id on public.tenant_user_profiles(user_id);

create or replace function public.touch_tenant_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tenant_user_profiles_updated_at on public.tenant_user_profiles;
create trigger trg_tenant_user_profiles_updated_at
before update on public.tenant_user_profiles
for each row
execute function public.touch_tenant_user_profiles_updated_at();

alter table public.tenant_user_profiles enable row level security;

drop policy if exists "Tenant members can read tenant user profiles" on public.tenant_user_profiles;
create policy "Tenant members can read tenant user profiles"
on public.tenant_user_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_user_profiles.tenant_id
      and tm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.program_entitlements pe
    where pe.tenant_id = tenant_user_profiles.tenant_id
      and pe.user_id = auth.uid()
      and pe.is_active = true
      and (pe.ends_at is null or pe.ends_at >= now())
  )
  or tenant_user_profiles.user_id = auth.uid()
  or public.is_tenant_content_manager(tenant_user_profiles.tenant_id)
);

drop policy if exists "Users can manage own tenant user profile" on public.tenant_user_profiles;
create policy "Users can manage own tenant user profile"
on public.tenant_user_profiles
for all
to authenticated
using (
  tenant_user_profiles.user_id = auth.uid()
  and (
    exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = tenant_user_profiles.tenant_id
        and tm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.program_entitlements pe
      where pe.tenant_id = tenant_user_profiles.tenant_id
        and pe.user_id = auth.uid()
        and pe.is_active = true
        and (pe.ends_at is null or pe.ends_at >= now())
    )
  )
)
with check (
  tenant_user_profiles.user_id = auth.uid()
  and (
    exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = tenant_user_profiles.tenant_id
        and tm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.program_entitlements pe
      where pe.tenant_id = tenant_user_profiles.tenant_id
        and pe.user_id = auth.uid()
        and pe.is_active = true
        and (pe.ends_at is null or pe.ends_at >= now())
    )
  )
);

drop policy if exists "Tenant managers can manage tenant user profiles" on public.tenant_user_profiles;
create policy "Tenant managers can manage tenant user profiles"
on public.tenant_user_profiles
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

with tenant_user_sources as (
  select distinct tenant_id, user_id
  from public.tenant_memberships
  union
  select distinct tenant_id, user_id
  from public.program_entitlements
  union
  select distinct tenant_id, user_id
  from public.user_program_states
  union
  select distinct tenant_id, user_id
  from public.user_workout_records_v2
),
seed_rows as (
  select
    src.tenant_id,
    src.user_id,
    nullif(trim(p.full_name), '') as display_name,
    nullif(trim(p.avatar_url), '') as avatar_url,
    p.gender,
    case when p.account_status = 'deactivated' then 'deactivated' else 'active' end as tenant_status,
    case when p.account_status = 'deactivated' then coalesce(p.deactivated_at, now()) else null end as deactivated_at
  from tenant_user_sources src
  left join public.profiles p on p.id = src.user_id
)
insert into public.tenant_user_profiles (tenant_id, user_id, display_name, avatar_url, gender, tenant_status, deactivated_at)
select tenant_id, user_id, display_name, avatar_url, gender, tenant_status, deactivated_at
from seed_rows
on conflict (tenant_id, user_id) do update
set display_name = coalesce(public.tenant_user_profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.tenant_user_profiles.avatar_url, excluded.avatar_url),
    gender = coalesce(public.tenant_user_profiles.gender, excluded.gender),
    tenant_status = excluded.tenant_status,
    deactivated_at = excluded.deactivated_at;

do $$
declare
  v_xon_tenant_id uuid;
  v_amor_tenant_id uuid;
begin
  select id
  into v_xon_tenant_id
  from public.tenants
  where slug = 'xon-training'
  limit 1;

  select id
  into v_amor_tenant_id
  from public.tenants
  where slug = 'amor'
  limit 1;

  if v_xon_tenant_id is not null then
    insert into public.tenant_user_profiles (tenant_id, user_id, display_name, avatar_url, gender, tenant_status, deactivated_at)
    select
      case
        when u.email = 'amor_jh@clyrtraining.kr' and v_amor_tenant_id is not null then v_amor_tenant_id
        else v_xon_tenant_id
      end as tenant_id,
      u.id,
      nullif(trim(p.full_name), ''),
      nullif(trim(p.avatar_url), ''),
      p.gender,
      case when p.account_status = 'deactivated' then 'deactivated' else 'active' end,
      case when p.account_status = 'deactivated' then coalesce(p.deactivated_at, now()) else null end
    from auth.users u
    left join public.profiles p on p.id = u.id
    where not exists (
      select 1
      from public.tenant_user_profiles tup
      where tup.user_id = u.id
    )
    on conflict (tenant_id, user_id) do nothing;
  end if;
end;
$$;
