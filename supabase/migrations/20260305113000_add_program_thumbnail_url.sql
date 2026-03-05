alter table public.programs
add column if not exists thumbnail_url text not null default '';

update public.programs
set thumbnail_url = coalesce(nullif(thumbnail_url, ''), logo_url, '')
where thumbnail_url = '';
