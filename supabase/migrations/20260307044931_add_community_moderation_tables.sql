-- Community moderation tables for App Review compliance

alter table public.community_post_reports
  add column if not exists reason text,
  add column if not exists detail text,
  add column if not exists status text;

update public.community_post_reports
set status = coalesce(nullif(status, ''), 'pending')
where status is null or status = '';

create table if not exists public.community_comment_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  detail text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (tenant_id, comment_id, reporter_id)
);

create index if not exists idx_community_comment_reports_tenant_comment
  on public.community_comment_reports (tenant_id, comment_id, created_at desc);

create table if not exists public.community_hidden_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, post_id)
);

create index if not exists idx_community_hidden_posts_tenant_user
  on public.community_hidden_posts (tenant_id, user_id, created_at desc);

create table if not exists public.community_user_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create index if not exists idx_community_user_blocks_tenant_blocker
  on public.community_user_blocks (tenant_id, blocker_id, created_at desc);

alter table public.community_comment_reports enable row level security;
alter table public.community_hidden_posts enable row level security;
alter table public.community_user_blocks enable row level security;

drop policy if exists "Tenant members can create own community_comment_reports" on public.community_comment_reports;
drop policy if exists "Tenant managers can read community_comment_reports" on public.community_comment_reports;

create policy "Tenant members can create own community_comment_reports"
  on public.community_comment_reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1
      from public.community_comments c
      where c.id = comment_id
        and c.tenant_id = tenant_id
    )
  );

create policy "Tenant managers can read community_comment_reports"
  on public.community_comment_reports
  for select
  to authenticated
  using (public.is_tenant_content_manager(tenant_id, auth.uid()));

drop policy if exists "Tenant members can create own hidden posts" on public.community_hidden_posts;
drop policy if exists "Users can read own hidden posts" on public.community_hidden_posts;

create policy "Tenant members can create own hidden posts"
  on public.community_hidden_posts
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

create policy "Users can read own hidden posts"
  on public.community_hidden_posts
  for select
  to authenticated
  using (user_id = auth.uid() and public.is_tenant_member(tenant_id));

drop policy if exists "Tenant members can create own user blocks" on public.community_user_blocks;
drop policy if exists "Users can read own user blocks" on public.community_user_blocks;

create policy "Tenant members can create own user blocks"
  on public.community_user_blocks
  for insert
  to authenticated
  with check (
    blocker_id = auth.uid()
    and public.is_tenant_member(tenant_id)
  );

create policy "Users can read own user blocks"
  on public.community_user_blocks
  for select
  to authenticated
  using (blocker_id = auth.uid() and public.is_tenant_member(tenant_id));
