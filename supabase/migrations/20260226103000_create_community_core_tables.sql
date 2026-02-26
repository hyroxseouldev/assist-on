create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content_html text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content_html text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_posts_status_created_at
  on public.community_posts (status, created_at desc);

create index if not exists idx_community_comments_post_id_created_at
  on public.community_comments (post_id, created_at asc);

create index if not exists idx_community_post_likes_post_id
  on public.community_post_likes (post_id);

create or replace function public.touch_community_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_community_posts_updated_at on public.community_posts;
create trigger trg_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.touch_community_updated_at();

drop trigger if exists trg_community_comments_updated_at on public.community_comments;
create trigger trg_community_comments_updated_at
before update on public.community_comments
for each row
execute function public.touch_community_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comments enable row level security;

drop policy if exists "Authenticated can read published community_posts" on public.community_posts;
create policy "Authenticated can read published community_posts"
on public.community_posts
for select
to authenticated
using (
  status = 'published'
  or author_id = auth.uid()
  or is_admin(auth.uid())
);

drop policy if exists "Authenticated can create own community_posts" on public.community_posts;
create policy "Authenticated can create own community_posts"
on public.community_posts
for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "Author or admin can update community_posts" on public.community_posts;
create policy "Author or admin can update community_posts"
on public.community_posts
for update
to authenticated
using (author_id = auth.uid() or is_admin(auth.uid()))
with check (author_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists "Author or admin can delete community_posts" on public.community_posts;
create policy "Author or admin can delete community_posts"
on public.community_posts
for delete
to authenticated
using (author_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists "Authenticated can read community_post_likes" on public.community_post_likes;
create policy "Authenticated can read community_post_likes"
on public.community_post_likes
for select
to authenticated
using (true);

drop policy if exists "Authenticated can create own community_post_likes" on public.community_post_likes;
create policy "Authenticated can create own community_post_likes"
on public.community_post_likes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Authenticated can delete own community_post_likes" on public.community_post_likes;
create policy "Authenticated can delete own community_post_likes"
on public.community_post_likes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Authenticated can read published community_comments" on public.community_comments;
create policy "Authenticated can read published community_comments"
on public.community_comments
for select
to authenticated
using (
  status = 'published'
  or author_id = auth.uid()
  or is_admin(auth.uid())
);

drop policy if exists "Authenticated can create own community_comments" on public.community_comments;
create policy "Authenticated can create own community_comments"
on public.community_comments
for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "Author or admin can update community_comments" on public.community_comments;
create policy "Author or admin can update community_comments"
on public.community_comments
for update
to authenticated
using (author_id = auth.uid() or is_admin(auth.uid()))
with check (author_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists "Author or admin can delete community_comments" on public.community_comments;
create policy "Author or admin can delete community_comments"
on public.community_comments
for delete
to authenticated
using (author_id = auth.uid() or is_admin(auth.uid()));
