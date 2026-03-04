alter table if exists public.program_products
  add column if not exists thumbnail_urls jsonb not null default '[]'::jsonb,
  add column if not exists content_html text not null default '';

update public.program_products
set thumbnail_urls = '[]'::jsonb
where thumbnail_urls is null;

update public.program_products
set content_html = ''
where content_html is null;
