create table if not exists public.youtube_contents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text not null default '',
  youtube_url text not null,
  youtube_video_id text not null,
  thumbnail_url text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youtube_contents_title_not_empty check (length(trim(title)) > 0),
  constraint youtube_contents_url_not_empty check (length(trim(youtube_url)) > 0),
  constraint youtube_contents_video_id_not_empty check (length(trim(youtube_video_id)) > 0)
);

create index if not exists idx_youtube_contents_public_order
on public.youtube_contents (tenant_id, is_published, display_order, created_at desc);

create index if not exists idx_youtube_contents_tenant_created
on public.youtube_contents (tenant_id, created_at desc);

create or replace function public.touch_youtube_contents_metadata()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();

  if new.is_published = true and new.published_at is null then
    new.published_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_youtube_contents_metadata on public.youtube_contents;
create trigger trg_youtube_contents_metadata
before insert or update on public.youtube_contents
for each row
execute function public.touch_youtube_contents_metadata();

alter table public.youtube_contents enable row level security;

drop policy if exists "Public can read published youtube contents" on public.youtube_contents;
create policy "Public can read published youtube contents"
on public.youtube_contents
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Tenant managers can manage youtube contents" on public.youtube_contents;
create policy "Tenant managers can manage youtube contents"
on public.youtube_contents
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

grant select on public.youtube_contents to anon, authenticated;
grant insert, update, delete on public.youtube_contents to authenticated;
