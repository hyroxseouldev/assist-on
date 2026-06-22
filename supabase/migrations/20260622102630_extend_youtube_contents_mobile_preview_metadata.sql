alter table public.youtube_contents
add column if not exists mobile_visibility text,
add column if not exists preview_video_url text,
add column if not exists preview_video_mime_type text,
add column if not exists genre text,
add column if not exists tags text[];

alter table public.youtube_contents
alter column mobile_visibility set default 'public',
alter column genre set default '',
alter column tags set default '{}'::text[];

update public.youtube_contents
set
  mobile_visibility = case when is_published then 'public' else 'private' end,
  genre = coalesce(genre, ''),
  tags = coalesce(tags, '{}'::text[])
where mobile_visibility is null
  or mobile_visibility not in ('public', 'private')
  or genre is null
  or tags is null;

alter table public.youtube_contents
alter column mobile_visibility set not null,
alter column genre set not null,
alter column tags set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'youtube_contents_mobile_visibility_check'
  ) then
    alter table public.youtube_contents
    add constraint youtube_contents_mobile_visibility_check
    check (mobile_visibility in ('public', 'private'));
  end if;
end
$$;

create index if not exists idx_youtube_contents_mobile_public_order
on public.youtube_contents (tenant_id, mobile_visibility, display_order, created_at desc);

drop policy if exists "Anon can read published youtube contents" on public.youtube_contents;
drop policy if exists "Authenticated can read published or managed youtube contents" on public.youtube_contents;
drop policy if exists "Anon can read public mobile youtube contents" on public.youtube_contents;
drop policy if exists "Authenticated can read public mobile or managed youtube contents" on public.youtube_contents;

create policy "Anon can read public mobile youtube contents"
on public.youtube_contents
for select
to anon
using (mobile_visibility = 'public');

create policy "Authenticated can read public mobile or managed youtube contents"
on public.youtube_contents
for select
to authenticated
using (
  mobile_visibility = 'public'
  or public.is_tenant_content_manager(tenant_id)
);

grant select on public.youtube_contents to anon, authenticated;
grant insert, update, delete on public.youtube_contents to authenticated;

update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800),
  allowed_mime_types = (
    select array_agg(distinct mime order by mime)
    from unnest(
      coalesce(allowed_mime_types, '{}'::text[])
      || array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/webm'
      ]
    ) as m(mime)
  )
where id = 'content-media';
