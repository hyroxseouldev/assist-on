alter table public.notices
add column if not exists thumbnail_url text not null default '';
