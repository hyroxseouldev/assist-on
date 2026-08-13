create or replace function public.normalize_phone_digits(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

create table if not exists public.entitlement_auto_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  full_name text not null,
  phone_number text not null,
  phone_number_digits text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  granted_by uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  matched_user_id uuid null references auth.users(id) on delete set null,
  matched_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlement_auto_grants_phone_digits_check check (length(phone_number_digits) > 0),
  constraint entitlement_auto_grants_period_check check (starts_at <= ends_at),
  constraint entitlement_auto_grants_tenant_phone_program_unique unique (tenant_id, phone_number_digits, program_id)
);

create index if not exists idx_entitlement_auto_grants_lookup
on public.entitlement_auto_grants(tenant_id, phone_number_digits, is_active);

create index if not exists idx_entitlement_auto_grants_program
on public.entitlement_auto_grants(program_id);

drop trigger if exists trg_entitlement_auto_grants_updated_at on public.entitlement_auto_grants;
create trigger trg_entitlement_auto_grants_updated_at
before update on public.entitlement_auto_grants
for each row
execute function public.touch_program_store_updated_at();

alter table public.entitlement_auto_grants enable row level security;

drop policy if exists "Tenant managers can read entitlement auto grants" on public.entitlement_auto_grants;
create policy "Tenant managers can read entitlement auto grants"
on public.entitlement_auto_grants
for select
to authenticated
using (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Tenant managers can manage entitlement auto grants" on public.entitlement_auto_grants;
create policy "Tenant managers can manage entitlement auto grants"
on public.entitlement_auto_grants
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

create or replace function public.apply_entitlement_auto_grants_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone_digits text;
  v_grant public.entitlement_auto_grants%rowtype;
  v_existing_entitlement_id uuid;
begin
  v_phone_digits := public.normalize_phone_digits(new.phone_number);

  if v_phone_digits = '' then
    return new;
  end if;

  for v_grant in
    select *
    from public.entitlement_auto_grants
    where tenant_id = new.tenant_id
      and phone_number_digits = v_phone_digits
      and is_active = true
  loop
    insert into public.tenant_memberships (tenant_id, user_id, role)
    values (new.tenant_id, new.user_id, 'member')
    on conflict (tenant_id, user_id) do nothing;

    select pe.id
    into v_existing_entitlement_id
    from public.program_entitlements pe
    where pe.tenant_id = new.tenant_id
      and pe.user_id = new.user_id
      and pe.program_id = v_grant.program_id
      and pe.is_active = true
      and (pe.ends_at is null or pe.ends_at >= now())
    order by pe.created_at desc
    limit 1;

    if v_existing_entitlement_id is null then
      insert into public.program_entitlements (
        tenant_id,
        user_id,
        program_id,
        source_order_id,
        source_invitation_id,
        source_granted_by,
        starts_at,
        ends_at,
        is_active
      )
      values (
        new.tenant_id,
        new.user_id,
        v_grant.program_id,
        null,
        null,
        v_grant.granted_by,
        v_grant.starts_at,
        v_grant.ends_at,
        true
      );
    end if;

    insert into public.user_program_states (tenant_id, user_id, active_program_id)
    values (new.tenant_id, new.user_id, v_grant.program_id)
    on conflict (tenant_id, user_id) do update
    set active_program_id = excluded.active_program_id;

    update public.entitlement_auto_grants
    set
      matched_user_id = new.user_id,
      matched_at = coalesce(matched_at, now())
    where id = v_grant.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_tenant_user_profiles_apply_entitlement_auto_grants on public.tenant_user_profiles;
create trigger trg_tenant_user_profiles_apply_entitlement_auto_grants
after insert or update of phone_number
on public.tenant_user_profiles
for each row
execute function public.apply_entitlement_auto_grants_for_profile();

with
  target_tenant as (
    select id
    from public.tenants
    where slug = 'xon-training'
    limit 1
  ),
  target_program as (
    select p.id
    from public.programs p
    join target_tenant t on t.id = p.tenant_id
    where p.title = 'XON DANGSAN | 12주 HYROX 프로그램'
    limit 1
  ),
  grantor as (
    select tm.user_id
    from public.tenant_memberships tm
    join target_tenant t on t.id = tm.tenant_id
    where tm.role = 'owner'
    order by tm.created_at asc
    limit 1
  ),
  applicants(full_name, phone_number) as (
    values
      ('정다정', '010-4074-9998'),
      ('정수진', '010-2299-5332'),
      ('임민재', '010-5469-2727'),
      ('서한나', '010-3542-5892'),
      ('노경민', '010-8256-5580'),
      ('신주용', '010-3091-7607'),
      ('이수진', '010-2779-1927'),
      ('노시형', '010-5892-1308'),
      ('황미경', '010-9289-7619'),
      ('박지현', '010-9966-4453'),
      ('이한나', '010-4518-9867'),
      ('윤서영', '010-5069-8497'),
      ('최예진', '010-9300-3583'),
      ('김주영', '010-3862-3232'),
      ('김지영', '010-2042-4832'),
      ('장현주', '010-2270-6662'),
      ('이정화', '010-9237-5759'),
      ('장은지', '010-4069-1006'),
      ('맹현민', '010-9793-2090'),
      ('조동준', '010-8983-1462'),
      ('정한정', '010-2857-4728'),
      ('송선민', '010-8374-8853'),
      ('선종수', '010-8321-3735'),
      ('오성훈', '010-6629-1381')
  )
insert into public.entitlement_auto_grants (
  tenant_id,
  program_id,
  full_name,
  phone_number,
  phone_number_digits,
  starts_at,
  ends_at,
  granted_by,
  is_active
)
select
  t.id,
  p.id,
  a.full_name,
  a.phone_number,
  public.normalize_phone_digits(a.phone_number),
  '2026-08-16 15:00:00+00'::timestamptz,
  '2026-11-15 14:59:59.999+00'::timestamptz,
  g.user_id,
  true
from applicants a
cross join target_tenant t
cross join target_program p
cross join grantor g
on conflict (tenant_id, phone_number_digits, program_id) do update
set
  full_name = excluded.full_name,
  phone_number = excluded.phone_number,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  granted_by = excluded.granted_by,
  is_active = true;

update public.tenant_user_profiles tup
set phone_number = tup.phone_number
from public.entitlement_auto_grants eag
where tup.tenant_id = eag.tenant_id
  and public.normalize_phone_digits(tup.phone_number) = eag.phone_number_digits
  and eag.is_active = true;
