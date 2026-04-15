create table if not exists public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  instagram text not null default '',
  introduction text not null default '',
  career jsonb not null default '[]'::jsonb,
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_profiles_tenant_user_unique unique (tenant_id, user_id),
  constraint coach_profiles_career_is_array check (jsonb_typeof(career) = 'array'),
  constraint coach_profiles_membership_fk foreign key (tenant_id, user_id)
    references public.tenant_memberships(tenant_id, user_id) on delete cascade
);

create index if not exists idx_coach_profiles_tenant_id on public.coach_profiles(tenant_id);
create index if not exists idx_coach_profiles_user_id on public.coach_profiles(user_id);
create index if not exists idx_coach_profiles_active_tenant on public.coach_profiles(tenant_id, is_active);

create or replace function public.touch_coach_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_coach_profiles_updated_at on public.coach_profiles;
create trigger trg_coach_profiles_updated_at
before update on public.coach_profiles
for each row
execute function public.touch_coach_profiles_updated_at();

create or replace function public.ensure_coach_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_role public.tenant_membership_role;
begin
  select tm.role
  into v_role
  from public.tenant_memberships tm
  where tm.tenant_id = new.tenant_id
    and tm.user_id = new.user_id;

  if v_role is null then
    raise exception 'Coach profile requires a tenant membership';
  end if;

  if v_role not in ('owner', 'coach') then
    raise exception 'Coach profile can only be created for owner or coach members';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_coach_profiles_ensure_role on public.coach_profiles;
create trigger trg_coach_profiles_ensure_role
before insert or update on public.coach_profiles
for each row
execute function public.ensure_coach_profile_role();

alter table public.coach_profiles enable row level security;

drop policy if exists "Tenant members can read coach profiles" on public.coach_profiles;
create policy "Tenant members can read coach profiles"
on public.coach_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = coach_profiles.tenant_id
      and tm.user_id = auth.uid()
  )
  or public.is_tenant_content_manager(coach_profiles.tenant_id)
);

drop policy if exists "Tenant managers can manage coach profiles" on public.coach_profiles;
create policy "Tenant managers can manage coach profiles"
on public.coach_profiles
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Coach can update own profile" on public.coach_profiles;
create policy "Coach can update own profile"
on public.coach_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.program_coaches (
  program_id uuid not null references public.programs(id) on delete cascade,
  coach_profile_id uuid not null references public.coach_profiles(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (program_id, coach_profile_id)
);

create index if not exists idx_program_coaches_program_id on public.program_coaches(program_id);
create index if not exists idx_program_coaches_coach_profile_id on public.program_coaches(coach_profile_id);
create unique index if not exists uq_program_coaches_primary_per_program
on public.program_coaches(program_id)
where is_primary;

create or replace function public.ensure_program_coach_same_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_program_tenant_id uuid;
  v_coach_tenant_id uuid;
begin
  select p.tenant_id
  into v_program_tenant_id
  from public.programs p
  where p.id = new.program_id;

  select cp.tenant_id
  into v_coach_tenant_id
  from public.coach_profiles cp
  where cp.id = new.coach_profile_id;

  if v_program_tenant_id is null or v_coach_tenant_id is null then
    raise exception 'Program coach assignment requires a valid program and coach profile';
  end if;

  if v_program_tenant_id <> v_coach_tenant_id then
    raise exception 'Program and coach profile must belong to the same tenant';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_program_coaches_same_tenant on public.program_coaches;
create trigger trg_program_coaches_same_tenant
before insert or update on public.program_coaches
for each row
execute function public.ensure_program_coach_same_tenant();

alter table public.program_coaches enable row level security;

drop policy if exists "Tenant members can read program coaches" on public.program_coaches;
create policy "Tenant members can read program coaches"
on public.program_coaches
for select
to authenticated
using (
  exists (
    select 1
    from public.programs p
    where p.id = program_coaches.program_id
      and (
        public.is_tenant_content_manager(p.tenant_id)
        or exists (
          select 1
          from public.tenant_memberships tm
          where tm.tenant_id = p.tenant_id
            and tm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Tenant managers can manage program coaches" on public.program_coaches;
create policy "Tenant managers can manage program coaches"
on public.program_coaches
for all
to authenticated
using (
  exists (
    select 1
    from public.programs p
    where p.id = program_coaches.program_id
      and public.is_tenant_content_manager(p.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.programs p
    where p.id = program_coaches.program_id
      and public.is_tenant_content_manager(p.tenant_id)
  )
);
