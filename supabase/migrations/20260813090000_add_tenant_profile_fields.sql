alter table if exists public.tenants
  add column if not exists banner_image_url text not null default '',
  add column if not exists instagram text not null default '',
  add column if not exists description text not null default '';
