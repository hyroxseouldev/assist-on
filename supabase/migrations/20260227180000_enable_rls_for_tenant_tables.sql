create or replace function public.is_tenant_owner(p_tenant_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = p_user_id
      and tm.role = 'owner'
  );
$$;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_invitations enable row level security;

drop policy if exists "Authenticated can read tenants" on public.tenants;
create policy "Authenticated can read tenants"
on public.tenants
for select
to authenticated
using (true);

drop policy if exists "Platform admins can manage tenants" on public.tenants;
create policy "Platform admins can manage tenants"
on public.tenants
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "Users can read own tenant memberships" on public.tenant_memberships;
create policy "Users can read own tenant memberships"
on public.tenant_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or is_admin(auth.uid())
  or public.is_tenant_owner(tenant_id)
);

drop policy if exists "Owners can manage tenant memberships" on public.tenant_memberships;
create policy "Owners can manage tenant memberships"
on public.tenant_memberships
for all
to authenticated
using (
  is_admin(auth.uid())
  or public.is_tenant_owner(tenant_id)
)
with check (
  is_admin(auth.uid())
  or public.is_tenant_owner(tenant_id)
);

drop policy if exists "Owners can manage tenant invitations" on public.tenant_invitations;
create policy "Owners can manage tenant invitations"
on public.tenant_invitations
for all
to authenticated
using (
  is_admin(auth.uid())
  or public.is_tenant_owner(tenant_id)
)
with check (
  is_admin(auth.uid())
  or public.is_tenant_owner(tenant_id)
);

alter function public.touch_community_updated_at() set search_path = public, pg_temp;
