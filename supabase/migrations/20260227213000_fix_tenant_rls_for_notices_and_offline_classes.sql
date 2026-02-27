create or replace function public.is_tenant_content_manager(p_tenant_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    is_admin(p_user_id)
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = p_user_id
        and tm.role in ('owner', 'coach')
    );
$$;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.notices n
set tenant_id = bt.id
from base_tenant bt
where n.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.offline_classes c
set tenant_id = bt.id
from base_tenant bt
where c.tenant_id is null;

update public.offline_class_registrations r
set tenant_id = c.tenant_id
from public.offline_classes c
where r.class_id = c.id
  and r.tenant_id is null;

alter table public.notices alter column tenant_id set not null;
alter table public.offline_classes alter column tenant_id set not null;
alter table public.offline_class_registrations alter column tenant_id set not null;

drop policy if exists "Authenticated can read published notices" on public.notices;
create policy "Tenant members can read published notices"
on public.notices
for select
to authenticated
using (
  (
    is_published = true
    and exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = notices.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  or public.is_tenant_content_manager(notices.tenant_id)
);

drop policy if exists "Admins can manage notices" on public.notices;
create policy "Tenant managers can manage notices"
on public.notices
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Authenticated can read published offline classes" on public.offline_classes;
create policy "Tenant members can read published offline classes"
on public.offline_classes
for select
to authenticated
using (
  (
    is_published = true
    and exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = offline_classes.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  or public.is_tenant_content_manager(offline_classes.tenant_id)
);

drop policy if exists "Admins can manage offline classes" on public.offline_classes;
create policy "Tenant managers can manage offline classes"
on public.offline_classes
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Authenticated can read published class participants" on public.offline_class_registrations;
create policy "Tenant members can read published class participants"
on public.offline_class_registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.offline_classes c
    join public.tenant_memberships tm on tm.tenant_id = c.tenant_id
    where c.id = offline_class_registrations.class_id
      and c.is_published = true
      and tm.user_id = auth.uid()
      and tm.tenant_id = offline_class_registrations.tenant_id
  )
  or public.is_tenant_content_manager(offline_class_registrations.tenant_id)
);

drop policy if exists "Admins can manage class participants" on public.offline_class_registrations;
create policy "Tenant managers can manage class participants"
on public.offline_class_registrations
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
