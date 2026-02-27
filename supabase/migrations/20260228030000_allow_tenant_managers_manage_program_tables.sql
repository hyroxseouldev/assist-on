drop policy if exists "Tenant managers can manage programs" on public.programs;
create policy "Tenant managers can manage programs"
on public.programs
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Tenant managers can manage sessions" on public.sessions;
create policy "Tenant managers can manage sessions"
on public.sessions
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Tenant managers can manage about_content" on public.about_content;
create policy "Tenant managers can manage about_content"
on public.about_content
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
