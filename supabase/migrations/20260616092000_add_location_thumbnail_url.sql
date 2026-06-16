alter table public.locations
add column if not exists thumbnail_url text not null default '';

update public.locations
set thumbnail_url = coalesce(nullif(image_urls ->> 0, ''), '')
where trim(thumbnail_url) = '';
