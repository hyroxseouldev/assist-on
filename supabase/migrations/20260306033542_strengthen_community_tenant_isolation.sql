-- Community tenant isolation hardening

-- Backfill tenant_id where possible.
update public.community_posts p
set tenant_id = (
  select tm.tenant_id
  from public.tenant_memberships tm
  where tm.user_id = p.author_id
  order by tm.created_at asc
  limit 1
)
where p.tenant_id is null;

update public.community_comments c
set tenant_id = p.tenant_id
from public.community_posts p
where c.post_id = p.id
  and c.tenant_id is null;

update public.community_post_likes l
set tenant_id = p.tenant_id
from public.community_posts p
where l.post_id = p.id
  and l.tenant_id is null;

update public.community_post_reports r
set tenant_id = p.tenant_id
from public.community_posts p
where r.post_id = p.id
  and r.tenant_id is null;

do $$
begin
  if exists (select 1 from public.community_posts where tenant_id is null) then
    raise exception 'community_posts has rows with null tenant_id';
  end if;

  if exists (select 1 from public.community_comments where tenant_id is null) then
    raise exception 'community_comments has rows with null tenant_id';
  end if;

  if exists (select 1 from public.community_post_likes where tenant_id is null) then
    raise exception 'community_post_likes has rows with null tenant_id';
  end if;

  if exists (select 1 from public.community_post_reports where tenant_id is null) then
    raise exception 'community_post_reports has rows with null tenant_id';
  end if;
end
$$;

alter table public.community_posts
  alter column tenant_id set not null;

alter table public.community_comments
  alter column tenant_id set not null;

alter table public.community_post_likes
  alter column tenant_id set not null;

alter table public.community_post_reports
  alter column tenant_id set not null;

create index if not exists idx_community_comments_tenant_post_created_at
  on public.community_comments (tenant_id, post_id, created_at);

-- Replace community RLS policies with tenant-scoped rules.
drop policy if exists "Authenticated can read published community_posts" on public.community_posts;
drop policy if exists "Authenticated can create own community_posts" on public.community_posts;
drop policy if exists "Author or admin can update community_posts" on public.community_posts;
drop policy if exists "Author or admin can delete community_posts" on public.community_posts;

create policy "Tenant members can read community_posts"
  on public.community_posts
  for select
  to authenticated
  using (
    (
      public.is_tenant_member(tenant_id)
      or public.is_tenant_content_manager(tenant_id, auth.uid())
    )
    and (
      status = 'published'
      or author_id = auth.uid()
      or public.is_tenant_content_manager(tenant_id, auth.uid())
    )
  );

create policy "Tenant members can create own community_posts"
  on public.community_posts
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_tenant_member(tenant_id)
  );

create policy "Author or managers can update community_posts"
  on public.community_posts
  for update
  to authenticated
  using (
    (
      author_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  )
  with check (
    (
      author_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  );

create policy "Author or managers can delete community_posts"
  on public.community_posts
  for delete
  to authenticated
  using (
    (
      author_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  );

drop policy if exists "Authenticated can read published community_comments" on public.community_comments;
drop policy if exists "Authenticated can create own community_comments" on public.community_comments;
drop policy if exists "Author or admin can update community_comments" on public.community_comments;
drop policy if exists "Author or admin can delete community_comments" on public.community_comments;

create policy "Tenant members can read community_comments"
  on public.community_comments
  for select
  to authenticated
  using (
    (
      public.is_tenant_member(tenant_id)
      or public.is_tenant_content_manager(tenant_id, auth.uid())
    )
    and (
      status = 'published'
      or author_id = auth.uid()
      or public.is_tenant_content_manager(tenant_id, auth.uid())
    )
  );

create policy "Tenant members can create own community_comments"
  on public.community_comments
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1
      from public.community_posts p
      where p.id = post_id
        and p.tenant_id = tenant_id
    )
  );

create policy "Author or managers can update community_comments"
  on public.community_comments
  for update
  to authenticated
  using (
    (
      author_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  )
  with check (
    (
      author_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  );

create policy "Author or managers can delete community_comments"
  on public.community_comments
  for delete
  to authenticated
  using (
    (
      author_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  );

drop policy if exists "Authenticated can read community_post_likes" on public.community_post_likes;
drop policy if exists "Authenticated can create own community_post_likes" on public.community_post_likes;
drop policy if exists "Authenticated can delete own community_post_likes" on public.community_post_likes;

create policy "Tenant members can read community_post_likes"
  on public.community_post_likes
  for select
  to authenticated
  using (
    public.is_tenant_member(tenant_id)
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  );

create policy "Tenant members can create own community_post_likes"
  on public.community_post_likes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1
      from public.community_posts p
      where p.id = post_id
        and p.tenant_id = tenant_id
    )
  );

create policy "Users can delete own likes or managers can moderate"
  on public.community_post_likes
  for delete
  to authenticated
  using (
    (
      user_id = auth.uid()
      and public.is_tenant_member(tenant_id)
    )
    or public.is_tenant_content_manager(tenant_id, auth.uid())
  );

drop policy if exists "Admin can read community_post_reports" on public.community_post_reports;
drop policy if exists "Authenticated can create own community_post_reports" on public.community_post_reports;
drop policy if exists "Admin can update community_post_reports" on public.community_post_reports;
drop policy if exists "Admin can delete community_post_reports" on public.community_post_reports;

create policy "Tenant managers can read community_post_reports"
  on public.community_post_reports
  for select
  to authenticated
  using (public.is_tenant_content_manager(tenant_id, auth.uid()));

create policy "Tenant members can create own community_post_reports"
  on public.community_post_reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1
      from public.community_posts p
      where p.id = post_id
        and p.tenant_id = tenant_id
    )
  );

create policy "Tenant managers can update community_post_reports"
  on public.community_post_reports
  for update
  to authenticated
  using (public.is_tenant_content_manager(tenant_id, auth.uid()))
  with check (public.is_tenant_content_manager(tenant_id, auth.uid()));

create policy "Tenant managers can delete community_post_reports"
  on public.community_post_reports
  for delete
  to authenticated
  using (public.is_tenant_content_manager(tenant_id, auth.uid()));
