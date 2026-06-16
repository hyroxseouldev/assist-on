drop policy if exists "Public can read published youtube contents" on public.youtube_contents;
drop policy if exists "Tenant managers can manage youtube contents" on public.youtube_contents;

create policy "Anon can read published youtube contents"
on public.youtube_contents
for select
to anon
using (is_published = true);

create policy "Authenticated can read published or managed youtube contents"
on public.youtube_contents
for select
to authenticated
using (
  is_published = true
  or public.is_tenant_content_manager(tenant_id)
);

create policy "Tenant managers can insert youtube contents"
on public.youtube_contents
for insert
to authenticated
with check (public.is_tenant_content_manager(tenant_id));

create policy "Tenant managers can update youtube contents"
on public.youtube_contents
for update
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

create policy "Tenant managers can delete youtube contents"
on public.youtube_contents
for delete
to authenticated
using (public.is_tenant_content_manager(tenant_id));

create index if not exists idx_youtube_contents_created_by
on public.youtube_contents (created_by)
where created_by is not null;
