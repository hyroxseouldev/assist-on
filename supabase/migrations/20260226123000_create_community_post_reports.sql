create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_post_reports_status_created_at
  on public.community_post_reports (status, created_at desc);

create index if not exists idx_community_post_reports_post_id
  on public.community_post_reports (post_id);

alter table public.community_post_reports enable row level security;

drop policy if exists "Authenticated can create own community_post_reports" on public.community_post_reports;
create policy "Authenticated can create own community_post_reports"
on public.community_post_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Admin can read community_post_reports" on public.community_post_reports;
create policy "Admin can read community_post_reports"
on public.community_post_reports
for select
to authenticated
using (is_admin(auth.uid()));

drop policy if exists "Admin can update community_post_reports" on public.community_post_reports;
create policy "Admin can update community_post_reports"
on public.community_post_reports
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "Admin can delete community_post_reports" on public.community_post_reports;
create policy "Admin can delete community_post_reports"
on public.community_post_reports
for delete
to authenticated
using (is_admin(auth.uid()));
