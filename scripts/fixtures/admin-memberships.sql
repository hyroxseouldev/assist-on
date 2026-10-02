-- Minimal schema contract for the isolated PostgreSQL regression database.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create table auth.users (
  id uuid primary key, email text, raw_user_meta_data jsonb default '{}',
  email_confirmed_at timestamptz, invited_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz default now()
);
create table public.tenants (id uuid primary key);
create table public.profiles (id uuid primary key references auth.users, platform_role text);
create type public.tenant_membership_role as enum ('owner','manager','coach','member');
create table public.tenant_memberships (tenant_id uuid references public.tenants, user_id uuid references auth.users, role public.tenant_membership_role, primary key(tenant_id, user_id));
create table public.tenant_user_profiles (
  tenant_id uuid references public.tenants, user_id uuid references auth.users, display_name text, phone_number text, avatar_url text,
  gender text, tenant_status text default 'active', deactivated_at timestamptz, hyrox_profile jsonb, primary key(tenant_id, user_id)
);
create table public.programs (id uuid primary key, tenant_id uuid references public.tenants, title text);
create table public.program_cohorts (id uuid primary key, tenant_id uuid references public.tenants, name text, starts_on date);
create table public.program_entitlements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid references public.tenants, user_id uuid references auth.users,
  program_id uuid references public.programs, cohort_id uuid references public.program_cohorts,
  starts_at timestamptz not null, ends_at timestamptz, is_active boolean not null default true, created_at timestamptz default now()
);
create table public.user_program_states (
  tenant_id uuid references public.tenants, user_id uuid references auth.users,
  active_program_id uuid not null references public.programs, primary key(tenant_id, user_id)
);
create table public.user_workout_records_v2 (tenant_id uuid, user_id uuid);
create table public.program_entitlement_change_history (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, user_id uuid, from_program_id uuid, to_program_id uuid,
  changed_by uuid, previous_ends_at timestamptz, next_starts_at timestamptz, next_ends_at timestamptz, created_at timestamptz default now()
);
create function public.is_admin(uid uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id=uid and platform_role='admin');
$$;
grant usage on schema public, auth to service_role;
grant all on all tables in schema public to service_role;
create unique index uq_program_entitlements_active on public.program_entitlements(tenant_id,user_id,program_id) where is_active;
