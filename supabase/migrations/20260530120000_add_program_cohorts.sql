alter table public.programs
  add column if not exists delivery_mode text not null default 'fixed_date',
  add column if not exists content_starts_on date,
  add column if not exists content_ends_on date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_delivery_mode_check'
      and conrelid = 'public.programs'::regclass
  ) then
    alter table public.programs
      add constraint programs_delivery_mode_check
      check (delivery_mode in ('fixed_date', 'cohort_based'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_cohort_content_dates_check'
      and conrelid = 'public.programs'::regclass
  ) then
    alter table public.programs
      add constraint programs_cohort_content_dates_check
      check (
        delivery_mode <> 'cohort_based'
        or (
          content_starts_on is not null
          and content_ends_on is not null
          and content_starts_on <= content_ends_on
        )
      );
  end if;
end $$;

create table if not exists public.program_cohorts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  starts_on date not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_cohorts_name_not_empty check (length(trim(name)) > 0),
  constraint program_cohorts_program_name_unique unique (program_id, name),
  constraint program_cohorts_program_starts_on_unique unique (program_id, starts_on)
);

create unique index if not exists uq_program_cohorts_program_default
on public.program_cohorts(program_id)
where is_default = true;

create index if not exists idx_program_cohorts_tenant_program
on public.program_cohorts(tenant_id, program_id);

alter table public.program_entitlements
  add column if not exists cohort_id uuid references public.program_cohorts(id) on delete restrict;

create index if not exists idx_program_entitlements_cohort_id
on public.program_entitlements(cohort_id);

create or replace function public.validate_program_cohort_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.programs p
    where p.id = new.program_id
      and p.tenant_id = new.tenant_id
  ) then
    raise exception 'program_cohorts tenant_id must match program tenant_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_program_cohorts_validate_tenant on public.program_cohorts;
create trigger trg_program_cohorts_validate_tenant
before insert or update on public.program_cohorts
for each row
execute function public.validate_program_cohort_tenant();

create or replace function public.validate_program_entitlement_cohort()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.cohort_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.program_cohorts pc
    where pc.id = new.cohort_id
      and pc.tenant_id = new.tenant_id
      and pc.program_id = new.program_id
  ) then
    raise exception 'program_entitlements cohort_id must match tenant_id and program_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_program_entitlements_validate_cohort on public.program_entitlements;
create trigger trg_program_entitlements_validate_cohort
before insert or update on public.program_entitlements
for each row
execute function public.validate_program_entitlement_cohort();

drop trigger if exists trg_program_cohorts_updated_at on public.program_cohorts;
create trigger trg_program_cohorts_updated_at
before update on public.program_cohorts
for each row
execute function public.touch_program_store_updated_at();

alter table public.program_cohorts enable row level security;

drop policy if exists "Tenant members can read program cohorts" on public.program_cohorts;
create policy "Tenant members can read program cohorts"
on public.program_cohorts
for select
to authenticated
using (
  public.is_tenant_content_manager(tenant_id)
  or exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = program_cohorts.tenant_id
      and tm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.program_products pp
    where pp.tenant_id = program_cohorts.tenant_id
      and pp.program_id = program_cohorts.program_id
      and pp.is_active = true
  )
);

drop policy if exists "Tenant managers can manage program cohorts" on public.program_cohorts;
create policy "Tenant managers can manage program cohorts"
on public.program_cohorts
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

update public.programs
set delivery_mode = 'fixed_date'
where delivery_mode is null;

do $$
declare
  target_tenant_id uuid;
  target_program_id uuid;
begin
  select t.id
  into target_tenant_id
  from public.tenants t
  where lower(t.slug) in ('xon', 'xon-training')
     or lower(t.name) in ('xon', 'xontraining')
  limit 1;

  if target_tenant_id is not null then
    select p.id
    into target_program_id
    from public.programs p
    where p.tenant_id = target_tenant_id
      and (
        p.title ilike '%선전10주%'
        or p.slogan ilike '%선전10주%'
        or p.title ilike '%shenzhen%'
        or p.slogan ilike '%shenzhen%'
      )
    order by p.created_at asc
    limit 1;

    if target_program_id is not null then
      update public.program_cohorts
      set is_default = false
      where program_id = target_program_id;

      update public.programs
      set
        delivery_mode = 'cohort_based',
        content_starts_on = '2026-06-02',
        content_ends_on = coalesce(content_ends_on, end_date)
      where id = target_program_id;

      insert into public.program_cohorts (tenant_id, program_id, name, starts_on, is_default)
      values
        (target_tenant_id, target_program_id, '1기', '2026-06-02', true),
        (target_tenant_id, target_program_id, '2기', '2026-06-16', false)
      on conflict (program_id, name) do update
      set
        starts_on = excluded.starts_on,
        is_default = excluded.is_default;
    end if;
  end if;
end $$;
