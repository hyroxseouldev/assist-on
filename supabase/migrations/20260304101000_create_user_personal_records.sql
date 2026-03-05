create table if not exists public.user_personal_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  metric_type text not null,
  value_numeric numeric(10, 2),
  value_seconds integer,
  unit text not null,
  recorded_at date not null,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_personal_records_metric_type_check check (metric_type in ('weight', 'reps', 'distance', 'duration')),
  constraint user_personal_records_value_check check (
    (
      metric_type = 'duration'
      and value_seconds is not null
      and value_seconds > 0
      and value_numeric is null
    )
    or (
      metric_type in ('weight', 'reps', 'distance')
      and value_numeric is not null
      and value_numeric > 0
      and value_seconds is null
    )
  )
);

create index if not exists idx_user_personal_records_tenant_user
on public.user_personal_records(tenant_id, user_id);

create index if not exists idx_user_personal_records_recorded_at
on public.user_personal_records(recorded_at desc, created_at desc);

create or replace function public.touch_user_personal_records_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_personal_records_updated_at on public.user_personal_records;
create trigger trg_user_personal_records_updated_at
before update on public.user_personal_records
for each row
execute function public.touch_user_personal_records_updated_at();

alter table public.user_personal_records enable row level security;

drop policy if exists "Users can read own personal records" on public.user_personal_records;
create policy "Users can read own personal records"
on public.user_personal_records
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tenant_content_manager(tenant_id)
);

drop policy if exists "Users can create own personal records" on public.user_personal_records;
create policy "Users can create own personal records"
on public.user_personal_records
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = user_personal_records.tenant_id
        and tm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.program_entitlements pe
      where pe.tenant_id = user_personal_records.tenant_id
        and pe.user_id = auth.uid()
        and pe.is_active = true
        and (pe.ends_at is null or pe.ends_at >= now())
    )
  )
);

drop policy if exists "Users can update own personal records" on public.user_personal_records;
create policy "Users can update own personal records"
on public.user_personal_records
for update
to authenticated
using (user_id = auth.uid() or public.is_tenant_content_manager(tenant_id))
with check (user_id = auth.uid() or public.is_tenant_content_manager(tenant_id));

drop policy if exists "Users can delete own personal records" on public.user_personal_records;
create policy "Users can delete own personal records"
on public.user_personal_records
for delete
to authenticated
using (user_id = auth.uid() or public.is_tenant_content_manager(tenant_id));
