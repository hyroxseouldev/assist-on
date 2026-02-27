create table if not exists public.user_program_states (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active_program_id uuid not null references public.programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists idx_user_program_states_user_id on public.user_program_states(user_id);
create index if not exists idx_user_program_states_program_id on public.user_program_states(active_program_id);

drop trigger if exists trg_user_program_states_updated_at on public.user_program_states;
create trigger trg_user_program_states_updated_at
before update on public.user_program_states
for each row
execute function public.touch_program_store_updated_at();

alter table public.user_program_states enable row level security;

drop policy if exists "Users can read own program state" on public.user_program_states;
create policy "Users can read own program state"
on public.user_program_states
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tenant_content_manager(tenant_id)
);

drop policy if exists "Users can manage own program state" on public.user_program_states;
create policy "Users can manage own program state"
on public.user_program_states
for all
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.programs p
    where p.id = active_program_id
      and p.tenant_id = user_program_states.tenant_id
  )
);

drop policy if exists "Tenant managers can manage program states" on public.user_program_states;
create policy "Tenant managers can manage program states"
on public.user_program_states
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
