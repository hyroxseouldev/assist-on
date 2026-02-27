alter table if exists public.programs
  add column if not exists title text not null default '';

update public.programs
set title = coalesce(nullif(trim(slogan), ''), nullif(trim(team_name), ''), '프로그램')
where coalesce(trim(title), '') = '';

create table if not exists public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  team_name text not null default '',
  logo_url text not null default '',
  slogan text not null default '',
  description text not null default '',
  coach_name text not null default '',
  coach_instagram text not null default '',
  coach_career jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_tenant_branding_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tenant_branding_updated_at on public.tenant_branding;
create trigger trg_tenant_branding_updated_at
before update on public.tenant_branding
for each row
execute function public.touch_tenant_branding_updated_at();

insert into public.tenant_branding (
  tenant_id,
  team_name,
  logo_url,
  slogan,
  description,
  coach_name,
  coach_instagram,
  coach_career
)
select distinct on (p.tenant_id)
  p.tenant_id,
  p.team_name,
  p.logo_url,
  p.slogan,
  p.description,
  p.coach_name,
  p.coach_instagram,
  coalesce(p.coach_career, '[]'::jsonb)
from public.programs p
where p.tenant_id is not null
order by p.tenant_id, p.created_at asc
on conflict (tenant_id) do nothing;

insert into public.tenant_branding (tenant_id)
select t.id
from public.tenants t
where not exists (
  select 1
  from public.tenant_branding tb
  where tb.tenant_id = t.id
);

alter table public.tenant_branding enable row level security;

drop policy if exists "Tenant members can read tenant branding" on public.tenant_branding;
create policy "Tenant members can read tenant branding"
on public.tenant_branding
for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_branding.tenant_id
      and tm.user_id = auth.uid()
  )
  or public.is_tenant_content_manager(tenant_branding.tenant_id)
);

drop policy if exists "Tenant managers can manage tenant branding" on public.tenant_branding;
create policy "Tenant managers can manage tenant branding"
on public.tenant_branding
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
